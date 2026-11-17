"use strict";

/**
 * @module cli
 */

var nopt = require("nopt");
var Configuration = require("./configuration");
var path = require("path");
var glob = require("glob");
var urlUtil = require("url");
var readline = require("readline");
var util = require("util");
var url = require("url");
var meta = require("../package-metadata").readPackageSync();

var Hub = require("../hub");
var color = require("./color").codes;

var FeedbackLineReporter = require("./reporter/feedback-line");
var JUnitReporter = require("./reporter/junit");

var hubClient = require("../client");

var getLocalIP = require("../local-ip");

var YetiEventEmitter2 = require("../event-emitter");

var good = "✓";
var bad = "✗";

var processSetupComplete = false;

var parseArgv = exports.parseArgv = function (argv) {
    var knownOptions = {
        "self-url": url,
        "wd-url": url,
        "wd-host": String, // 0.2.x back-compat
        "wd-port": Number, // 0.2.x back-compat
        "browser": [String, Array],
        "output": ["junit", "feedback"],
        "server": Boolean,
        "version": Boolean,
        "loglevel": ["info", "debug"],
        "query": String,
        "debug": Boolean,
        "port": Number,
        "timeout": Number,
        "hub": url,
        "help" : Boolean
    }, shortHands = {
        "b": ["--browser"],
        "junit": ["--output", "junit"],
        "s": ["--server"],
        "p": ["--port"],
        "v": ["--loglevel", "info"],
        "vv": ["--loglevel", "debug"]
    },
    parsed,
    booleanParsed;

    parsed = nopt(knownOptions, shortHands, argv);

    // Workaround a nopt bug for `hub` option.
    // Normally we'd want `hub` to be first parsed
    // as a url, then fallback to Boolean.
    //
    // However, if we specify [url, Boolean] as
    // `hub`'s type, nopt will coerce hub aggressively
    // into a Boolean.
    //
    // https://github.com/isaacs/nopt/blob/19736d85ffd3f0eeffc0e8d2ca66c92d0825ebb7/lib/nopt.js#L276

    if (!("hub" in parsed)) {
        // If parsed.hub is undefined, either
        // hub was not specified or was not a URL.
        //
        // Make a second pass of nopt's cooked args.
        // Pass 0 to override the default 2 slice.
        booleanParsed = nopt({
            "hub": Boolean
        }, null, parsed.argv.cooked, 0);

        if ("hub" in booleanParsed) {
            parsed.hub = booleanParsed.hub;
        }
    }

    return parsed;
};

/**
 * The Yeti command-line interface.
 *
 * @class CLI
 * @constructor
 * @extends YetiEventEmitter2
 * @param {Object} config Configuration.
 * @param {Function} config.exitFn Handler when process exit is requested, 1-arity.
 * @param {ReadableStream} config.stdin  Readable stream for creating a readline interface.
 * @param {WritableStream} config.stdout Writable stream for creating a readline interface.
 * @param {WritableStream} config.stderr Writable stream for creating a readline interface.
 * @param {process} config.process Process object for setting up exception handlers.
 */
function CLI(config) {
    /**
     * Fires when the process should exit.
     *
     * @property exitFn
     * @type {Function}
     * @param {Number} Return code.
     */
    this.exitFn = config.exitFn;

    /**
     * For readline.
     *
     * @property stdin
     * @type {ReadableStream}
     */
    this.stdin = config.stdin;

    /**
     * For readline.
     *
     * @property stdout
     * @type {WritableStream}
     */
    this.stdout = config.stdout;

    /**
     * For readline.
     *
     * @property stderr
     * @type {WritableStream}
     */
    this.stderr = config.stderr;

    /**
     * For exception handler.
     *
     * @property process
     * @type {process}
     */
    this.process = config.process;

    this.rl = readline.createInterface(this.stdin, this.stderr);
}

util.inherits(CLI, YetiEventEmitter2);

/**
 * Fire the `exit` event with the given code.
 * @method exit
 * @param {Number} Return code.
 * @private
 */
CLI.prototype.exit = function (code) {
    this.exitFn(code);
};

/**
 * Fire the `error` event with the given arguments.
 * @method exit
 * @param {String|Object} Multiple arguments.
 * @private
 */
CLI.prototype.error = function () {
    var args = Array.prototype.slice.apply(arguments),
        formattedString = util.format.apply(util, args);
    this.stderr.write(formattedString + "\n", "utf8");
};


/**
 * Fire the `puts` event with the given arguments.
 * @method puts
 * @param {String|Object} Multiple arguments.
 * @private
 */
CLI.prototype.puts = function () {
    var args = Array.prototype.slice.apply(arguments),
        formattedString = util.format.apply(util, args);
    this.stdout.write(formattedString + "\n", "utf8");
};

/**
 * Call error with the given arguments, then call exit(1).
 * @method panic
 * @param {String|Object} Multiple arguments.
 * @private
 */
CLI.prototype.panic = function () {
    var args = Array.prototype.slice.apply(arguments);
    this.error.apply(this, args);
    this.exit(1);
};

CLI.prototype.setupExceptionHandler = function () {
    var self = this;

    if (processSetupComplete) {
        return;
    }

    self.process.on("uncaughtException", function (err) {
        var message;

        if ("string" !== typeof err && err.stack) {
            err = err.stack;
        }

        if (self.stderr.isTTY) {
            message = [
                color.red(bad + " Whoops!") + " " + err, "",
                "If you believe this is a bug in Yeti, please report it.",
                "    " + color.bold(meta.bugs.url),
                "    Yeti v" + meta.version,
                "    Node.js " + process.version
            ];
        } else {
            message = [
                "Yeti v" + meta.version + " " +
                    "(Node.js " + process.version +
                    ") Error: " + err,
                "Report this bug at " + meta.bugs.url
            ];
        }

        self.panic(message.join("\n"));
    });

    processSetupComplete = true;
};


/**
 * @method submitBatch
 * @param {Client} client Connected client.
 * @param {String} output Reporter output. "junit" selects the JUnitReporter,
 * all others FeedbackLineReporter.
 * @param {Object} options Options (see `Client.createBatch()`).
 * @param {Function} cb Completion callback.
 */
CLI.prototype.submitBatch = function submitBatch(client, output, options, cb) {
    var reporter, batch, reporterOptions;

    batch = client.createBatch(options);

    reporterOptions = {
        cli: this,
        batch: batch
    };

    if (output === "junit") {
        reporter = new JUnitReporter(reporterOptions);
    } else {
        reporter = new FeedbackLineReporter(reporterOptions);
    }

    batch.on("agentResult", reporter.handleAgentResult.bind(reporter));
    batch.on("agentScriptError", reporter.handleAgentScriptError.bind(reporter));
    batch.on("agentError", reporter.handleAgentError.bind(reporter));
    batch.on("agentComplete", reporter.handleAgentComplete.bind(reporter));
    batch.on("agentProgress", reporter.updateFeedbackLine.bind(reporter));
    batch.on("agentBeat", reporter.handleAgentBeat.bind(reporter));
    batch.on("dispatch", reporter.handleDispatch.bind(reporter));
    batch.on("complete", reporter.handleComplete.bind(reporter));
    batch.on("end", reporter.handleEnd.bind(reporter));
};


CLI.prototype.prepareBatch = function prepareBatch(config, cb) {
    var self = this,
        pattern = config.get("glob"),
        unit = "files";

    if (pattern && !config.get("files")) {
        glob(pattern, function (err, matches) {
            if (matches) {
                config.set("files", matches);

                if (matches.length === 1) {
                    unit = "file";
                }
                self.error("Found", matches.length, unit, "to test.");

                cb(config);
            } else {
                self.panic("Glob pattern", pattern, "matched zero files.");
            }
        });
    } else {
        cb(config);
    }
};

CLI.prototype.resolveFilesToBasedir = function resolveFilesToBasedir(config) {
    var files = config.get("files"),
        basedir = config.get("basedir"),
        cwd = process.cwd(),
        absoluteFiles,
        relativeFiles;

    absoluteFiles = files.map(function (file) {
        return path.resolve(cwd, file);
    });

    relativeFiles = absoluteFiles.map(function (file) {
        return path.relative(basedir, file);
    });

    config.debug("Resolved absoluteFiles:", absoluteFiles,
            "to relativeFiles:", relativeFiles);

    config.set("files", relativeFiles);
};

function lookupBrowserPart(knownNames, str) {
    var out = {
        type: false,
        match: false,
        dup: false
    };

    str = str.toLowerCase();

    Object.keys(knownNames).forEach(function (type) {
        knownNames[type].forEach(function (candidate) {
            if (candidate.toLowerCase().indexOf(str) === 0) {
                if (out.match) {
                    out.dup = true;
                } else {
                    if (candidate === "IE") {
                        candidate = "Internet Explorer";
                    }
                    out.match = candidate;
                    out.type = type;
                }
            }
        });
    });

    return out;
}

CLI.prototype.parseBrowsers = function parseBrowsers(browsers) {
    var self = this,
        knownNames = {
            "browserName": [
                "Chrome",
                "Firefox",
                "Safari",
                "IE", // expands to "Internet Explorer" in lookupBrowserPart
                "internetexplorer", // does not expand, for buggy Selenium Hubs
                "iPad", // Sauce
                "iPhone", // Sauce
                "Android",
                "Opera",
                "PhantomJS"
            ],
            "platform": [
                "Windows 2003", // Sauce
                "Windows 2008", // Sauce
                "Windows 2012", // Sauce
                "Mac 10.6", // Sauce
                "Mac 10.8", // Sauce
                "XP",
                "Mac",
                "Linux",
                "Vista"
            ]
        },
        requestedCapabilities = [];

    if (!browsers || !browsers.length) {
        return;
    }

    browsers.forEach(function (parts) {
        var capability = {};

        parts.split("/").forEach(function (part) {
            var lookup = lookupBrowserPart(knownNames, part),
                match = lookup.match;
            if (lookup.dup) {
                self.panic("Ambigious", lookup.type, part);
                return;
            } else if (lookup.match) {
                if (lookup.type === "platform") {
                    match = match.toUpperCase();
                } else {
                    match = match.toLowerCase();
                }
                capability[lookup.type] = match;
            } else if (part === "latest" || !isNaN(Number(part[0]))) {
                capability.version = part;
            }
        });
        if (Object.keys(capability)) {
            requestedCapabilities.push(capability);
        }
    });

    return requestedCapabilities;
};

CLI.prototype.getWebDriverConfigurationFromOptions = function (options) {
    var url = urlUtil.parse(options.get("wd-url") || ""),
        segments,
        user,
        pass;

    // wd-host, wd-port, wd-user, wd-pass are 0.2.x back-compat options

    if (!url.hostname) {
        url.hostname = options.get("wd-host");
    }
    if (!url.port) {
        url.port = options.get("wd-port");
    }
    if (url.auth) {
        segments = url.auth.split(":");
        user = segments[0];
        pass = segments[1];
    }
    if (!user) {
        user = options.get("wd-user");
    }
    if (!pass) {
        pass = options.get("wd-pass");
    }
    return {
        host: url.hostname,
        port: url.port,
        user: user,
        pass: pass
    };
};

CLI.prototype.createHub = function createHub(options) {
    return new Hub({
        loglevel: options.get("loglevel"),
        selfUrl: options.get("self-url"),
        webdriver: this.getWebDriverConfigurationFromOptions(options)
    });
};

CLI.prototype.runBatch = function runBatch(options) {

    // XXX put this after var
    this.resolveFilesToBasedir(options);

    var self = this,
        webdriver = self.getWebDriverConfigurationFromOptions(options),
        files = options.get("files"),
        browsers = options.get("browser"),
        port = options.get("port"),
        url = options.get("hub"),
        externalUrl = url,
        query = options.get("query"),
        debug = options.get("debug"),
        batchOptions = {
            basedir: options.get("basedir"),
            query: query,
            timeout: options.get("timeout"),
            tests: files
        };

    browsers = self.parseBrowsers(browsers);

    function prepareTests(client) {
        // In this case, nobody is connected yet.
        // If we connected to a server, we would list
        // the current agents.

        client.getAgents(function (err, agents) {
            if (err) {
                throw err;
            }

            agents.forEach(function (agent) {
                client.emit("agentConnect", agent);
            });

            if (agents.length === 0 && !browsers) {
                self.error("Waiting for agents to connect at " + externalUrl);
                if (externalUrl !== url) {
                    self.error("...also available locally at " + url);
                }

                self.rl.question("When ready, press Enter to begin testing.\n", function () {
                    self.rl.close();
                    self.stdin.destroy();
                    self.submitBatch(client, options.get("output"), batchOptions);
                });
            } else {
                if (browsers) {
                    self.error("Waiting for Hub to launch browsers...");
                    batchOptions.launchBrowsers = browsers;
                    batchOptions.webdriver = webdriver;
                }
                self.submitBatch(client, options.get("output"), batchOptions);
            }
        });

        client.on("agentConnect", function (agent) {
            self.error("  Agent connected:", agent);
        });

        client.on("agentDisconnect", function (agent) {
            self.error("  Agent disconnected:", agent);
        });
    }

    function createHub() {
        url = "http://localhost:" + port;
        externalUrl = "http://" + getLocalIP() + ":" + port;

        self.error("Creating a Hub. Open `yeti --server` in another " +
                "Terminal to reuse browsers for future batches.");

        var client,
            hub = self.createHub(options);

        hub.listen(port);

        hub.once("error", function (err) {
            throw err;
        });

        client = hubClient.createClient(url);

        client.connect(function (err) {
            if (err) {
                throw err;
            } else {
                self.error(""); // Newline.
                prepareTests(client);
            }
        });
    }

    function connectToURL(url) {
        var client = hubClient.createClient(url);
        client.connect(function (err) {
            if (err) {
                if (options.get("hub")) {
                    self.error("Unable to connect to Hub at", externalUrl,
                        "with", err.stack);
                }
                createHub();
            } else {
                prepareTests(client);
            }
        });
    }

    if (!url) {
        url = "http://localhost:" + port;
        externalUrl = "http://" + getLocalIP() + ":" + port;
    }

    connectToURL(url);
};

CLI.prototype.startServer = function startServer(options) {
    var self = this,
        port = options.get("port"),
        ipAddress = "127.0.0.1",
        hub = self.createHub(options);

    hub.once("error", function (err) {
        if (err.code === "EADDRINUSE") {
            self.panic("Unable to start the Hub because port %s is in use.", port);
        } else {
            throw err;
        }
    });

    hub.listen(port, function () {
        self.error("Yeti Hub started. LAN: http://%s:%s\n" +
           "                  Local: http://localhost:%s",
            getLocalIP(), port, port);
    });
};

CLI.prototype.route = function (argv) {
    var parsedArgs = parseArgv(argv),
        config = new Configuration(),
        usage = "usage: " + argv[1] +
                " [--version | -v] [--junit] [--server | -s] [--port=<n>]" +
                " [--hub=<url>] [--loglevel <level>] [--timeout <seconds>]" +
                " [--query <params>] [--basedir <directory>] [--browser <name[/version]>...]" +
                " [--wd-url <url>] [--self-url <url>]" +
                " [--help] [--] [<HTML file>...]";

    config.pipeLog(this);

    if (parsedArgs.loglevel) {
        this.printLogEventsForLevel("Yeti CLI", parsedArgs.loglevel);
    }

    // hub nopt type is url, with a Boolean fallback.
    // If we get true, a URL was provided but failed to parse.
    if (parsedArgs.hub === true) {
        this.error("Command-line Hub option does not appear to be a valid URL. Ignoring.");
        delete parsedArgs.hub;
    }

    config.import({
        // Defaults.
        port: 9000,
        host: "127.0.0.1",
        basedir: process.cwd()
    }).setFilename(".yeti.json").home().find().env("YETI_").import(parsedArgs);

    if (parsedArgs.argv.remain.length) {
        config.set("files", parsedArgs.argv.remain);
    }

    if (parsedArgs.version || parsedArgs.argv.original[0] === "-v") {
        this.puts(meta.version);
        this.exit(0);
    } else if (parsedArgs.help) {
        this.puts(usage);
        this.exit(0);
    } else if (config.get("files") || config.get("glob")) {
        if (config.get("server")) {
            this.error("Ignoring --server option.");
        }

        this.prepareBatch(config, this.runBatch.bind(this));
    } else if (config.get("server")) {
        this.startServer(config);
    } else {
        this.panic(
            usage + "\n" +
                "No files specified. " +
                "To launch the Yeti server, specify --server."
        );
    }
};

exports.CLI = CLI;

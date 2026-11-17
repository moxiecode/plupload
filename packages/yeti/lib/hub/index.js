"use strict";

var http = require("http");
var util = require("util");
var path = require("path");
var fs = require("graceful-fs");

var sockjs = require("sockjs");
var SimpleEvents = require("./view/public/events").SimpleEvents;

var onyx = require("onyx");
var urlParser = require("url");

var EchoEcho = require("echoecho").EchoEcho;

var EventEmitter2 = require("../event-emitter");

var EventYoshi = require("eventyoshi");

var AllAgents = require("./all-agents");
var AllBatches = require("./all-batches");

var HubListener = require("./http/listener");

var Blizzard = require("../blizzard");

var metadata = require("../package-metadata").readPackageSync();

var Router = require("./http/router");
var Layers = require("./http/layers");

// Middleware
var messenger = require("./http/middleware/messenger");

/**
 * The Hub is what brings Agents and Clients together.
 *
 * @class Hub
 * @constructor
 * @param {Object} [options] Configuration options.
 * @param {String} [options.loglevel] Loglevel. May be "debug", "info", or "silent" (default).
 * @param {Object} [options.webdriver] WebDriver configuration.
 * @param {String} [options.selfUrl] Base URL to this Hub to use during browser launching.
 * @param {Object} [options.webdriver.host] WebDriver host.
 * @param {Object} [options.webdriver.port] WebDriver port.
 */
var Hub = module.exports = function Hub(options) {
    EventEmitter2.call(this, {
        wildcard: true
    });

    if (!options) {
        options = {};
    }

    if (!options.loglevel) {
        options.loglevel = "silent";
    }

    if (!options.webdriver) {
        options.webdriver = {
            host: "localhost"
        };
    }

    if (process.env.YETI_HUB_DEBUG) {
        options.loglevel = "debug";
    }

    this.selfUrl = options.selfUrl;

    this._setupLogEvents(options.loglevel);

    // Setup the HTTP server, routing, and its Socket.io.
    this.router   = this._createRouter();
    this.server   = this._createServer(this.router);
    this.tower    = sockjs.createServer();
    this.blizzard = this._createBlizzard(this.server);
    this.tower.installHandlers(this.server, {
        prefix: "/tower",
        log: this._onTowerLog.bind(this)
    });

    this.sessions = new EventYoshi();

    this.echoecho = new EchoEcho({
        all: true
    });

    // Setup IO events.
    this.tower.on("connection", this._onTowerConnection.bind(this));

    this.allAgents = new AllAgents(this);
    this.allBatches = new AllBatches(this);

    this.allAgents.pipeLog(this);

    this._setupEvents();

    this.mountpoint = "/";

    this.webdriver = options.webdriver;
};

util.inherits(Hub, EventEmitter2);

Hub.prototype._onTowerLog = function (loglevel, message) {
    if (loglevel === "error") {
        loglevel = "warn";
    }
    this.emit("log." + loglevel + ".websocket", message);
};

Hub.prototype._setupLogEvents = function (loglevel) {
    if (loglevel === "silent") {
        return;
    }

    function createLogListener(ns) {
        return function () {
            console.log.apply(this, [
                "[" + ns + "]",
                "[" + this.event[1] + "]",
                "[" + (new Date()).toString() + "]",
            ].concat(Array.prototype.slice.call(arguments, 0)));
        };
    }

    this.on("log.warn.websocket", createLogListener("Yeti Hub WebSocket Warning"));

    if (loglevel === "debug") {
        this.on("log.debug", createLogListener("Yeti Hub"));
        this.on("log.debug.websocket", createLogListener("Yeti Hub WebSocket"));
    }

    if (loglevel === "debug" || loglevel === "info") {
        this.on("log.info", createLogListener("Yeti Hub"));
        this.on("log.info.websocket", createLogListener("Yeti Hub WebSocket"));
    }
};

Hub.prototype._setupEvents = function () {
    var self = this;

    self.on("batch", function (session, data, reply) {
        self.allBatches.createBatch(session, data, reply);
    });

    self.allAgents.on("agentConnect", self.sessions.emit.bind(self.sessions, "rpc.agentConnect"));
    self.allAgents.on("agentSeen", self.sessions.emit.bind(self.sessions, "rpc.agentSeen"));
    self.allAgents.on("agentDisconnect", self.sessions.emit.bind(self.sessions, "rpc.agentDisconnect"));

    self.sessions.on("request.batch", function (args, reply) {
        self.emit("batch", this.child, args[0], reply);
    });

    self.sessions.on("request.agents", function (args, reply) {
        var agentNames = [];
        self.allAgents.getAvailableAgents().forEach(function (agent) {
            agentNames.push(agent.getName());
        });
        reply(null, [agentNames]);
    });

    self.sessions.on("end", function () {
        self.sessions.remove(this.child);
    });

    self.blizzard.on("session", function (session) {
        self.emit("newClientSession", session);
        self.sessions.add(session);
    });

    self.server.on("error", function (err) {
        self.emit("error", err);
    });
};

Hub.prototype.getAgents = function () {
    return this.pool.getAgents();
};

/**
 * The Hub's router, an instance of `director.http.Router`.
 * @type {Router}
 * @property router
 */

/**
 * The Hub's server, created with Union, a subclass of Node's `HTTPServer`.
 * @type {HTTPServer}
 * @property server
 */

/**
 * The Hub's socket.io Manager.
 * @type {Manager}
 * @property io
 */

/**
 * Log messages. These are not typically exposed to the CLI.
 *
 * This is also a namespaced event: provide "debug", "info", or another loglevel
 * to target that loglevel. Default is "debug".
 *
 * @event log
 * @param {String} message Something to log.
 */

/**
 * Generate a unique identifier for Agents.
 *
 * Based on the current time and the PRNG.
 *
 * @method generateId
 * @protected
 * @return {String} id A unique identifier.
 */
Hub.prototype.generateId = function () {
    return String(Date.now()) +
        String(Math.random() * 0x100000 | 0);
};

/**
 * Handle a /batch/1/test style request.
 *
 * @method _handleTestRequest
 * @private
 */
Hub.prototype._handleTestRequest = function (server, agentId, batchId, path) {
    var batch = this.allBatches.getBatch(batchId),
        file = urlParser.parse(path).pathname;

    if (!batch) {
        server.res.message(404, "Batch not found.");
        return;
    }

    this.debug("_handleTestRequest: path =", path,
                "file =", file, "method =", server.req.method);

    if (this.echoecho.handle(path)) {
        this.debug("echoecho serving this request");
        this.echoecho.serve(server.req, server.res);
    } else if (server.req.method !== "GET" && server.req.method !== "HEAD") {
        server.res.message(405, "GET or HEAD method required.");
    } else {
        batch.handleFileRequest(server, agentId, file);
    }
};

Hub.prototype._onTowerConnection = function (socket) {
    var self = this,
        client;

    if (!socket) {
        // SockJS messed up?
        return;
    }

    client = new SimpleEvents(socket, function simpleEventLog() {
        var args = Array.prototype.slice.apply(arguments);
        args.unshift(["log", "debug"], "[SimpleEvents]");
        self.emit.apply(self, args);
    });

    client.on("register", function (message) {
        var id = message.agentId;

        if (!id || id === "undefined") {
            client.emit("error", "ID required");
        }

        self.allAgents.connectAgent(message, client);

        self.debug("SockJS register done");
        client.emit("ready", id);
    });

    client.emit("listening");
};

/**
 * Create the Hub's HTTP Server.
 *
 * @method _createServer
 * @private
 * @param {Router} router A configured Router.
 * @return {HTTPServer} An HTTP server.
 */
Hub.prototype._createServer = function (router) {
    var self = this,
        layers = new Layers();

    layers.use(messenger({}));
    layers.use(onyx.createProvider());
    layers.use(function yetiRouter(req, res, next) {
        var found = router.dispatch(req, res);
        if (!found) {
            next();
        }
    });
    layers.use(function yetiError(err, req, res, next) {
        if (err) {
            res.message(500);
            self.emit("log.info", "Unable to serve", req.url, err.stack);
        } else {
            next();
        }
    });
    layers.use(function lastResort(req, res) {
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.message(405, "GET or HEAD method required.");
        } else {
            res.message(404, "Unable to find what you're looking for.");
        }
    });

    return http.createServer(function yetiServer(req, res) {
        layers.handle(req, res);
    });
};

/**
 * Attach Blizzard on the Hub's HTTP server.
 *
 * @method _createSocketIO
 * @param {HTTPServer} server An HTTP server.
 * @return {Blizzard} An instance of Blizzard, waiting for connections.
 * @private
 */
Hub.prototype._createBlizzard = function (server) {
    var blizzard = new Blizzard();
    return blizzard.listen(server);
};

/**
 * Create a Director HTTP router for the Hub's HTTP server.
 *
 * @method _createRouter
 * @private
 * @return {Router} router Dispatchable router.
 */
Hub.prototype._createRouter = function () {
    var self = this,
        router = new Router();

    router.get(/\/(?:agent\/)?public\/(.*)/, function staticFiles(file) {
        self.emit(["log", "debug"], "Trying to send: " + __dirname + "/view/public/" + file);

        var writeHead = this.res.writeHead,
            dir = path.join(__dirname, "view/public"),
            files = [path.join(dir, file)],
            streamConfig = {};

        // Hack to clear Onyx headers,
        // since we're about to dynamically
        // call $yetify.
        this.res.writeHead = function (code, headers) {
            delete headers.Etag;
            delete headers["Last-Modified"];

            headers.Expires = headers.Date;

            writeHead.call(this, code, headers);
        };

        streamConfig.postpend = "";

        if (/\.js$/.test(file)) {
            // Keep SimpleEvents and SockJS as local variables.
            streamConfig.prepend = "/* Copyright Yahoo! Inc. " +
                "http://yuilibrary.com/license/ */\n" +
                "(function () {\n" +
                "var SockJS;\n";
            streamConfig.postpend = "}());";

            // Note: reverse loading order. files[0] == file
            files.unshift(path.join(dir, "events.js"));
            files.unshift(path.join(dir, "tempest.js"));
            files.unshift(path.join(__dirname, "../../dep", "yui-runtime.js"));
            files.unshift(path.join(__dirname, "../../dep", "sock.js"));
        }

        if ("inject.js" === file) {
            streamConfig.postpend += "if (window.$yetify) { $yetify(" + JSON.stringify({
                mountpoint: self.mountpoint || "/"
            }) + "); }";
        }

        this.res.streamFiles(files, streamConfig);
    });

    router.get(/\/ping\/((\w|.)*)/, function ping(file) {
        var opts = file.split('/'),
            action = opts[0],
            id = opts[1],
            agent = self.allAgents.getAgent(id);

        //Keeps it safe from outside execution
        if (agent && action === "unload") {
            agent.unload();
            this.res.writeHead(200, {
                "content-type": "text/plain"
            });
            this.res.end();
        } else {
            this.res.message(404, "Unable to find what you're looking for.");
        }
    });

    router.all(/\/agent\/(\d+)\/batch\/(\d+)\/test\/((\w|.)*)/, function testRequest(agentId, batchId, testId) {
        self._handleTestRequest(this, agentId, batchId, testId);
    });

    router.get(/\/agent\/(\d+)\/?$/, function capture() {
        var server = this;
        function onFile(err, html) {
            html = html.toString("utf8");
            html = html.replace(/\{\{script\}\}/,
                "<script>Yeti.capture(\"" + (self.mountpoint || '') + "\");</script>");
            html = html.replace(/\{\{version\}\}/, metadata.version);
            server.res.writeHead(200, {
                "content-type": "text/html"
            });
            server.res.end(html);
        }
        fs.readFile(__dirname + "/view/index.html", "utf8", onFile);
    });

    router.get(/\/$/, function home() {
        var id = self.generateId(),
            prefix = "/agent/";

        if (self.mountpoint !== "/") {
            // XXX Just fix this mountpoint stuff already.
            prefix = self.mountpoint + prefix;
        }

        this.res.writeHead(303, {
            "Content-Type": "text/plain",
            "Location": prefix + id
        });
        this.res.end("Connecting...");
    });

    return router;
};

/**
 * Starts the HTTP server.
 *
 * Pass through to HTTPServer.
 *
 * @method listen
 * @param {Number|String} port Port to listen to, or a UNIX socket.
 * @param {String} hostname Optional. Only accept connections to this address.
 * @param {Function} callback Optional. Function to call when the server is bound.
 */
Hub.prototype.listen = function () {
    var args = Array.prototype.slice.apply(arguments);
    this.server.listen.apply(this.server, args);
};

/**
 * Attach this Hub to another http.Server.
 *
 * @method attachServer
 * @param {http.Server} server Server to augment.
 * @param {String} route Optional. Route to attach the Hub, defaults to "/yeti".
 */
Hub.prototype.attachServer = function (augmentServer, route) {
    if ("string" !== typeof route) {
        route = "/yeti";
    }

    // FIXME: The HubListener is exposed for test/listen.js.
    // However, we're mostly using HubListener for its side effects.
    this.hubListener = new HubListener(this, augmentServer, route);

    // For client-side use later on.
    this.mountpoint = route;
};


Hub.prototype.getServer = function () {
    return this.server;
};

/**
 * Stops the HTTP server.
 *
 * Pass through to HTTPServer.
 *
 * @method close
 */
Hub.prototype.close = function () {
    this.server.close();
};

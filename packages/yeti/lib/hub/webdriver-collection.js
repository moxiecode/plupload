"use strict";

var async = require("async");
var wd = require("wd");
var urlUtil = require("url");
var periodicRegistry = require("./periodic-registry").getRegistry();
var getLocalIP = require("../local-ip");

function WebDriverCollection(options) {
    this.desiredCapabilities = options.browsers;
    this.hub = options.hub;
    this.batch = options.batch;

    if (
        "object" === typeof options.webdriver &&
        Object.keys(options.webdriver).length
    ) {
        this.remote = options.webdriver;
    } else {
        this.remote = options.hub.webdriver;
    }

    this.allAgents = options.hub.allAgents;
    this.browsers = {};
    this.desireds = {};
    var address = options.hub.server.address();

    this.id = this.getRandomId();

    this.url = options.hub.selfUrl || urlUtil.format({
        protocol: ("requestCert" in options.hub.server) ? "https" : "http",
        hostname: getLocalIP(),
        port: address.port
    });
}

WebDriverCollection.prototype.getRandomId = function () {
    return String(Date.now()) + String(Math.random() * 0x1000000 | 0);
};

WebDriverCollection.prototype.getAllAgentIds = function () {
    return Object.keys(this.browsers);
};

WebDriverCollection.prototype.getAllBrowsers = function () {
    var self = this;
    return self.getAllAgentIds().map(function (agentId) {
        return self.browsers[agentId];
    });
};

WebDriverCollection.prototype.quit = function (cb) {
    var self = this,
        queue = [];

    self.ended = true;

    periodicRegistry.remove("webdriver-ping-" + self.id);

    self.getAllAgentIds().forEach(function (agentId) {
        var browser = self.browsers[agentId];
        self.allAgents.removeAgent(agentId);
        queue.push(browser.quit.bind(browser));
    });

    self.browsers = {};
    self.desireds = {};

    async.parallel(queue, cb);
};

WebDriverCollection.prototype._ping = function () {
    // Keep the browsers alive by sending a noop command.
    this.getAllBrowsers().forEach(function (browser) {
        browser.title(function NOOP() {});
    });
};

WebDriverCollection.prototype.restart = function (agentId, cb) {
    var self = this,
        browser = self.browsers[agentId],
        desired = self.desireds[agentId],
        queue;

    if (!browser || !desired) { return false; }

    // Destroy the old agentId.
    delete self.browsers[agentId];
    delete self.desireds[agentId];
    self.batch.disallowAgentId(agentId);
    self.allAgents.removeAgent(agentId);

    // Quit the old browser and spin up a replacement.
    // Do this in series to free up the existing VM slot
    // before allocating another one.
    async.series([
        browser.quit.bind(browser),
        self._launch.bind(self, desired)
    ], cb);
};

WebDriverCollection.prototype._launch = function (desired, cb) {
    var self = this,
        complete = false,
        browser,
        remote = this.remote,
        url = self.url,
        id = this.getRandomId();

    url += "/agent/" + id;

    if (!remote.host) {
        cb(new Error("No WebDriver host was provided."));
        return;
    }

    browser = wd.remote(remote.host, remote.port, remote.user, remote.pass);

    function completer(err) {
        if (complete) {
            return;
        }
        complete = true;

        if (self.ended) {
            self.quit(function () {
                cb(new Error("Browser was quit during launching because all browsers are quitting"));
            });
            return;
        }

        if (err) {
            cb(err);
            return;
        }

        cb(err, browser);
    }

    function navigate() {
        var browserLoaded = false,
            agentLoaded = false;

        function check(err) {
            if (err) {
                completer(err);
            } else if (self.ended) {
                completer(null); // calls quit
            } else if (browserLoaded && agentLoaded) {
                completer(null);
            } else {
                return;
            }

        }

        function onGet(err) {
            browserLoaded = true;

            check(err);
        }

        function onAgent(agent) {
            if (agent.id === id) {
                agentLoaded = true;
                self.allAgents.removeListener("newAgent", onAgent);
                check();
            }
        }

        self.allAgents.on("newAgent", onAgent);
        self.batch.allowAgentId(id);
        browser.get(url, onGet);
    }

    // Sauce Labs: Set max duration to 2 hours, not 30 minutes.
    desired["max-duration"] = 7200; // seconds; 60 * 60 * 2

    // Sauce Labs: Avoid proxy for Internet Explorer, since it
    // conflicts with SockJS in weird ways.
    desired["avoid-proxy"] = true;

    browser.init(desired, function (err) {
        if (err) {
            err.message = "Failed to connect to WebDriver host at " +
                JSON.stringify(remote) + " because " + err.message;
            return cb(err);
        }

        self.browsers[id] = browser;
        self.desireds[id] = desired;

        if (self.ended) {
            self.quit(function () {
                cb(new Error("Browser was quit during launching because all browsers are quitting"));
            });
        } else {
            navigate();
        }

    });
};

WebDriverCollection.prototype.launch = function (cb) {
    var self = this,
        queue = [];

    self.desiredCapabilities.forEach(function (capability) {
        queue.push(self._launch.bind(self, capability));
    });

    periodicRegistry.add("webdriver-ping-" + self.id, self._ping.bind(self), 15000);

    async.parallel(queue, cb);
};

module.exports = WebDriverCollection;

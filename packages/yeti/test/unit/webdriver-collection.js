"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");
var mocks = require("mocks");
var util = require("util");

var EventYoshi = require("eventyoshi");
var EventEmitter2 = require("../../lib/event-emitter");

function createLocalIpMock(ipAddress) {
    return  function () {
        return ipAddress;
    };
}

function MockWebDriver(host, port, user, pass) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
    this.url = null;
    this.desiredCapabilities = null;
    EventEmitter2.call(this);
}

util.inherits(MockWebDriver, EventEmitter2);

MockWebDriver.prototype.quit = function (cb) {
    this.emit("quit");
    cb(null);
};

MockWebDriver.prototype.get = function (url, cb) {
    var self = this;
    self.emit("navigate", url);
    self.url = url;
    process.nextTick(cb.bind(self, null));
};

MockWebDriver.prototype.init = function (desiredCapabilities, cb) {
    this.emit("init", desiredCapabilities);
    process.nextTick(cb.bind(this, null));
};

function createWdMock(topic, cb) {
    return {
        remote: function (host, port, user, pass) {
            var mock = new MockWebDriver(host, port, user, pass);
            cb(mock);
            return mock;
        }
    };
}

function MockAllAgents() {
    this.agents = {};
    EventEmitter2.call(this);
}

util.inherits(MockAllAgents, EventEmitter2);

MockAllAgents.prototype.addAgent = function (agent) {
    var self = this;
    self.agents[agent.id] = agent;
    process.nextTick(function () {
        self.emit("newAgent", agent);
    });
};

MockAllAgents.prototype.removeAgent = function (agent) {
    delete this.agents[agent.id];
};

function createHubMock(topic) {
    return {
        server: {
            address: function () {
                return {
                    address: topic.ipAddress,
                    port: topic.port
                };
            }
        },
        webdriver: topic.wdOptions,
        allAgents: new MockAllAgents()
    };
}

function MockBatch() {
    this.agentWhitelist = {};
}

MockBatch.prototype.allowAgentId = function (agentId) {
    this.agentWhitelist[agentId] = 1;
};

MockBatch.prototype.disallowAgentId = function (agentId) {
    delete this.agentWhitelist[agentId];
};

function webDriverCollectionTopic(context) {
    context.topic = function () {
        var topic = {},
            modulePath = "../../lib/hub/webdriver-collection",
            WebDriverCollection;

        topic.wdYoshi = new EventYoshi();

        topic.ipAddress = "10.89.89.89";
        topic.wdOptions = {
            host: topic.ipAddress,
            port: 8090,
            user: "foo",
            pass: "bar"
        };
        topic.wdMock = createWdMock(topic, function yoshize(wdInstance) {
            topic.wdYoshi.add(wdInstance);
            wdInstance.once("quit", function () {
                topic.wdYoshi.remove(wdInstance);
            });
        });
        topic.localIpMock = createLocalIpMock(topic.ipAddress);
        topic.hubMock = createHubMock(topic);
        topic.batchMock = new MockBatch();

        mockery.enable({
            useCleanCache: true
        });

        mockery.registerAllowables([
            modulePath,
            "async",
            "./lib/async", // async dependency
            "url"
        ]);

        mockery.registerMock("wd", topic.wdMock);
        mockery.registerMock("../local-ip", topic.localIpMock);

        WebDriverCollection = require(modulePath);

        topic.desiredCapabilities = [
            {
                browserName: "chrome"
            }
        ];

        topic.managedBrowsers = new WebDriverCollection({
            hub: topic.hubMock,
            batch: topic.batchMock,
            browsers: topic.desiredCapabilities
        });

        return topic;
    };

    context.teardown = function (topic) {
        mockery.deregisterAll();
        mockery.disable();
    };

    return context;
}


vows.describe("WebDriver Collection").addBatch({
    "Given a WebDriverCollection": webDriverCollectionTopic({
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "when launched": {
            topic: function (lastTopic) {
                var vow = this,
                    topic = lastTopic;

                topic.events = {
                    navigate: []
                };

                topic.wdYoshi.on("navigate", function (url) {
                    topic.events.navigate.push(url);
                    topic.hubMock.allAgents.addAgent({
                        id: /[\d]+$/.exec(url)[0]
                    });
                });

                topic.wdYoshi.on("init", function (desired) {
                    topic.requestedCapabilities = desired;
                });

                topic.managedBrowsers.launch(function (err) {
                    vow.callback(err, topic);
                });
            },
            "is ok": function (topic) {
                if (topic instanceof Error) { throw topic; }
            },
            "navigation occurs": function (topic) {
                assert.ok(topic.wdYoshi.children.length > 0, "No browsers to navigate.");
                assert.lengthOf(topic.events.navigate, topic.wdYoshi.children.length);
            },
            "the requested capabilities contain the desiredCapabilities": function (topic) {
                var original = topic.desiredCapabilities,
                    actual = topic.requestedCapabilities;

                original.forEach(function (browser) {
                    Object.keys(browser).forEach(function (name) {
                        assert.include(actual, name);
                        assert.strictEqual(browser[name], actual[name]);
                    });
                });
            },
            "the requested capabilities contain Sauce Labs properties": function (topic) {
                var actual = topic.requestedCapabilities;

                assert.include(actual, "avoid-proxy");
                assert.include(actual, "max-duration");

                assert.strictEqual(actual["avoid-proxy"], true);
                assert.strictEqual(actual["max-duration"], 7200);
            },
            "getAllBrowsers returns an array of WebDriver browsers": function (topic) {
                var allBrowsers = topic.managedBrowsers.getAllBrowsers();
                assert.lengthOf(allBrowsers, topic.wdYoshi.children.length);
                allBrowsers.forEach(function (browser) {
                    assert.ok(browser.quit); // browser is quittable
                });
            },
            "getAllAgentIds returns an array of all Agent ids": function (topic) {
                assert.lengthOf(topic.managedBrowsers.getAllAgentIds(), topic.wdYoshi.children.length);
            },
            "and quit": {
                topic: function (lastTopic) {
                    var vow = this,
                        topic = lastTopic;

                    topic.managedBrowsers.quit(function (err) {
                        vow.callback(err, topic);
                    });
                },
                "is ok": function (topic) {
                    if (topic instanceof Error) { throw topic; }
                },
                "browsers are closed": function (topic) {
                    assert.lengthOf(topic.wdYoshi.children, 0);
                    assert.lengthOf(topic.managedBrowsers.getAllAgentIds(), 0);
                }
            }
        }
    })
}).addBatch({
    "Given a WebDriverCollection that ends during WebDriver init": webDriverCollectionTopic({
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "when launched": {
            topic: function (lastTopic) {
                var vow = this,
                    topic = lastTopic;

                topic.managedBrowsers.launch(function (err) {
                    vow.callback(null, {
                        err: err,
                        lastTopic: topic
                    });
                });

                topic.managedBrowsers.quit();
            },
            "is ok": function (topic) {
                if (topic instanceof Error) { throw topic; }
            },
            "launch callback contains error": function (topic) {
                assert.ok(topic.err instanceof Error);
            },
            "getAllBrowsers is empty": function (topic) {
                assert.lengthOf(topic.lastTopic.managedBrowsers.getAllBrowsers(), 0);
            },
            "getAllAgentIds is empty": function (topic) {
                assert.lengthOf(topic.lastTopic.managedBrowsers.getAllAgentIds(), 0);
            }
        }
    })
}).export(module);

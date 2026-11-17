"use strict";

var assert = require("assert");
var http = require("http");
var phantom = require("node-phantom");

var Hub = require("../../lib/hub");
var hubClient = require("../../lib/client");

var clientTopic = exports.clientTopic = function (pathname) {
    if (!pathname) {
        pathname = "/";
    }
    return function (hub) {
        var vow = this,
            server = (hub.hubListener && hub.hubListener.server) || hub.server,
            url = "http://localhost:" + server.address().port + pathname,
            client = hubClient.createClient(url);
        hub.on("newClientSession", function (session) {
            vow.callback(null, {
                session: session,
                pathname: pathname || "/",
                client: client,
                url: url
            });
        });
        client.connect(function (err) {
            if (err) {
                vow.callback(err);
            }
        });
    };
};

var clientContext = exports.clientContext = function (subContext) {
    var context = {
        topic: clientTopic(),
        "is ok": function (topic) {
            assert.ok(topic.client);
        }
    };

    // Mixin the provided context.
    Object.keys(subContext).forEach(function (key) {
        context[key] = subContext[key];
    });

    return {
        "A Yeti Hub": {
            topic: function () {
                var vow = this,
                    hub = new Hub();
                hub.listen(function () {
                    hub.removeListener("error", vow.callback);
                    vow.callback(null, hub);
                });
                hub.once("error", vow.callback);
            },
            teardown: function (hub) {
                hub.close();
            },
            "is ok": function (hub) {
                assert.ok(hub);
                assert.isNumber(hub.server.address().port);
            },
            "used by the Hub Client": context
        }
    };
};

var phantomTopic = function () {
    return function (lastTopic) {
        var vow = this,
            start = new Date(),
            timeout = setTimeout(function () {
                vow.callback(new Error("Unable to start phantomjs."));
                process.exit(1);
            }, 20000);
        phantom.create(function (err, browser) {
            clearTimeout(timeout);
            vow.callback(err, browser);
        });
    };
};

var phantomContext = exports.phantomContext = function (subContext) {
    var browserContext = {
        topic: phantomTopic(),
        teardown: function (browser) {
            browser.exit();
        },
        "is ok": function (browser) {
            assert.isFunction(browser.createPage);
        }
    };

    // Mixin the provided context.
    Object.keys(subContext).forEach(function (key) {
        browserContext[key] = subContext[key];
    });

    return browserContext;
};

exports.functionalContext = function (subContext) {
    return clientContext({
        "a browser": phantomContext(subContext)
    });
};

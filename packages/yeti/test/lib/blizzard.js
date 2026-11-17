"use strict";

var assert = require("assert");
var net = require("net");
var BlizzardSession = require("../../lib/blizzard/session");

exports.rpcTopic = function (options, cb) {
    var method = options.method,
        request = options.request || null,
        fixture = options.fixture || null;

    if (fixture) {
        cb = cb.bind(cb, fixture);
    }

    return function (lastTopic) {
        var vow = this;
        lastTopic.server.on("request." + method, cb);
        lastTopic.client.emit("rpc." + method, request, function (err, response) {
            vow.callback(err, {
                fixture: fixture,
                req: request,
                res: response
            });
        });
    };
};

exports.sessionContext = function (subContext) {
    var blizzardContext = {
        topic: function (server) {
            var vow = this,
                port = server.address().port,
                clientSession,
                clientSocket = net.connect(port, function () {
                    clientSession = new BlizzardSession(clientSocket, true);
                    clientSocket.removeListener("error", vow.callback);
                });

            server.on("connection", function onServerConnection(clientSocket) {
                var serverSession = new BlizzardSession(clientSocket, false);
                serverSession.once("ready", function () {
                    // The handshake completed.
                    server.removeListener("connection", onServerConnection);
                    vow.callback(null, {
                        client: clientSession,
                        server: serverSession
                    });
                });
            });

            clientSocket.once("error", vow.callback);
        },
        teardown: function (topic) {
            topic.client.end();
            topic.server.end();
        }
    };

    blizzardContext["is ok"] = function (topic) {
        assert.ok(topic.client);
        assert.ok(topic.server);
    };

    // Mixin the provided context.
    Object.keys(subContext).forEach(function (key) {
        blizzardContext[key] = subContext[key];
    });

    return {
        "A net socket": {
            topic: function () {
                var vow = this,
                    server = net.createServer();

                server.listen(function () {
                    vow.callback(null, server);
                });
            },
            "is connected": function (server) {
                assert.isNumber(server.address().port);
            },
            "used by Blizzard": blizzardContext
        }
    };
};

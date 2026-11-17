"use strict";

var assert = require("assert");
var http = require("http");

var Blizzard = require("../../lib/blizzard");

exports.sessionContext = function (subContext) {
    var blizzardContext = {
        topic: function (server) {
            var vow = this,
                port = server.address().port,
                serverBlizzard = new Blizzard(),
                clientBlizzard = new Blizzard(),
                clientBlizzardSession;

            serverBlizzard.listen(server);

            clientBlizzard.connect("http://127.0.0.1:" + port, function (err, newSession) {
                clientBlizzardSession = newSession;
            });

            serverBlizzard.once("session", function onSession(serverBlizzardSession) {
                // The handshake completed.
                serverBlizzard.removeListener("session", onSession);
                vow.callback(null, {
                    client: clientBlizzardSession,
                    server: serverBlizzardSession
                });
            });
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
        "A HTTP server": {
            topic: function () {
                var vow = this,
                    server = http.createServer();

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

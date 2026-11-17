"use strict";

var vows = require("vows");
var assert = require("assert");

var http = require("http");

var yeti = require("../../lib/yeti");

function request(path) {
    return function (hub, server) {
        var vow = this;
        http.get({
            host: "localhost",
            port: server.address().port,
            path: path
        }, function (res) {
            var data = "";
            res.setEncoding("utf8");
            res.on("data", function (chunk) {
                data = data + chunk;
            });
            res.on("error", vow.callback);
            res.on("end", function () {
                vow.callback(null, data);
            });
        });
    };
}

vows.describe("Yeti Listen").addBatch({
    "A HTTP server with a route": {
        topic: function () {
            var vow = this,
                server = http.createServer(function (req, res) {
                    res.writeHead(200, {
                        "Content-Type": "text/plain"
                    });
                    res.end("Dogcow!");
                });

            server.on("upgrade", function (req, socket, head) {
                socket.write("HTTP/1.1 101 Welcome to TestSocket\r\n" +
                    "Connection: Upgrade\r\n" +
                    "Upgrade: TestSocket\r\n" +
                    "\r\n\r\n" +
                    "dogcow");
                socket.end();
            });

            server.listen(function () {
                vow.callback(null, server);
            });
        },
        teardown: function (server) {
            server.close();
        },
        "is connected": function (topic) {
            assert.ok(topic.address().port);
        },
        "is hooked into a Yeti Hub": {
            topic: function (server) {
                var vow = this,
                    hub = yeti.createHub();
                hub.attachServer(server, "/yeti");
                return hub;
            },
            "is connected": function (topic) {
                assert.ok(topic);
            },
            "when /yeti/public/inject.js is requested": {
                topic: request("/yeti/public/inject.js"),
                "the script is correct": function (topic) {
                    assert.ok(topic !== "Dogcow!");
                }
            },
            "when /foo is requested": {
                topic: request("/foo"),
                "the parent HTTP server response is correct": function (topic) {
                    assert.strictEqual(topic, "Dogcow!");
                }
            },
            "when /ping/unload/key is requested": {
                topic: request("/yeti/ping/unload/key"),
                "the parent HTTP server response is correct": function (topic) {
                    assert.strictEqual("Not Found\nUnable to find what you're looking for.", topic);
                    assert.ok(topic !== "Dogcow!");
                }
            },
            "and connected from a Yeti Client": {
                topic: function (hub) {
                    var vow = this,
                        port = hub.hubListener.server.address().port,
                        url = "http://localhost:" + port,
                        client = yeti.createClient(url);

                    client.connect(function (err) {
                        vow.callback(err, client);
                    });
                },
                "connects successfully": function (client) {
                    assert.ok(client);
                }
            },
            "when making a non-Yeti HTTP Upgrade request": {
                topic: function (hub) {
                    var vow = this,
                        port = hub.hubListener.server.address().port,
                        req = http.request({
                            host: "localhost",
                            port: port,
                            headers: {
                                "Connection": "Upgrade",
                                "Upgrade": "TestSocket"
                            }
                        });

                    req.end();

                    req.on("upgrade", function (res, socket, head) {
                        vow.callback(null, {
                            res: res,
                            socket: socket,
                            head: head
                        });
                    });
                },
                "the headers are correct": function (topic) {
                    assert.strictEqual(topic.res.headers.connection, "Upgrade");
                    assert.strictEqual(topic.res.headers.upgrade, "TestSocket");
                },
                "the socket is valid": function (topic) {
                    assert.isFunction(topic.socket.write);
                },
                "the head is correct": function (topic) {
                    assert.strictEqual(topic.head.toString("utf8"), "\r\ndogcow");
                }
            }
        }
    }
}).export(module);

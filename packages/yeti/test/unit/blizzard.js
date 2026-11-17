"use strict";

var vows = require("vows");
var assert = require("assert");

var blizzard = require("../lib/blizzard");
var blizzardHTTP = require("../lib/blizzard-http");

var BlizzardSession = require("../../lib/blizzard/session");
var BlizzardNamespace = require("../../lib/blizzard/namespace");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

function blizzardEventTests(ns) {
    var rpcPrefix = "rpc.",
        parent = BlizzardSession;

    if (ns) {
        rpcPrefix += ns + ".";
        parent = BlizzardNamespace;
    }

    return {
        "with a simple echo event": {
            topic: blizzard.rpcTopic({
                method: "echo",
                request: "foo"
            }, function (params, reply) {
                reply(null, params[0]);
            }),
            "the response should be the same as the request": function (topic) {
                assert.strictEqual(topic.req, topic.res);
            }
        },
        "with an event that responds with binary data": {
            topic: blizzard.rpcTopic({
                method: "binary",
                request: "bar",
                fixture: new Buffer(7068)
            }, function (fixture, params, reply) {
                var err = null;
                if (params[0] !== "bar") { // the request
                    err = new Error("Bad request, expected bar, got: " + params[0]);
                }
                reply(err, fixture);
            }),
            "the response should be a Buffer": function (topic) {
                assert.ok(Buffer.isBuffer(topic.res));
            },
            "the response should be the correct length": function (topic) {
                assert.strictEqual(topic.res.length, topic.fixture.length);
            },
            "the response should be equal to the fixture": function (topic) {
                assert.deepEqual(topic.res, topic.fixture);
            }
        },
        "with events from the incomingBridge API": {
            topic: function (lastTopic) {
                var vow = this,
                    context = {},
                    ee = new EventEmitter2();

                // Note: the reply callback is no longer passed
                // to event bridges with the incomingBridge API.

                ee.once("bridge1", function (first, second) {
                    vow.callback(null, {
                        context: context,
                        event: this.event,
                        res: first,
                        reply: second // should be undefined
                    });
                });
                lastTopic.server.incomingBridge(ee, "bridge1");
                lastTopic.client.emit("rpc.bridge1", "quux", function () {
                    // no-op callback, used to indicate that a reply
                    // is requested. We want to test that the reply
                    // callback, which normally is presented to request.*
                    // events, is not passed when bridged.
                    throw new Error("Unexpected reply.");
                });
            },
            "the response is correct": function (topic) {
                assert.strictEqual(topic.event, "bridge1");
                assert.strictEqual(topic.res, "quux");
            },
            "only one argument was given to the bridged event": function (topic) {
                assert.isUndefined(topic.reply);
            }
        },
        "with events sent by the outgoingBridge API": {
            topic: function (lastTopic) {
                var vow = this,
                    context = {},
                    ee = new EventEmitter2();
                lastTopic.server.on("request.bridge2", function (params, reply) {
                    reply(null, params[0]); // data
                });
                lastTopic.client.outgoingBridge(ee, "bridge2");
                ee.emit("bridge2", "dogcow", function (err, res) {
                    vow.callback(err, {
                        event: this.event,
                        res: res
                    });
                });
            },
            "the response is correct": function (topic) {
                assert.strictEqual(topic.event, rpcPrefix + "bridge2");
                assert.strictEqual(topic.res, "dogcow");
            }
        }
    };
}

function batch(testHelper) {
    var ns = "ns1",
        subContext = blizzardEventTests(),
        namespaceContext = blizzardEventTests(ns);

    // Everything that BlizzardSession can do,
    // BlizzardNamespace should do too.
    // Run all the session tests aganist BlizzardNamespace.

    namespaceContext.topic = function (lastTopic) {
        return {
            server: lastTopic.server.createNamespace(ns),
            client: lastTopic.client.createNamespace(ns)
        };
    };

    subContext["in a namespace"] = namespaceContext;

    return testHelper.sessionContext(subContext);
}

vows.describe("Blizzard")
    .addBatch(batch(blizzard))
    .addBatch(batch(blizzardHTTP))
    .export(module);

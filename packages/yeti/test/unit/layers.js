"use strict";

var vows = require("vows");
var assert = require("assert");

var Layers = require("../../lib/hub/http/layers");

vows.describe("Layers").addBatch({
    "Given Layers that will error when calling handle": {
        topic: function () {
            var topic = {};
            topic.used = [
                function layerA(req, res, nextLayer) {
                    topic.a_args = [req, res, nextLayer];
                    topic.a = true;
                    topic.first = true;
                    nextLayer();
                },
                function layerB(req, res, nextLayer) {
                    topic.b_args = [req, res, nextLayer];
                    topic.a_req = req;
                    topic.a = false;
                    topic.b = true;
                    topic.first = false;
                    nextLayer();
                },
                function layerFirstErrorHandler(err, req, res, nextLayer) {
                    topic.first_err_called = true;
                    nextLayer();
                },
                function layerC(req, res, nextLayer) {
                    topic.c_args = [req, res, nextLayer];
                    topic.c = true;
                    throw new Error("Failure.");
                },
                function layerErrorHandler(err, req, res, nextLayer) {
                    topic.err_args = [err, req, res, nextLayer];
                    topic.c = false;
                    if (err) {
                        topic.err = true;
                    }
                }
            ];

            topic.layers = new Layers();

            topic.used.forEach(function (fn) {
                topic.layers.use(fn);
            });

            topic.layers.handle("FIXTURE_REQ", "FIXTURE_RES");

            return topic;
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "layers ran in order": function (topic) {
            assert.strictEqual(topic.b, true);
            assert.strictEqual(topic.a, false);
            assert.strictEqual(topic.first, false);
            assert.strictEqual(topic.c, false);
        },
        "error was handled by error handling middleware": function (topic) {
            assert.strictEqual(topic.err, true);
        },
        "normal middleware recieved correct arguments": function (topic) {
            assert.strictEqual(topic.a_args[0], "FIXTURE_REQ");
            assert.strictEqual(topic.b_args[0], "FIXTURE_REQ");
            assert.strictEqual(topic.c_args[0], "FIXTURE_REQ");
            assert.strictEqual(topic.a_args[1], "FIXTURE_RES");
            assert.strictEqual(topic.b_args[1], "FIXTURE_RES");
            assert.strictEqual(topic.c_args[1], "FIXTURE_RES");
            assert.isFunction(topic.a_args[2]);
            assert.isFunction(topic.b_args[2]);
            assert.isFunction(topic.c_args[2]);
        },
        "error handling middleware recieved correct arguments": function (topic) {
            assert(topic.err_args[0] instanceof Error, "error handling middleware did not recieve Error object");
            assert.strictEqual(topic.err_args[1], "FIXTURE_REQ");
            assert.strictEqual(topic.err_args[2], "FIXTURE_RES");
            assert.isFunction(topic.err_args[3]);
        },
        "error handling middleware that did not handle an error was skipped": function (topic) {
            assert.isUndefined(topic.first_err_called);
        }
    },
    "Given Layers that will not error when calling handle": {
        topic: function () {
            var topic = {};
            topic.used = [
                function layerA(req, res, nextLayer) {
                    topic.a_args = [req, res, nextLayer];
                    topic.a = true;
                    topic.first = true;
                    nextLayer();
                },
                function layerFirstErrorHandler(err, req, res, nextLayer) {
                    topic.first_err_called = true;
                    nextLayer();
                },
                function layerB(req, res, nextLayer) {
                    topic.b_args = [req, res, nextLayer];
                    topic.a_req = req;
                    topic.a = false;
                    topic.b = true;
                    topic.first = false;
                    nextLayer();
                }
            ];

            topic.layers = new Layers();

            topic.used.forEach(function (fn) {
                topic.layers.use(fn);
            });

            topic.layers.handle("FIXTURE_REQ", "FIXTURE_RES");

            return topic;
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "layers ran in order": function (topic) {
            assert.strictEqual(topic.b, true);
            assert.strictEqual(topic.a, false);
            assert.strictEqual(topic.first, false);
        },
        "error handling middlware did not run": function (topic) {
            assert.isUndefined(topic.first_err_called);
        }
    }
}).export(module);

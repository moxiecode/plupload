"use strict";

var http = require("http");
var vows = require("vows");
var assert = require("assert");

var Hub = require("../../lib/hub");

vows.describe("Yeti Hub HTTP errors").addBatch({
    "Hub setup and connection": {
        topic: function () {
            var vow = this,
                hub = new Hub();
            hub.listen(function () {
                vow.callback(null, hub);
            });
        },
        teardown: function (hub) {
            hub.close();
        },
        "when a non-GET or HEAD request is used" : {
            topic : function (hub) {
                var vow = this,
                    address = hub.server.address(),
                    req = http.request({
                        host: address.address,
                        port: address.port,
                        method: "PUT"
                    });
                req.on("response", function (res) {
                    res.setEncoding("utf8");
                    res.on("data", function (chunk) {
                        vow.callback(null, {
                            body: chunk,
                            status: res.statusCode,
                            headers: res.headers
                        });
                    });
                });
                req.end();
            },
            "should return a 405 error": function (topic) {
                assert.equal(topic.status, 405);
            },
            "should return the proper error message": function (topic) {
                assert.equal(topic.body, "Method Not Allowed\n" +
                                         "GET or HEAD method required.");
            }
        },
        "when the desired route is not found": {
            topic: function (hub) {
                var vow = this,
                    address = hub.server.address(),
                    req = http.request({
                        host: address.address,
                        port: address.port,
                        path: "/foobar",
                        method: "GET"
                    });
                req.on("response", function (res) {
                    res.setEncoding("utf8");
                    res.on("data", function (chunk) {
                        vow.callback(null, {
                            body: chunk,
                            status: res.statusCode,
                            headers: res.headers
                        });
                    });
                });
                req.end();
            },
            "should return a 404 error": function (topic) {
                assert.equal(topic.status, 404);
            },
            "should return the proper error message": function (topic) {
                assert.equal(topic.body, "Not Found\n" +
                                         "Unable to find what you're looking for.");
            }
        },
        "when a HEAD request is not found": {
            topic: function (hub) {
                var vow = this,
                    address = hub.server.address(),
                    req = http.request({
                        host: address.address,
                        port: address.port,
                        path: "/foobar",
                        method: "HEAD"
                    });
                req.on("response", function (res) {
                    vow.callback(null, {
                        status: res.statusCode,
                        headers: res.headers
                    });
                });
                req.end();
            },
            "should return a 404 error": function (topic) {
                assert.equal(topic.status, 404);
            }
        }
    }
}).export(module);

"use strict";

var vows = require("vows");
var assert = require("assert");

var TestServer = require("../../lib/hub/http/test-server");

var PAYLOAD = "<script src=\"foo.js\"></script>";

var fs = require("fs");

function reduceToPairs(files) {
    var needles = {
            "before": 1,
            "after": 2
        },
        matches = {};

    // Find pairs of fixtures:
    //  foo.before.html
    //  foo.after.html
    files.forEach(function (file) {
        var res = /(.*)\.(before|after)\.html$/.exec(file),
            name,
            needle;

        if (res === null) {
            return;
        }

        name = res[1];
        needle = res[2];

        if (!(name in matches)) {
            matches[name] = 0;
        }

        matches[name] += needles[needle];
    });

    return Object.keys(matches).filter(function (name) {
        // Does this match have a before and after?
        return matches[name] === 3;
    }).map(function (name) {
        // Order is important: before, after.
        return Object.keys(needles).map(function (needle) {
            return [name, needle, "html"].join(".");
        });
    });
}

function createInjectorTests() {
    var dir = __dirname + "/fixture/inject",
        files = fs.readdirSync(dir),
        pairs = reduceToPairs(files),
        context = {};

    pairs.forEach(function (pair) {
        var before = pair[0],
            after = pair[1];
        context["when injecting into " + before] = {
            topic: function (ts) {
                var vow = this;
                function onFixtureRead(expected, err, beforeBuffer) {
                    if (err) {
                        return vow.callback(err);
                    }

                    var actual = ts.inject(beforeBuffer).toString("utf8");

                    // Remove the newline before EOF, if present.
                    actual = actual.replace(/\n$/, "");
                    expected = expected.replace(/\n$/, "");

                    vow.callback(err, {
                        actual: actual,
                        expected: expected
                    });
                }
                fs.readFile([dir, after].join("/"), "utf8", function (err, expected) {
                    if (err) {
                        return vow.callback(err);
                    }

                    fs.readFile([dir, before].join("/"), onFixtureRead.bind(null, expected));
                });
            },
            "the injection is correct": function (topic) {
                assert.strictEqual(topic.expected, topic.actual);
            }
        };
    });

    return context;
}

vows.describe("HTML Injector").addBatch({
    "A TestServer": {
        topic: function () {
            return new TestServer(PAYLOAD);
        },
        "is ok": function (ts) {
            assert.isFunction(ts.inject);
        },
        "in use": createInjectorTests()
    }
}).export(module);

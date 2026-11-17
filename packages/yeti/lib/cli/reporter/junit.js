"use strict";

/**
 * @module reporter-junit
 */

var util = require("util");

var Reporter = require("./reporter");

var ENTITIES = {
    "&amp;": /&/g,
    "&quot;": /"/g,
    "&apos;": /'/g,
    "&gt;": />/g,
    "&lt;": /</g
};

/**
 * @class JUnitReporter
 * @constructor
 * @extends Reporter
 */
function JUnitReporter(options) {
    Reporter.call(this, options);

    this.complete = false;

    this.hasFailures = false;

    this.putsPreamble();
}

util.inherits(JUnitReporter, Reporter);

JUnitReporter.prototype.puts = function () {
    var args = Array.prototype.slice.apply(arguments),
        finalArgs = [];

    finalArgs.push(args.shift());

    args = args.map(function encode(arg) {
        if (typeof arg === "string") {
            Object.keys(ENTITIES).forEach(function (replacement) {
                arg = arg.replace(ENTITIES[replacement], replacement);
            });
        }

        return arg;
    });

    this.cli.puts.apply(this.cli, finalArgs.concat(args));
};

JUnitReporter.prototype.putsPreamble = function () {
    this.cli.puts('<?xml version="1.0" encoding="UTF-8"?>');
    this.cli.puts('<testsuites>');
};

// Convert milliseconds to seconds.
function getTime(ms) {
    ms = Number(ms);

    if (isNaN(ms)) {
        return 0;
    }

    return ms / 1000;
}

JUnitReporter.prototype.putsSuiteDetails = function (result) {
    var self = this,
        lastSuite,
        k,
        k1,
        suite,
        test;

    function reportTestError(test) {
        var msg, m, fail;

        if (!test.name) {
            // Code coverage result.
            return;
        }

        fail = "fail" === test.result;

        self.puts('<testcase name="%s" time="%s"%s>',
            suite.name + ": " + test.name,
            getTime(test.duration),
            fail ? "" : "/"
        );

        if (fail) {
            self.hasFailures = true;
            msg = test.message.split("\n");
            self.puts('<failure message="%s">', msg.shift());
            self.puts('%s', msg.join("\n")); // Escape second argument.
            self.puts('</failure>');
            self.puts('</testcase>');
        }
    }

    function hasResults(test) {
        return (
            ("passed" in test) && ("failed" in test) && ("type" in test)
        );
    }

    function walk(o) {
        var i;
        for (i in o) {
            if ("object" === typeof o[i]) {
                if (hasResults(o[i])) {
                    walk(o[i]);
                } else {
                    reportTestError(o[i]);
                }
            }
        }
    }

    for (k in result) {
        suite = result[k];
        if (suite && "object" === typeof suite) {
            for (k1 in suite) {
                test = suite[k1];
                if ("object" === typeof test) {
                    if (hasResults(test)) {
                        walk(test);
                    } else {
                        reportTestError(test);
                    }
                }
            }
        }
    }
};

JUnitReporter.prototype.handleAgentResult = function (agent, details) {
    function encode(str) {
        // Jenkins' JUnit parser considers "."
        // to be separator marks. Replace them
        // with underscores.
        return str.replace(/\./g, "_");
    }

    if (!details.name) {
        details.name = details.url;
    }

    this.puts('<testsuite name="%s" failures="%s" total="%s" time="%s">',
        encode(agent) + "." + encode(details.name),
        details.failed,
        details.passed + details.failed,
        getTime(details.duration)
    );

    this.putsSuiteDetails(details);

    this.puts('</testsuite>');
};

JUnitReporter.prototype.handleAgentScriptError = function (agent, details) {
    this.puts('<testsuite name="%s" failures="1" total="1">', agent + " " + details.url);
    this.puts('<testcase name="Uncaught Exception" time="0">');
    this.puts('<failure message="%s">', details.message);
    this.puts(' Line: %s', details.line);
    this.puts('</failure>');
    this.puts('</testcase>');
    this.puts('</testsuite>');
};

JUnitReporter.prototype.handleAgentError = function (agent, details) {
    this.hasFailures = true;
    this.puts('<testsuite name="%s" failures="1" total="1">', agent);
    this.puts('<failure message="%s"/>', details.message);
    this.puts('</testsuite>');
};

JUnitReporter.prototype.handleComplete = function () {
    this.puts('</testsuites>');
    this.complete = true;
};

JUnitReporter.prototype.handleEnd = function () {
    if (!this.complete) { this.handleComplete(); }
    this.cli.exit(this.hasFailures ? 1 : 0);
};

module.exports = JUnitReporter;

"use strict";

/**
 * @module reporter-cli
 */

var util = require("util");

var Reporter = require("./reporter");

var color = require("../color").codes;

var ARROW = "►";
var GOOD = "✓";
var BAD = "✗";

/**
 * @class FeedbackLineReporter
 * @constructor
 * @extends Reporter
 */
function FeedbackLineReporter(options) {
    Reporter.call(this, options);

    this.batchDetails = {
        passed: 0,
        failed: 0,
        currentIndex: 0,
        coverage: [],
        calledLines: 0,
        coveredLines: 0,
        total: this.batch.tests.length
    };

    this.eta = "";

    this.beats = 0;
    this.spinIndex = 0;

    this.cli.rl.setPrompt("", 0);

    this.timeStart = new Date();

    this.feedbackLineDisplayed = false;
}

util.inherits(FeedbackLineReporter, Reporter);

/**
 * @method putsVerboseResult
 * @param {object} result Test result.
 * @private
 */
FeedbackLineReporter.prototype.putsVerboseResult = function (result) {
    var self = this,
        lastSuite,
        k,
        k1,
        suite,
        test;

    function reportTestError(test) {
        var msg, m;

        if ("fail" === test.result) {
            if (!lastSuite || lastSuite !== suite.name) {
                self.puts("   in", color.bold(suite.name));
                lastSuite = suite.name;
            }
            msg = test.message.split("\n");
            self.puts("    ", color.bold(color.red(test.name)) + ":", msg[0]);
            for (m = 1; m < msg.length; m = m + 1) {
                self.puts("       " + msg[m]);
            }
        }
    }

    function hasResults(o) {
        return (("passed" in test) && ("failed" in test) && ("type" in test));
    }

    function walk(o) {
        var i;
        for (i in o) {
            if (hasResults(o[i])) {
                reportTestError(o[i]);
            } else {
                walk(o[i]);
            }
        }
    }

    for (k in result) {
        suite = result[k];
        if (suite && "object" === typeof suite) {
            if (suite.failed) {
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
    }

    self.puts("");
};

FeedbackLineReporter.prototype.puts = function () {
    if (this.feedbackLineDisplayed) {
        this.clearLine();
        this.feedbackLineDisplayed = false;
    }

    this.cli.puts.apply(this.cli, Array.prototype.slice.call(arguments));
};

/**
 * @method determineCoverageProgress
 * @private
 */
FeedbackLineReporter.prototype.determineCoverageProgress = function () {
    var self = this,
        report = "",
        percent;

    self.batchDetails.coverage.forEach(function (result) {
        Object.keys(result).forEach(function (file) {
            var data = result[file];
            self.batchDetails.calledLines += data.calledLines;
            self.batchDetails.coveredLines += data.coveredLines;
        });
    });

    if (self.batchDetails.calledLines > 0) {
        percent = self.batchDetails.calledLines / self.batchDetails.coveredLines * 100;
        report = percent.toFixed(0) + "% line coverage ";
    }

    return report;
};

FeedbackLineReporter.prototype.clearLine = function () {
    // If the output of self.rl is NOT a TTY,
    // a bug in Node.js readline will cause
    // the unused first argument to be treated
    // as a Buffer.
    //
    // https://github.com/joyent/node/blob/6e2055889091a424fbb5c500bc3ab9c05d1c28b4/lib/readline.js#L291
    //
    // Wrap this call to determine if the rl
    // output is a terminal.
    if (this.cli.rl.terminal) {
        this.cli.rl.write(null, {
            ctrl: true,
            name: "u"
        });
    }
};

FeedbackLineReporter.prototype.formatTime = function (milliseconds) {
    var formatted = "",
        seconds = (milliseconds / 1000).toFixed(0),
        minutes = 0,
        minutesUnit,
        secondsUnit;

    if (seconds > 60) {
        minutes = (seconds / 60).toFixed(0);
        seconds %= 60;
    }

    minutesUnit = minutes === 1 ? "minute" : "minutes",
    secondsUnit = seconds === 1 ? "second" : "seconds";

    if (minutes > 0) {
        formatted += minutes + " " + minutesUnit + ", ";
    }

    if (!minutes && seconds <= 3) {
        // higher resolution
        seconds = (milliseconds / 1000).toFixed(2);
    }

    formatted += seconds + " " + secondsUnit;

    return formatted;

};

FeedbackLineReporter.prototype.updateETA = function () {
    var current = this.batchDetails.currentIndex,
        total = this.batchDetails.total,
        elapsed = (new Date().getTime()) - this.timeStart,
        eta = elapsed * (total / current - 1),
        formatted = this.formatTime(eta);

    if (formatted) {
        formatted = "ETA " + formatted + " ";
    }

    this.eta = formatted;
};

/**
 * @method updateFeedbackLine
 * @private
 */
FeedbackLineReporter.prototype.updateFeedbackLine = function () {
    var current = this.batchDetails.currentIndex,
        total = this.batchDetails.total,
        percent = current / total * 100,
        spin = ["/", "|", "\\", "-"],
        spins = spin.length - 1,
        coverage = this.determineCoverageProgress(),
        elapsed = (new Date().getTime()) - this.timeStart,
        bps = (this.beats * 1000) / elapsed;

    this.clearLine();
    this.cli.rl.write(ARROW + " Testing... " +
        spin[this.spinIndex] +
        " " + percent.toFixed(0) +
        "% complete (" + current + "/" +
        total + ") " +
        bps.toFixed(2) + " beats/sec " +
        this.eta +
        coverage
    );

    this.feedbackLineDisplayed = true;

    this.spinIndex += 1;
    if (this.spinIndex > spins) {
        this.spinIndex = 0;
    }
};

/**
 * @method handleAgentResult
 */
FeedbackLineReporter.prototype.handleAgentResult = function (agent, details) {
    var passed = details.passed,
        failed = details.failed,
        icon = failed ? BAD : GOOD,
        iconColor = failed ? color.red : color.green;

    this.batchDetails.currentIndex += 1;

    this.batchDetails.passed += passed;
    this.batchDetails.failed += failed;

    this.updateETA();

    if (details.coverage) {
        this.batchDetails.coverage.push(details.coverage);
        this.updateFeedbackLine();
    }

    if (failed) {
        if (!details.name) {
            details.name = details.url;
        }
        this.clearLine();
        this.puts(iconColor(icon), color.bold(details.name), "on", agent);
        this.putsVerboseResult(details);
    }
};

/**
 * @method handleAgentScriptError
 */
FeedbackLineReporter.prototype.handleAgentScriptError = function (agent, details) {
    this.puts(color.red(BAD + " Script error") + ": " + details.message);
    this.puts("  URL: " + details.url);
    this.puts("  Line: " + details.line);
    this.puts("  User-Agent: " + agent);
};

/**
 * @method handleAgentError
 */
FeedbackLineReporter.prototype.handleAgentError = function (agent, details) {
    this.puts(color.red(BAD + " Error") + ": " + details.message);
    this.puts("  User-Agent: " + agent);
};

/**
 * @method handleAgentComplete
 */
FeedbackLineReporter.prototype.handleAgentComplete =  function (agent) {
    this.puts(GOOD, "Agent completed:", agent);
};

/**
 * @method handleAgentBeat
 */
FeedbackLineReporter.prototype.handleAgentBeat = function (agent) {
    this.beats += 1;
    this.updateFeedbackLine();
};

/**
 * @method handleDispatch
 */
FeedbackLineReporter.prototype.handleDispatch = function (agents) {
    if (!agents.length) {
        this.cli.panic(BAD, "No browsers connected, exiting.");
    }
    this.puts(GOOD, "Testing started on", agents.join(", "));
    this.batchDetails.total *= agents.length;
};

/**
 * @method handleComplete
 */
FeedbackLineReporter.prototype.handleComplete = function () {
    this.updateFeedbackLine();

    var duration = Number(new Date()) - this.timeStart,
        total = this.batchDetails.passed + this.batchDetails.failed,
        durationString = "(" + this.formatTime(duration) + ")";

    if (this.batchDetails.failed) {
        this.puts(color.red(BAD + " Failures") + ":", this.batchDetails.failed,
            "of", total, "tests failed.", durationString);
    } else {
        this.puts(color.green(GOOD + " " + total + " tests passed!"), durationString);
    }
};

/**
 * @method handleEnd
 */
FeedbackLineReporter.prototype.handleEnd = function () {
    this.cli.exit(this.batchDetails.failed ? 1 : 0);
};

module.exports = FeedbackLineReporter;

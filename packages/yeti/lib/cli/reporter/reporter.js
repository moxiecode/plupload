"use strict";

function NOOP() {}

/**
 * @class Reporter
 * @constructor
 * @param {Object} options Options.
 * @param {CLI} options.cli CLI.
 * @param {ClientBatch} options.batch Batch.
 */
function Reporter(options) {
    this.cli = options.cli;
    this.batch = options.batch;
}


Reporter.prototype.handleAgentComplete = NOOP;
Reporter.prototype.handleAgentBeat = NOOP;
Reporter.prototype.handleDispatch = NOOP;
Reporter.prototype.updateFeedbackLine = NOOP;

module.exports = Reporter;

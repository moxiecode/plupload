"use strict";

/**
 * @module null-test
 */

var util = require("util");

var Test = require("./test");

/**
 * NullTest represents the absence of a Test.
 * For Yeti, this means the browser should move
 * back to the capture page.
 *
 * @class NullTest
 * @constructor
 * @param {Object} options Options.
 * @param {String} options.mountpoint Normalized mountpoint.
 */
function NullTest(options) {
    this.mountpoint = options.mountpoint;
    this.results = null;
}

util.inherits(NullTest, Test);

/**
 * Get a URL to the capture page for the given Agent ID.
 *
 * @method getUrlForAgentId
 * @override
 * @param {String} agentId
 * @return {String} Relative URL for the capture page, relative to the mountpoint.
 */
NullTest.prototype.getUrlForAgentId = function (agentId) {
    return this.mountpoint + "agent/" + agentId;
};

/**
 * Mark if this test is being worked on by a browser.
 * No-op.
 *
 * @method setExecuting
 */
NullTest.prototype.setExecuting = function () {}; // NOOP

/**
 * Determine if this test is being worked on by a browser.
 *
 * @method isExecuting
 * @return {Boolean} True if executing, false otherwise.
 */
NullTest.prototype.isExecuting = function () {
    return false;
};

/**
 * Determine if this is the NullTest.
 *
 * @method isNull
 * @override
 * @return {Boolean} True.
 */
NullTest.prototype.isNull = function () {
    return true;
};

module.exports = NullTest;

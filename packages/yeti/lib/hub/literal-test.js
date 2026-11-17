"use strict";

/**
 * @module literal-test
 */

var util = require("util");
var Test = require("./test");

/**
 * LiteralTest represents a test that is a relative URL
 * to a location served outside of Yeti.
 *
 * @class LiteralTest
 * @constructor
 * @extends Test
 * @param {Object} options Options.
 * @param {String} options.location Location of this test.
 */
function LiteralTest(options) {
    Test.call(this, options);
}

util.inherits(LiteralTest, Test);

/**
 * Get the URL for this Test for the given Agent ID.
 *
 * @method getUrlForAgentId
 * @override
 * @param {String} agentId Agent ID.
 * @return {String} Relative URL from this test's mountpoint.
 */
LiteralTest.prototype.getUrlForAgentId = function (agentId) {
    return this.location;
};

module.exports = LiteralTest;

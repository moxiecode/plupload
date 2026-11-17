"use strict";

/**
 * @module null-tests
 */

var util = require("util");

var Tests = require("./tests");
var NullTest = require("./null-test");

/**
 * NullTests represents an void collection of tests.
 * Requested actions should move the browser back to
 * the capture page where it can recieve more tests,
 * which is accomplished by returning a NullTest when
 * asked for the next Test.
 *
 * @class NullTests
 * @constructor
 * @param {Object} options Options.
 * @param {String} options.mountpoint Normalized mountpoint.
 */
function NullTests(options) {
    this.setMountpoint(options.mountpoint);
    this.nullTest = new NullTest(this);
}

util.inherits(NullTests, Tests);

/**
 * Create an instance of NullTests for the given mountpoint.
 *
 * @method createForMountpoint
 * @param {String} mountpoint
 */
NullTests.createForMountpoint = function (mountpoint) {
    return new NullTests({
        mountpoint: mountpoint
    });
};

/**
 * Return the NullTest.
 *
 * TODO: Refactor to make this override not needed.
 *
 * @method next
 * @override
 * @return {NullTest} Instance of NullTest for our mountpoint.
 */
NullTests.prototype.next = function () {
    return this.nullTest;
};

/**
 * Determine if tests are waiting to run.
 * Always true for NullTests.
 *
 * TODO: Refactor to make this override not needed.
 *
 * @method didComplete
 * @override
 * @return {Boolean} True.
 */
NullTests.prototype.didComplete = function () {
    return true;
};

/**
 * Get the amount of tests waiting to be sent to a browser.
 *
 * @method totalPending
 * @override
 * @return {Number} Zero.
 */
NullTests.prototype.totalPending = function () {
    return 0;
};

module.exports = NullTests;

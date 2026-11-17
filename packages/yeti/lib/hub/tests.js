"use strict";

/**
 * @module tests
 */

var Test = require("./test");
var LiteralTest = require("./literal-test");
var NullTest = require("./null-test");

/**
 * Tests represent a collection of Test objects.
 *
 * @class Tests
 * @constructor
 * @param {TestSpecification} spec Specification for constructing child Test objects.
 */
function Tests(spec) {
    this.children = {};
    this.initializeFromSpecification(spec);

    this.nullTest = new NullTest(spec);
}

/**
 * Set the mountpoint.
 *
 * @method setMountpoint
 * @param {String} mountpoint Mountpoint.
 */
Tests.prototype.setMountpoint = function (mountpoint) {
    this.mountpoint = mountpoint;
};

/**
 * Get a Test object from this collection by a substring
 * match on the given URL part.
 *
 * @method getByUrl
 * @param {String} url URL part.
 * @return {Test} Test for the given URL, or NullTest if not found.
 */
Tests.prototype.getByUrl = function (url) {
    var locations = Object.keys(this.children),
        length = locations.length,
        index = 0,
        location;

    for (; index < length; index += 1) {
        location = locations[index];

        if (url.indexOf(location) !== -1) {
            return this.children[location];
        }
    }

    return this.nullTest;
};

/**
 * Get an array of Test objects without results.
 *
 * @method getTestsWithoutResults
 * @return {Test[]} Test objects without results.
 */
Tests.prototype.getTestsWithoutResults = function () {
    var self = this,
        testsWithoutResults = [];

    Object.keys(self.children).forEach(function (location) {
        var test = self.children[location];

        if (!test.results) { testsWithoutResults.push(test); }
    });

    return testsWithoutResults;
};

/**
 * Get an array of Test objects that do not have results
 * and are not being ran in a browser now.
 *
 * @method getPendingTests
 * @return {Test[]} Test objects pending.
 */
Tests.prototype.getPendingTests = function () {
    return this.getTestsWithoutResults().filter(function (test) {
        return !test.isExecuting();
    });
};

/**
 * Initialize this object from the given TestSpecification.
 *
 * @method initializeFromSpecification
 * @private
 * @param {TestSpecification} spec
 */
Tests.prototype.initializeFromSpecification = function (spec) {
    var self = this,
        tests;

    self.setMountpoint(spec.mountpoint);

    spec.tests.forEach(function (location) {
        var options = {},
            TestCtor = LiteralTest;

        options.location = location;
        options.batchId = spec.batchId;

        if (spec.useProxy) {
            TestCtor = Test;
            options.query = spec.query;
            options.mountpoint = self.mountpoint;
        }

        self.children[location] = new TestCtor(options);
    });
};

/**
 * Determine if all child Tests have results.
 *
 * @method didComplete
 * @return {Boolean} True if all tests have results, false otherwise.
 */
Tests.prototype.didComplete = function () {
    return this.getTestsWithoutResults().length === 0;
};

/**
 * Get the total amount of Tests in this collection.
 *
 * @method totalSubmitted
 * @return {Number} Number of Tests.
 */
Tests.prototype.totalSubmitted = function () {
    return Object.keys(this.children).length;
};

/**
 * Get the amount of tests waiting to be sent to a browser.
 *
 * @method totalPending
 * @return {Number} Number of Tests.
 */
Tests.prototype.totalPending = function () {
    return this.getPendingTests().length;
};

/**
 * Get the next Test in the queue and remove it from the queue.
 *
 * @method next
 * @return {Test} Next Test in queue, or NullTest if no Test objects are left.
 */
Tests.prototype.next = function () {
    var test = this.getPendingTests().shift();
    if (!test) { test = this.nullTest; }
    return test;
};

module.exports = Tests;

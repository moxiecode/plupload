"use strict";

var Tests = require("./tests");

/**
 * TestSpecification details information about tests in a Test
 * that need to be relayed to a given Target.
 *
 * @class TestSpecification
 * @constructor
 * @param {Object} spec From `Client.createBatch()`.
 * @param {Number} spec.batchId Batch ID.
 * @param {String[]} spec.tests Tests. Either relative paths to `spec.basedir` or URL pathnames.
 * @param {String} [spec.basedir] Root path for serving tests. Required if `useProxy` is true or not provided.
 * @param {String} [spec.query] Query string additions for test URLs.
 * @param {Number} [spec.timeout] Per-test timeout in seconds. Default is 5 minutes.
 *                                  If no activity occurs before the timeout, the next test is loaded.
 * @param {Boolean} [spec.useProxy] True if tests are filenames to proxy to the Hub.
 *                           false if they are literal URL pathnames.
 *                           If not provided, defaults to true.
 * @param {Object[]} [spec.launchBrowsers] Array of WebDriver capabilities to launch.
 * @param {Object} [spec.webdriver] Requested WebDriver hub.
 * @param {String} [spec.webdriver.host] WebDriver host.
 * @param {Number} [spec.webdriver.port] WebDriver port.
 * @param {String} [spec.webdriver.user] WebDriver username.
 * @param {String} [spec.webdriver.pass] WebDriver password.
 */
function TestSpecification(spec) {
    this.batchId = spec.batchId;
    this.tests = spec.tests;
    this.query = spec.query;
    this.basedir = spec.basedir;
    this.timeout = spec.timeout || TestSpecification.DEFAULT_TIMEOUT;
    this.useProxy = spec.useProxy;
    this.launchBrowsers = spec.launchBrowsers;
    this.webdriver = spec.webdriver;

    this.mountpount = this.setMountpoint(spec.mountpoint);
}

TestSpecification.DEFAULT_TIMEOUT = 300; // 5 minutes

/**
 * Creates a new TestSpecification with no tests.
 * This is used by `Batch.destroy()` to return browsers to the capture page.
 *
 * @method empty
 * @static
 * @return {TestSpecification} Empty TestSpecification.
 */
TestSpecification.empty = function () {
    return new TestSpecification({
        tests: []
    });
};

/**
 * Set and normalize the mountpoint for use in creating URLs
 * for Test objects.
 *
 * @method setMountpoint
 * @param {String} mountpoint
 */
TestSpecification.prototype.setMountpoint = function (mountpoint) {
    if (!mountpoint) {
        mountpoint = "/";
    } else if (mountpoint === "" || mountpoint[mountpoint.length - 1] !== "/") {
        mountpoint += "/";
    }
    this.mountpoint = mountpoint;
};

/**
 * Get the timeout in milliseconds.
 *
 * @method getTimeoutMilliseconds
 * @return {Number} Timeout in milliseconds.
 */
TestSpecification.prototype.getTimeoutMilliseconds = function () {
    return this.timeout * 1000;
};

/**
 * Create a Tests object from this specification.
 *
 * @method createTests
 * @return {Tests} Created Tests.
 */
TestSpecification.prototype.createTests = function () {
    return new Tests(this);
};

module.exports = TestSpecification;

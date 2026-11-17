"use strict";

var registry,
    proto;

/**
 * Registry of functions to run periodically.
 *
 * @class PeriodicRegistry
 * @constructor
 */
function PeriodicRegistry() {
    this.children = {};
    this.runTimeout = null;
    this.scheduleEveryMilliseconds = null;
}

/**
 * Repository of functions and their last run time.
 *
 * @property children
 * @type {Object}
 * @private
 */

/**
 * Timeout ID of the currently scheduled setTimeout
 * for `this.run`.
 *
 * @property runTimeout
 * @type {String}
 * @private
 */

/**
 * Time in milliseconds between `this.run` calls.
 *
 * @property scheduleEveryMilliseconds
 * @type {Number}
 * @private
 */

/**
 * Get the singleton.
 *
 * @method getRegistry
 * @static
 * @return {PeriodicRegistry} Registry singleton.
 */
PeriodicRegistry.getRegistry = function () {
    if (!registry) { registry = new PeriodicRegistry(); }
    return registry;
};

proto = PeriodicRegistry.prototype;

/**
 * Get all repository objects as an array.
 *
 * @method getAllAsArray
 * @return {Object[]} Array of repository objects.
 */
proto.getAllAsArray = function () {
    var self = this,
        children = [];
    Object.keys(self.children).forEach(function (key) {
        children.push(self.children[key]);
    });
    return children;
};

/**
 * Determine if functions in this repository need to run,
 * then run them. Called by our setTimeout.
 *
 * @method run
 * @private
 */
proto.run = function periodicRegistryRunner() {
    var now = new Date();
    this.getAllAsArray().forEach(function (child) {
        var timeSinceLastRun = now.getTime() - child.lastRun.getTime();
        if (timeSinceLastRun > child.interval) {
            child.fn();
            child.lastRun = now;
        }
    });
    this.start();
};

/**
 * Start running registered functions periodically.
 *
 * @method start
 */
proto.start = function () {
    if (this.runTimeout) { this.stop(); }
    if (!this.getAllAsArray().length) { return; }
    this.runTimeout = setTimeout(
        this.run.bind(this),
        this.scheduleEveryMilliseconds
    );
};

/**
 * Stop running registered functions periodically.
 *
 * @method stop
 */
proto.stop = function () {
    if (!this.runTimeout) { return; }
    clearTimeout(this.runTimeout);
    this.runTimeout = null;
};

/**
 * Get all intervals for registered functions as an array.
 *
 * @method getAllIntervals
 * @return {Number[]} Array of intervals in milliseconds.
 */
proto.getAllIntervals = function () {
    var intervals = [];
    this.getAllAsArray().forEach(function (child) {
        intervals.push(child.interval);
    });
    return intervals;
};

/**
 * Reschedule the periodic runner given the intervals
 * of the registered functions. Starts running if
 * it's not already.
 *
 * @method syncIntervalsAndStart
 * @private
 */
proto.syncIntervalsAndStart = function () {
    var intervals = this.getAllIntervals(),
        minInterval;

    if (!intervals.length) { return; }

    minInterval = intervals.reduce(function (prev, next) {
        return Math.min(prev, next);
    });

    this.scheduleEveryMilliseconds = minInterval;
    this.start();
};

/**
 * Add a function to the registry.
 *
 * @method add
 * @param {String} id Reference for the registered function.
 *                    Can be used later to remove it.
 * @param {Function} fn Function. Must be bound to the correct context.
 * @param {Number} interval Interval to run this function in milliseconds.
 */
proto.add = function (id, fn, interval) {
    this.children[id] = {
        fn: fn,
        interval: interval,
        lastRun: new Date(0)
    };
    this.syncIntervalsAndStart();
};

/**
 * Remove a function from the registry.
 *
 * @method remove
 * @param {String} id Reference given when adding the function.
 */
proto.remove = function (id) {
    if (id in this.children) {
        delete this.children[id];
        this.syncIntervalsAndStart();
    }
};

module.exports = PeriodicRegistry;

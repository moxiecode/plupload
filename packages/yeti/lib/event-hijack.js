"use strict";

/**
 * @module event-hijack
 */

/**
 * Attach the provided function as the first
 * listener of the given EventEmitter event.
 *
 * All listeners of the event will be removed
 * and replaced with a listener that will run
 * the provided function first, followed by
 * the original listeners if the function
 * returned false.
 *
 * Works with Node.js v0.7+ where the array
 * returned by `ee.listeners()` is a reference.
 *
 * @method hijack
 * @param {EventEmitter} ee Emitter.
 * @param {String} event Event name.
 * @param {Function} firstFn Function to run first.
 */
module.exports = function hijack(ee, event, firstFn) {
    var listeners = ee.listeners(event),
        i = 0,
        length = listeners.length,
        originalListeners = [];

    // Note: listeners is a reference in Node v0.7.
    // Calling `removeAllListeners` no longer destroys
    // the listener array, which causes it survive
    // as a reference. See joyent/node commits:
    //  - 78dc13fbf97e2e3003e6f3baacdd5ff60e8de3f7
    //  - 928ea564d16da47e615ddac627e0b4d4a40d8196
    //
    // Make a copy first.
    for (; i < length; i += 1) {
        originalListeners[i] = listeners[i];
    }

    ee.removeAllListeners(event);

    ee.on(event, function () {
        var args = Array.prototype.slice.call(arguments),
            stack = [firstFn].concat(originalListeners),
            handled;

        handled = firstFn.apply(ee, args);

        if (!handled) {
            originalListeners.forEach(function (fn) {
                fn.apply(ee, args);
            });
        }
    });
};

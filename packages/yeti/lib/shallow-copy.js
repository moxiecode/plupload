"use strict";

/**
 * @module shallow-copy
 */

var util = require("util");

/* Return a shallow copy of the given Object.
 *
 * @method shallowCopy
 * @param {Object} object Object to copy.
 * @return {Object} New object.
 */
module.exports = function shallowCopy(object) {
    var key,
        newObject = object.constructor();

    for (key in object) {
        newObject[key] = object[key];
    }

    return newObject;
};

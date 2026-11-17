/**
 * The Yeti API.
 * @module yeti
 */

"use strict";

var Hub = require("./hub");
var hubClient = require("./client");

/**
 * @class exports
 * @static
 */

/**
 * Create a new Yeti Hub.
 *
 * @method createHub
 * @param {Object} options
 * @return {Hub} hub Yeti Hub instance.
 */
exports.createHub = function (options) {
    return new Hub(options);
};

/**
 * Create a new Yeti Hub Client.
 *
 * @method createClient
 * @param {Object} url The HTTP URL of the Yeti Hub.
 * @return {Client} client Yeti Client instance.
 */
exports.createClient = function (url) {
    return hubClient.createClient(url);
};

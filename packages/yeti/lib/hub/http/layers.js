"use strict";

/**
 * @module layers
 */

/**
 * Middleware for HTTP servers.
 *
 * @class Layers
 * @constructor
 */
function Layers() {
    this.layers = [];
}

/**
 * Function layers to apply to requests in order.
 * @property layers
 * @type {Array}
 */

var proto = Layers.prototype;

/**
 * Add a layer.
 *
 * @method use
 * @param {Function} fn Layer.
 */
proto.use = function (fn) {
    this.layers.push(fn);
};

/**
 * Handle a HTTP request by invoking each
 * layer in order. Stops at each layer
 * unless that layer calls the `nextLayer`
 * function passed as its final argument.
 *
 * Each layer should accept at least 3 arguments:
 *
 *  - `req`
 *  - `res`
 *  - `nextLayer`
 *
 * If `nextLayer` is invoked with an error,
 * only 4-arity layers will be considered to
 * handle the error, passing `err` as the first
 * argument.
 *
 * @method handle
 * @param {HTTPRequest} req HTTP request.
 * @param {HTTPResponse} res HTTP response.
 */
proto.handle = function (req, res) {
    var layers = this.layers.slice(),
        layer,
        arity,
        handled;

    (function nextLayer(err) {
        if ((layer = layers.shift())) {
            arity = layer.length;
            handled = false;
            try {
                if (err && (arity === 4)) {
                    layer(err, req, res, nextLayer);
                    handled = true;
                } else if (arity < 4) {
                    layer(req, res, nextLayer);
                    handled = true;
                }
                if (!handled) {
                    nextLayer(err);
                }
            } catch (ex) {
                nextLayer(ex);
            }
        }
    }());
};

module.exports = Layers;

"use strict";

/**
 * @module router
 */

/**
 *
 * A Router runs a handler function
 * based on a given HTTP method and pathname.
 *
 * @class Router
 * @constructor
 */
function Router() {
    this.routes = [];
}

/**
 * Route objects containing:
 *
 *  - `regex`
 *  - `method`
 *  - `handler`
 *
 * @property routes
 * @type {Array}
 */

var proto = Router.prototype;

/**
 * Register a RegExp that corresponds to a handler function
 * for a HTTP GET request.
 *
 * @method get
 * @param {RegExp} regex Regular expression matching the HTTP pathname.
 * @param {Function} handler Handler method to invoke.
 */
proto.get = function get(regex, handler) {
    this.routes.push({
        regex: regex,
        method: "GET",
        handler: handler
    });
};

/**
 * Register a RegExp that corresponds to a handler function
 * for any HTTP method.
 *
 * @method all
 * @param {RegExp} regex Regular expression matching the HTTP pathname.
 * @param {Function} handler Handler method to invoke.
 */
proto.all = function all(regex, handler) {
    var self = this;
    ["GET", "POST", "OPTIONS", "DELETE"].forEach(function (method) {
        self.routes.push({
            regex: regex,
            method: method,
            handler: handler
        });
    });
};

/**
 * Return all routes that match the given method and pathname.
 *
 * @method match
 * @param {String} method HTTP method.
 * @param {String} path HTTP pathname.
 * @return {Array} Array of matching route objects.
 */
proto.match = function (method, path) {
    return this.routes.filter(function (route) {
        return (path.search(route.regex) > -1) &&
            (method.toUpperCase() === route.method);
    });
};


/**
 * Find matching routes and run them.
 *
 * @method dispatch
 * @param {HTTPRequest} req HTTP request.
 * @param {HTTPResponse} res HTTP response.
 * @return {Boolean} True if routes for this request exist, false otherwise.
 */
proto.dispatch = function (req, res) {
    var self = this,
        attemptable,
        context = {
            req: req,
            res: res
        },
        routes;

    routes = self.match(req.method, req.url);
    attemptable = routes.length > 0;

    function nextRoute(err) {
        var matches,
            route,
            args;

        if (err) {
            self.error(err);
        } else if ((route = routes.shift())) {
            matches = route.regex.exec(req.url);

            args = matches.concat().slice(1);
            args.push(nextRoute);

            route.handler.apply(context, args);
        }
    }

    if (attemptable) {
        nextRoute();
    }

    return attemptable;
};

module.exports = Router;

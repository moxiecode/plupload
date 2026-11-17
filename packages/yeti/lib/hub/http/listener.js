"use strict";

/**
 * @module listener
 */

var util = require("util"),
    url = require("url"),
    hijack = require("../../event-hijack");

/**
 * A **HubListener** augments an existing `http.Server`,
 * adding Hub handling to a given route.
 *
 * @class HubListener
 * @extends process.EventEmitter
 * @constructor
 * @param {Hub} hub An instance of Hub.
 * @param {Server} server The `http.Server` to augment.
 * @param {String} route Respond to requests at this mountpoint, e.g. "/yeti".
 */
function HubListener(hub, server, route) {
    process.EventEmitter.call(this);
    this.hub = hub;
    this.server = server;
    this.route = route;
    this._setupServer();
}

util.inherits(HubListener, process.EventEmitter);

var proto = HubListener.prototype;

/**
 * Inject our handler into the request listener.
 * If the request didn't start with `this.route`,
 * call the existing listeners.
 *
 * @method _setupServer
 * @private
 */
proto._setupServer = function () {
    var self = this;

    hijack(this.server, "upgrade", function (req, socket, head) {
        var server = this,
            parsedUrl = url.parse(req.url),
            resolvedUrl,
            yetiUpgrade = false;

        // Check if the request is either for:
        //  - Socket.io
        //  - Blizzard-Yeti

        if (parsedUrl.pathname.indexOf(self.route) === 0) {
            parsedUrl.pathname = parsedUrl.pathname.substr(self.route.length);
            resolvedUrl = url.format(parsedUrl);
            if (resolvedUrl.indexOf("/socket.io") === 0) {
                yetiUpgrade = true;
            }
        }

        if (req.headers.upgrade === "Blizzard-Yeti") {
            yetiUpgrade = true;
        }

        if (yetiUpgrade) {
            self.hub.server.emit("upgrade", req, socket, head);
            return true;
        }
    });

    hijack(this.server, "request", function (req, res) {
        if (self.match(req, res)) {
            return true;
        }
    });
};

/**
 * Check if this request begins with `this.route`.
 * If it does, handle it with Hub.
 *
 * @method match
 * @param {Object} req An HTTP Request.
 * @param {Object} res An HTTP Response.
 * @return {Boolean} True if matched, false otherwise.
 */
proto.match = function (req, res) {
    var parsedUrl = url.parse(req.url),
        resolvedUrl;
    if (parsedUrl.pathname.indexOf(this.route) === 0) {
        parsedUrl.pathname = parsedUrl.pathname.substr(this.route.length);

        resolvedUrl = url.format(parsedUrl);

        if (resolvedUrl.indexOf("/socket.io") !== 0) {
            req.url = resolvedUrl;
        }

        if (!req.url) {
            // There was no trailing slash,
            // which means relative paths will not work.
            // For example, /yeti instead of /yeti/.
            res.writeHead(302, {
                "Location": this.route + "/"
            });
            res.end();
            return true;
        }

        this.hub.server.emit("request", req, res);
        return true;
    }
    return false;
};

// Export HubListener.
module.exports = HubListener;

"use strict";

var http = require("http");
var util = require("util");
var urlParser = require("url");

var hijack = require("../event-hijack");

var BlizzardSession = require("./session");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

function Blizzard(options) {
    this.sessions = {};

    EventEmitter2.call(this);

    this.on("connect", this.createSession.bind(this));
}

util.inherits(Blizzard, EventEmitter2);

/**
 * Protocol identifier, used during an HTTP Upgrade handshake.
 */
Blizzard.prototype.PROTOCOL = "Blizzard-Yeti";

/**
 * Destroy our reference to an BlizzardSession.
 *
 * @param {Number} id
 * @protected
 */
Blizzard.prototype.destroySession = function (id) {
    delete this.sessions[id];
};

/**
 * Create a new BlizzardSession from the given socket.
 *
 * @param {Socket} socket Upgraded socket.
 * @return {BlizzardSession} A created session.
 * @protected
 */
Blizzard.prototype.createSession = function (socket, instigator) {
    var id, session;

    // Important: This socket was upgraded from Node.js HTTP.
    // Node.js will add a net.Socket timeout of 2 minutes and a
    // timeout listener that will destroy the socket when fired.

    // Remove these artifacts.
    socket.setTimeout(0);
    socket.removeAllListeners("timeout");

    do {
        id = String(Math.random() * 10000 | 0);
    } while (this.sessions[id]);

    session = new BlizzardSession(socket, instigator);
    this.sessions[id] = session;

    session.on("end", this.destroySession.bind(this, id));
    return session;
};

/**
 * Handle an HTTP Client upgrade event.
 *
 * @param {Function} cb Callback called with a new BlizzardSession.
 * @param {HTTPRequest} req HTTP request.
 * @param {Socket} socket Upgraded socket.
 * @protected
 */
Blizzard.prototype.onClientUpgrade = function (cb, req, socket) {
    //this.emit("connect", socket);
    cb(null, this.createSession(socket, true));
};

/**
 * Handle an HTTP Server upgrade event.
 *
 * @param {HTTPRequest} req HTTP request.
 * @param {Socket} socket Upgraded socket.
 * @protected
 */
Blizzard.prototype.serverUpgrade = function (req, socket) {
    // console.log("Recieved upgrade.");
    // console.log("Headers =", req.headers);

    var self = this,
        version = req.headers["sec-blizzard-version"];

    if (req.headers.upgrade !== this.PROTOCOL) {
        return false;
    }

    if (!version || Number(version) !== 1) {
        return false;
    }

    socket.write([
        "HTTP/1.1 101 Welcome to " + this.PROTOCOL,
        "Upgrade: " + this.PROTOCOL,
        "Connection: Upgrade",
        "", ""
    ].join("\r\n"), function () {
        var session = self.createSession(socket, false);
        session.once("ready", function () {
            self.emit("session", session);
        });
    });

    return true;
};

/**
 * Connect to an Blizzard-ready HTTP server.
 *
 * @param {String|Object} url HTTP URL of the server or
 *      require("url").parse object. Optional, defaults to http://127.0.0.1
 * @param {Function} cb Callback, called after the handshake is complete. Required.
 */
Blizzard.prototype.connect = function (url, cb) {
    var host = "127.0.0.1",
        port = 80,
        req;

    if ("function" === typeof url) {
        // Callback provided as first argument.
        cb = url;
        url = null;
    }

    if (url) {
        if ("string" === typeof url) {
            url = urlParser.parse(url);
        }

        if ("http:" !== url.protocol) {
            cb(new Error("HTTP URL required, instead got " + url));
            return;
        }

        if (!url.hostname) {
            cb(new Error("Hostname required, not found in " + url));
            return;
        }

        host = url.hostname;

        if (url.port) {
            port = url.port;
        }
    }

    req = http.request({
        path: "/",
        host: host,
        port: port,
        headers: {
            "Connection": "Upgrade",
            "Sec-Blizzard-Version": 1,
            "Upgrade": this.PROTOCOL
        }
    }, function (req) {
        cb(new Error("Unexpected HTTP response to Blizzard handshake: " + req.statusCode));
    });

    req.end();
    req.on("error", cb);
    req.on("upgrade", this.onClientUpgrade.bind(this, cb));
};

/**
 * Intercept HTTP upgrades on the provided server.
 *
 * @method listen
 * @param {HTTPServer} httpServer
 */
Blizzard.prototype.listen = function (httpServer) {
    var self = this;

    hijack(httpServer, "upgrade", function (req, socket, head) {
        return self.serverUpgrade(req, socket, head);
    });

    return this;
};

module.exports = Blizzard;

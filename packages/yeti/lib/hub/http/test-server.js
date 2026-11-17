"use strict";

/**
 * @module test-server
 */

var mime = require("./mime");
var path = require("path");

/**
 * @class TestServer
 * @constructor
 * @param {String} payload HTML to inject into served HTML documents.
 */
function TestServer(payload) {
    this.payload = payload;
}

/*
 * An array of RegExps that match a head, html
 * or doctype tag in an HTML document.
 *
 * @property CANDIDATE_TAGS
 * @type {Array}
 * @static
 */
TestServer.prototype.CANDIDATE_TAGS = [
    /<\s*head[^>]*>/i, // <head>
    /<\s*html[^>]*>/i, // <html>
    /^\s*<\!\s*?doctype[^>]*>/i // <!doctype html>
];

/**
 * Locate the last available location to inject script
 * in the provided HTML document, yielding an index
 * for injecting a script guaranteed to run before
 * all other scripts in the doucment.
 *
 * @method findInjectionPoint
 * @protected
 * @param {String} html HTML document.
 * @return {Number} Index for injecting a script tag.
 */
TestServer.prototype.findInjectionPoint = function (html) {
    var previousIndex,
        index = 0,
        matchFound = false;

    this.CANDIDATE_TAGS.forEach(function (re) {
        var delta,
            injectionIndex,
            match = re.exec(html);

        if (match === null) {
            return;
        }

        injectionIndex = match.index + match[0].length;

        if (matchFound) {
            delta = html.substring(injectionIndex, previousIndex);
            // This new match is only valid if there is only whitespace
            // between the old match and the new match.
            if (!/^\s*$/.test(delta)) {
                // Failed. Inject earlier in the document.
                index = injectionIndex;
            }
        } else {
            matchFound = true;
            index = injectionIndex;
            html = html.substr(0, match.index);
        }

        previousIndex = match.index;
    });

    return index;
};

/**
 * Inject the TestServer payload into the given buffer
 * containing HTML.
 *
 * @method inject
 * @protected
 * @param {Buffer} buffer HTML document, UTF-8 encoded.
 * @return {Buffer} HTML document with payload, UTF-8 encoded.
 */
TestServer.prototype.inject = function (buffer) {
    var html = buffer.toString("utf8"),
        index = this.findInjectionPoint(html);

    return new Buffer(html.slice(0, index) +
            this.payload + html.slice(index), "utf8");
};

/**
 * Serve a buffer with the given server.
 *
 * If the file is HTML, inject the TestServer payload before serving.
 *
 * @method serve
 * @param {HTTPServer} server HTTP server.
 * @param {String} filename Filename for determining Content-Type.
 * @param {Boolean} fileInBatch True if the file is a candidate for injection
 * because it is a file in the batch. False if the file is not listed in the batch,
 * therefore it may be an iframe HTML document that isn't a test.
 * @param {Buffer} buffer File to serve, UTF-8 encoded.
 */
TestServer.prototype.serve = function (server, filename, fileInBatch, buffer) {
    var injectScript = false,
        now = new Date(),
        headers = {
            Date: now.toUTCString()
        };

    // Cache for 4 minutes.
    headers.Expires = (new Date(now.getTime() + 240000)).toUTCString();

    headers["Content-Type"] = mime.contentTypes[path.extname(filename).slice(1)] ||
        "application/octet-stream";

    switch (headers["Content-Type"]) {
    case "text/html":
        injectScript = true;
        headers["Content-Type"] += "; charset=utf-8";
        break;
    case "application/javascript":
    case "application/xml":
    case "text/css":
    case "text/plain":
        headers["Content-Type"] += "; charset=utf-8";
        break;
    }

    if (injectScript && fileInBatch) {
        buffer = this.inject(buffer);
    }

    headers["Content-Length"] = buffer.length;

    server.res.writeHead(200, headers);

    if (server.req.method === "HEAD") {
        server.res.end();
        return;
    }

    server.res.end(buffer);
};

module.exports = TestServer;

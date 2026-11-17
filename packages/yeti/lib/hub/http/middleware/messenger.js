"use strict";

/**
 * Dependencies.
 */
var STATUS_CODES = require("http").STATUS_CODES;

/**
 * Provides `res.message`, which displays a pretty
 * message as the HTTP response.
 *
 * A Connect middleware.
 */
module.exports = function messengerProvider(renderConfig) {

    return function messengerFilter(req, res, next) {

        /**
         * End the request with a pretty message.
         *
         * @param {Number} code HTTP status code
         * @param {String} message Message.
         * @param {String} subtitle A title. Optional.
         *                          Defaults to HTTP code explination.
         */
        res.message = function yetiMessage(code, message, subtitle) {

            var hasBody = req.method.toUpperCase() !== "HEAD";

            res.writeHead(code, {
                "Content-Type" : "text/plain"
            });

            if (!hasBody) {
                return res.end();
            }

            subtitle = subtitle || STATUS_CODES[code];
            subtitle += "\n";

            res.end(subtitle + message);
        };

        next();

    };

};

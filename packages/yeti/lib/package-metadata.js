"use strict";

var fs = require("fs");
var path = require("path");

var cache;

// Read package metadata.
// Cache it for subsequent runs.
exports.readPackageSync = function () {
    if (!cache) {
        cache = JSON.parse(
            fs.readFileSync(
                path.join(
                    __dirname,
                    "..",
                    "package.json"
                ),
                "utf8"
            )
        );
    }
    return cache;
};

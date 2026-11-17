#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    path = require("path"),
    history;

function log() {
    if (process.env.npm_config_loglevel !== "silent") {
        console.log.apply(null, Array.prototype.slice.call(arguments));
    }
}

require("./fetch_deps");

fs.readFile(path.join(__dirname, "..", "HISTORY.md"), "utf8", function (err, data) {
    history = data.split("\n").slice(2, 20).join("\n");
    process.on("exit", function () {
        log("\nThanks for installing Yeti", process.env.npm_package_version || 'dev/master');
        log("\nRecent changes in HISTORY.md:\n\n" + history);
    });
});




#!/usr/bin/env node

"use strict";

var CLI = require("./lib/cli").CLI;

var frontend = new CLI({
    stdin:  process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    exitFn: process.exit,
    process: process
});

frontend.setupExceptionHandler();
frontend.route(process.argv);

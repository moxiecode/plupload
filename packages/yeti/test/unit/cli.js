"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");

var EventEmitter = require("events").EventEmitter;

var streams = require("../lib/streams");

var Configuration = require("../../lib/cli/configuration");

function createProcessMock() {
    var mock = new EventEmitter();
    mock.cwd = function () {
        return "/cwd";
    };
    return mock;
}

function createHubMock() {
    function Hub(options) {
        this.options = options;
    }

    return Hub;
}

vows.describe("CLI").addBatch({
    "Given a CLI": {
        topic: function () {
            var topic = {},
                cliModulePath = "../../lib/cli",
                CLI;

            topic.mockProcess = createProcessMock();
            topic.mockHub = createHubMock();

            mockery.enable();
            mockery.registerAllowable(cliModulePath);
            mockery.registerMock('../hub', topic.mockHub);

            CLI = require(cliModulePath).CLI;

            topic.cli = new CLI({
                stdin: new streams.MockReadableStream(),
                stdout: new streams.MockWritableStream(),
                stderr: new streams.MockWritableStream(),
                process: topic.mockProcess
            });

            return topic;
        },
        teardown: function (topic) {
            mockery.deregisterAll();
            mockery.disable();
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "calling setupExceptionHandler works as expected": function (topic) {
            assert.lengthOf(topic.mockProcess.listeners("uncaughtException"), 0);
            topic.cli.setupExceptionHandler();
            assert.lengthOf(topic.mockProcess.listeners("uncaughtException"), 1);
            topic.cli.setupExceptionHandler();
            assert.lengthOf(topic.mockProcess.listeners("uncaughtException"), 1,
                "Only one handler should be installed.");
        },
        "calling createHub creates a hub": function (topic) {
            var config,
                hub,
                fixture;

            fixture = {
                loglevel: "foo",
                "wd-host": "bar",
                "wd-port": "baz",
                "wd-user": "quux",
                "wd-pass": "dogcow"
            };

            config = new Configuration();

            config.import(fixture);

            hub = topic.cli.createHub(config);

            assert.strictEqual(hub.options.loglevel, fixture.loglevel);
            assert.strictEqual(hub.options.webdriver.host, fixture["wd-host"]);
            assert.strictEqual(hub.options.webdriver.port, fixture["wd-port"]);
            assert.strictEqual(hub.options.webdriver.user, fixture["wd-user"]);
            assert.strictEqual(hub.options.webdriver.pass, fixture["wd-pass"]);
        }
    }
}).export(module);

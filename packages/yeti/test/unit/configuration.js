"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");
var mocks = require("mocks");

function createFsMock() {
    var fs = mocks.fs.create({
        '.yeti_config.json': mocks.fs.file(
            Date.now(),
            '"newton":"wrong import, this should be 1337"'),
        'opt': {
            '.yeti_config.json': mocks.fs.file(
                Date.now(),
                '{"foodir":".","newton":1337}'),
            'unit': {
                'project': {
                    'c.js': 1
                }
            }
        },
        'home': {
            'yeti': {
                '.yeti_config.json': mocks.fs.file(
                    Date.now(),
                    '{"bardir":".","newton":1989}'),
                'project': {
                    'a.js': 1
                },
                'current_directory': {
                    '.yeti_config.json': mocks.fs.file(
                        Date.now(),
                        '{"bazdir":"../baz"}')
                }
            },
            'baz': {
                'b.js': 1
            }
        }
    });

    fs.existsSync = function (path) {
        var exists = true;

        try {
            fs.readFileSync(path);
        } catch (ex) {
            exists = false;
        }

        return exists;
    };

    return fs;
}

function createProcessMock() {
    var p = {};
    p.cwd = function () {
        return "/home/yeti/current_directory";
    };
    p.env = {
        HOME: "/home/yeti",
        BIKE_BAR_: "tikit",
        PORTLAND: "doug fir",
        FOO_PORTLAND: "tri-met",
        BAR_PORTLAND: "voicebox",
        BAR_SAN_JOSE: "singlebarrel",
        BAR_ORDER: "dark and stormy"
    };
    return p;
}

vows.describe("Configuration").addBatch({
    "Given a Configuration": {
        topic: function () {
            var topic = {},
                configurationModulePath = "../../lib/cli/configuration",
                Configuration;

            topic.fsMock = createFsMock();
            topic.processMock = createProcessMock();

            mockery.enable({
                useCleanCache: true
            });

            mockery.registerAllowables([
                configurationModulePath,
                "./events",
                "eventemitter2",
                "proto-list",
                "path",
                "util"
            ]);

            mockery.registerMock("graceful-fs", topic.fsMock);

            Configuration = require(configurationModulePath);

            topic.config = new Configuration();

            topic.config.setFilename('.yeti_config.json');
            topic.config.setProcess(topic.processMock);

            topic.config.import({
                foo: "bar",
                baz: "quux",
                order: "manhattan"
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
        "calling get gives us a value for a valid key": function (topic) {
            assert.strictEqual(topic.config.get("baz"), "quux");
        },
        "calling export gives us the entire configuration object": function (topic) {
            var everything = topic.config.export();

            assert.include(everything, "foo");
            assert.include(everything, "baz");
            assert.strictEqual(everything.foo, "bar");
            assert.strictEqual(everything.baz, "quux");
        },
        "calling parse with bad JSON yields null": function (topic) {
            assert.isNull(topic.config.parse("chick\n"));
        },
        "calling locate finds the config file": function (topic) {
            var filename = topic.config.locate("/opt/unit/project");
            assert.strictEqual(filename, "/opt/.yeti_config.json");
        },
        "calling locate does not find files that do not exist": function (topic) {
            var filename;
            topic.config.setFilename(".bogus.json");
            assert.isNull(topic.config.locate("/opt/unit/project"));
            topic.config.setFilename(".yeti_config.json");
        },
        "calling set saves new values": function (topic) {
            assert.isUndefined(topic.config.get("biscuits"));
            topic.config.set("biscuits", "gravy");
            assert.strictEqual(topic.config.get("biscuits"), "gravy");
        },
        "calling importFromDirectory works correctly": function (topic) {
            topic.config.importFromDirectory("/opt/unit/project");

            assert.strictEqual(topic.config.get("foodir"), "/opt");
            assert.strictEqual(topic.config.get("newton"), 1337);
        },
        "calling importFromFile without a file is a no-op": function (topic) {
            topic.config.importFromFile();
            assert.strictEqual(topic.config.get("baz"), "quux");
            topic.config.importFromFile(null);
            assert.strictEqual(topic.config.get("baz"), "quux");
        },
        "calling importFromFile with non-JSON file is a no-op": function (topic) {
            topic.config.importFromFile('/.yeti_config.json');
            assert.strictEqual(topic.config.get("baz"), "quux");
        },
        "calling env imports the correct environment variables": function (topic) {
            assert.isUndefined(topic.config.get("portland"));
            assert.isUndefined(topic.config.get("san_jose"));
            assert.isUndefined(topic.config.get("bike_bar_"));
            assert.strictEqual(topic.config.get("order"), "manhattan");

            topic.config.env("BAR_");

            assert.isUndefined(topic.config.get("bike_bar_"));

            assert.strictEqual(topic.config.get("portland"), "voicebox");
            assert.strictEqual(topic.config.get("san_jose"), "singlebarrel");
            assert.strictEqual(topic.config.get("order"), "dark and stormy");
        },
        "calling find imports the correct configuration": function (topic) {
            assert.isUndefined(topic.config.get("bazdir"));

            topic.config.find();

            // imported from locate starting from /home/yeti/current_directory

            assert.strictEqual(topic.config.get("bazdir"), "/home/yeti/baz");
        },
        "calling home imports the correct configuration": function (topic) {
            assert.isUndefined(topic.config.get("bardir"));

            topic.config.home();

            // imported from locate starting from /home/yeti
            // will locate config one level up in /home/yeti

            assert.strictEqual(topic.config.get("bardir"), "/home/yeti");
            assert.strictEqual(topic.config.get("newton"), 1989);
        }
    }
}).export(module);

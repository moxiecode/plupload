"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");

var LOTS_OF_INTERFACES = { lo0:
                           [ { address: 'fe80::1',
                               family: 'IPv6',
                               internal: true },
                             { address: '127.0.0.1',
                               family: 'IPv4',
                               internal: true },
                             { address: '::1',
                               family: 'IPv6',
                               internal: true } ],
                          en0:
                           [ { address: 'fe80::1610:9fff:feda:f07',
                               family: 'IPv6',
                               internal: false },
                             { address: '10.12.24.36',
                               family: 'IPv4',
                               internal: false } ],
                          en2:
                           [ { address: 'fe80::426c:8fff:fe40:8de7',
                               family: 'IPv6',
                               internal: false },
                             { address: '10.82.89.10',
                               family: 'IPv4',
                               internal: false } ],
                          utun0:
                           [ { address: 'fe80::6869:8dc4:760f:727c',
                               family: 'IPv6',
                               internal: false },
                             { address: 'fd42:c749:bdad:301e:6869:8dc4:760f:727c',
                               family: 'IPv6',
                               internal: false } ] };

var NO_PUBLIC_INTERFACES = { lo0:
                               [ { address: 'fe80::1',
                                   family: 'IPv6',
                                   internal: true },
                                 { address: '127.0.0.1',
                                   family: 'IPv4',
                                   internal: true },
                                 { address: '::1',
                                   family: 'IPv6',
                                   internal: true } ],
                              utun0:
                               [ { address: 'fe80::6869:8dc4:760f:727c',
                                   family: 'IPv6',
                                   internal: false },
                                 { address: 'fd42:c749:bdad:301e:6869:8dc4:760f:727c',
                                   family: 'IPv6',
                                   internal: false } ] };

function createMockOs(interfaces) {
    var count = 0;
    return {
        __attempts: function () {
            return count;
        },
        networkInterfaces: function () {
            count += 1;
            return interfaces;
        }
    };
}

function ipTopic(interfaces, tests) {
    var ctx = {};

    ctx.topic = function () {
        var topic = {},
            ipModulePath = "../../lib/local-ip",
            Configuration;

        topic.mockOs = createMockOs(interfaces);

        mockery.enable({
            useCleanCache: true
        });

        mockery.registerAllowable(ipModulePath);

        mockery.registerMock("os", topic.mockOs);

        topic.ip = require(ipModulePath);

        return topic;
    };

    ctx.teardown = function (topic) {
        mockery.deregisterAll();
        mockery.disable();
    };

    ctx["is ok"] = function (topic) {
        if (topic instanceof Error) { throw topic; }
    };

    Object.keys(tests).forEach(function (key) {
        ctx[key] = tests[key];
    });

    return ctx;
}

vows.describe("Local IP").addBatch({
    "Given many interfaces": ipTopic(LOTS_OF_INTERFACES, {
        "the local-ip function yields the correct IP": function (topic) {
            assert.strictEqual(topic.mockOs.__attempts(), 0);
            assert.strictEqual(topic.ip(), "10.82.89.10");
            assert.strictEqual(topic.mockOs.__attempts(), 1);
        },
        "the local-ip function caches its result": function (topic) {
            assert.strictEqual(topic.mockOs.__attempts(), 1);
            assert.strictEqual(topic.ip(), "10.82.89.10");
            assert.strictEqual(topic.mockOs.__attempts(), 1);
        }
    })
}).addBatch({
    "Given no public interfaces": ipTopic(NO_PUBLIC_INTERFACES, {
        "the local-ip function yields localhost": function (topic) {
            assert.strictEqual(topic.mockOs.__attempts(), 0);
            assert.strictEqual(topic.ip(), "localhost");
            assert.strictEqual(topic.mockOs.__attempts(), 1);
        },
        "the local-ip function caches its result": function (topic) {
            assert.strictEqual(topic.mockOs.__attempts(), 1);
            assert.strictEqual(topic.ip(), "localhost");
            assert.strictEqual(topic.mockOs.__attempts(), 1);
        }
    })
}).export(module);

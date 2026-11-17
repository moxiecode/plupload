"use strict";

var vows = require("vows");
var assert = require("assert");

var TestServer = require("../../lib/hub/http/test-server");

function MockServerResponse() {
    this.headers = null;
    this.code = null;
    this.buffer = null;
}

MockServerResponse.prototype.writeHead = function (code, headers) {
    this.code = code;
    this.headers = headers;
};

MockServerResponse.prototype.end = function (buffer) {
    if (buffer) { this.buffer = buffer; }
};

function MockServerRequest(method) {
    this.method = method;
}

function createMockPair(method) {
    return {
        req: new MockServerRequest(method),
        res: new MockServerResponse()
    };
}

vows.describe("HTML Injector Server").addBatch({
    "Given a TestServer": {
        topic: function () {
            var topic = {};
            topic.payload = '<script src="foo.js"></script>';
            topic.ts = new TestServer(topic.payload);
            return topic;
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "calling serve for a GET for a JS file": {
            topic: function (topic) {
                var server = createMockPair("GET");
                server.startTime = (new Date()).getTime();
                server.buffer = new Buffer("while (1);");
                topic.ts.serve(server, "evil.js", false, server.buffer);
                return server;
            },
            "the correct headers are returned": function (server) {
                assert.include(server.res.headers, "Content-Length");
                assert.include(server.res.headers, "Content-Type");
                assert.include(server.res.headers, "Expires");
                assert.include(server.res.headers, "Date");
            },
            "no script is injected": function (server) {
                assert.strictEqual(server.res.buffer.toString("utf8"), server.buffer.toString("utf8"));
            },
            "the headers are correct": function (server) {
                var expiresTime = Date.parse(server.res.headers.Expires),
                    dateTime = Date.parse(server.res.headers.Date);

                assert.strictEqual(server.res.code, 200);
                assert.strictEqual(server.res.headers["Content-Type"], "application/javascript; charset=utf-8");
                assert.strictEqual(server.res.headers["Content-Length"], server.buffer.length);

                assert.strictEqual(expiresTime - dateTime, 240000, "Expires time should be 4 minutes from Date header");
                // dateTime is second accurate, but startTime is millisecond accurate -- be fuzzy
                assert(Math.abs(dateTime - server.startTime) < 1500, "Date header may be incorrect");
            }
        },
        "calling serve for a GET for a HTML file": {
            topic: function (topic) {
                var server = createMockPair("GET");
                server.startTime = (new Date()).getTime();
                server.payload = topic.payload;
                server.buffer = new Buffer("<title>Foo</title><h1>Bar</h1><p>Baz</p>");
                topic.ts.serve(server, "test.html", true, server.buffer);
                return server;
            },
            "the correct headers are returned": function (server) {
                assert.include(server.res.headers, "Content-Length");
                assert.include(server.res.headers, "Content-Type");
                assert.include(server.res.headers, "Expires");
                assert.include(server.res.headers, "Date");
            },
            "no script is injected": function (server) {
                assert.strictEqual(server.res.buffer.toString("utf8"),
                    server.payload + server.buffer.toString("utf8"));
            },
            "the headers are correct": function (server) {
                var expiresTime = Date.parse(server.res.headers.Expires),
                    dateTime = Date.parse(server.res.headers.Date);

                assert.strictEqual(server.res.code, 200);
                assert.strictEqual(server.res.headers["Content-Type"], "text/html; charset=utf-8");
                assert.strictEqual(server.res.headers["Content-Length"], server.buffer.length + server.payload.length);

                assert.strictEqual(expiresTime - dateTime, 240000, "Expires time should be 4 minutes from Date header");
                // dateTime is second accurate, but startTime is millisecond accurate -- be fuzzy
                assert(Math.abs(dateTime - server.startTime) < 1500, "Date header may be incorrect");
            }
        },
        "calling serve for a HEAD for a HTML file": {
            topic: function (topic) {
                var server = createMockPair("HEAD");
                server.startTime = (new Date()).getTime();
                server.payload = topic.payload;
                server.buffer = new Buffer("<title>Foo</title><h1>Bar</h1><p>Baz</p>");
                topic.ts.serve(server, "test.html", true, server.buffer);
                return server;
            },
            "the correct headers are returned": function (server) {
                assert.include(server.res.headers, "Content-Length");
                assert.include(server.res.headers, "Content-Type");
                assert.include(server.res.headers, "Expires");
                assert.include(server.res.headers, "Date");
            },
            "no body was sent": function (server) {
                assert.isNull(server.res.buffer);
            },
            "the headers are correct": function (server) {
                var expiresTime = Date.parse(server.res.headers.Expires),
                    dateTime = Date.parse(server.res.headers.Date);

                assert.strictEqual(server.res.code, 200);
                assert.strictEqual(server.res.headers["Content-Type"], "text/html; charset=utf-8");
                assert.strictEqual(server.res.headers["Content-Length"], server.buffer.length + server.payload.length);

                assert.strictEqual(expiresTime - dateTime, 240000, "Expires time should be 4 minutes from Date header");
                // dateTime is second accurate, but startTime is millisecond accurate -- be fuzzy
                assert(Math.abs(dateTime - server.startTime) < 1500, "Date header may be incorrect");
            }
        },
        "calling serve for a GET for a unknown file": {
            topic: function (topic) {
                var server = createMockPair("GET");
                server.startTime = (new Date()).getTime();
                server.buffer = new Buffer(50);
                topic.ts.serve(server, "test.yti", false, server.buffer);
                return server;
            },
            "the correct headers are returned": function (server) {
                assert.include(server.res.headers, "Content-Length");
                assert.include(server.res.headers, "Content-Type");
                assert.include(server.res.headers, "Expires");
                assert.include(server.res.headers, "Date");
            },
            "no script is injected": function (server) {
                assert.strictEqual(server.res.buffer.toString("utf8"), server.buffer.toString("utf8"));
            },
            "the headers are correct": function (server) {
                var expiresTime = Date.parse(server.res.headers.Expires),
                    dateTime = Date.parse(server.res.headers.Date);

                assert.strictEqual(server.res.code, 200);
                assert.strictEqual(server.res.headers["Content-Type"], "application/octet-stream");
                assert.strictEqual(server.res.headers["Content-Length"], server.buffer.length);

                assert.strictEqual(expiresTime - dateTime, 240000, "Expires time should be 4 minutes from Date header");
                // dateTime is second accurate, but startTime is millisecond accurate -- be fuzzy
                assert(Math.abs(dateTime - server.startTime) < 1500, "Date header may be incorrect");
            }
        }
    }
}).export(module);

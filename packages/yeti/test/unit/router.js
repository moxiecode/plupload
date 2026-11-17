"use strict";

var vows = require("vows");
var assert = require("assert");

var Router = require("../../lib/hub/http/router");

function MockServerRequest(method, url) {
    this.method = method;
    this.url = url;
}

vows.describe("Router").addBatch({
    "Given a configured Router": {
        topic: function () {
            var topic = {};
            topic.router = new Router();

            topic.router.get(/^\/get$/, function (next) {
                topic.get_next = next;
                topic.get_context = this;
            });

            topic.all = {};
            topic.router.all(/^\/all$/, function (req, res) {
                topic.all.push([req, res]);
            });

            return topic;
        },
        "when calling match to get routes for get": {
            topic: function (routerTopic) {
                return routerTopic.router.match("GET", "/get");
            },
            "the correct routes are given": function (topic) {
                assert.lengthOf(topic, 1);
                assert("/get".search(topic[0].regex) > -1, "Regex for given route should match /get");
                assert.strictEqual(topic[0].method, "GET");
            }
        },
        "when calling dispatch to match get": {
            topic: function (routerTopic) {
                var topic = {};

                topic.req = new MockServerRequest("GET", "/get");
                topic.attemptable = routerTopic.router.dispatch(topic.req, "FIXTURE_RES");
                topic.routerTopic = routerTopic;

                return topic;
            },
            "a match was found": function (topic) {
                assert.isTrue(topic.attemptable);
            },
            "the correct handler was called": function (topic) {
                assert.include(topic.routerTopic, "get_next");
                assert.include(topic.routerTopic, "get_context");
                assert.include(topic.routerTopic.get_context, "req");
                assert.include(topic.routerTopic.get_context, "res");
                assert.strictEqual(topic.routerTopic.get_context.req.method, "GET");
                assert.strictEqual(topic.routerTopic.get_context.req.url, "/get");
                assert.strictEqual(topic.routerTopic.get_context.res, "FIXTURE_RES");
            }
        },
        "when calling dispatch for a bogus route": {
            topic: function (routerTopic) {
                var req = new MockServerRequest("GET", "/bogus");
                return routerTopic.router.dispatch(req, "FIXTURE_RES");
            },
            "a match was not found": function (topic) {
                assert.isFalse(topic);
            }
        }
    }
}).export(module);

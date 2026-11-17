"use strict";

var vows = require("vows");
var assert = require("assert");

var EventEmitter = require("events").EventEmitter;

var hijack = require("../../lib/event-hijack");

vows.describe("Event Hijack").addBatch({
    "Given an EventEmitter with a few listeners": {
        topic: function () {
            var topic = {
                foo: 1,
                cur: "neutral"
            };

            topic.ee = new EventEmitter();

            topic.ee.on("foo", function evenFoo() {
                topic.foo += 2;
            });
            topic.ee.on("foo", function oddFoo() {
                topic.foo += 1;
                topic.cur = "last";
            });

            return topic;
        },
        "when hijacked then fired": {
            topic: function (lastTopic) {
                var vow = this,
                    topic = {
                        hijack: false
                    };
                topic.lastTopic = lastTopic;

                hijack(lastTopic.ee, "foo", function newFoo() {
                    topic.hijack = true;
                    lastTopic.cur = "first";
                    vow.callback(null, topic);
                });

                lastTopic.ee.emit("foo");
            },
            "all events fire in the correct order": function (topic) {
                assert.strictEqual(topic.lastTopic.foo, 4);
                assert.strictEqual(topic.lastTopic.cur, "last");
                assert.isTrue(topic.hijack);
            }
        }
    }
}).export(module);

"use strict";

var vows = require("vows");
var assert = require("assert");

var color = require("../../lib/cli/color").codes;

vows.describe("Color Escapes").addBatch({
    "When using bold color": {
        topic: function () {
            return color.bold("Foo") + " Bar";
        },
        "the escape is correct": function (topic) {
            assert.strictEqual(topic, "\u001b[1mFoo\u001b[0m Bar");
        }
    },
    "When using red color": {
        topic: function () {
            return color.red("Foo") + " Bar";
        },
        "the escape is correct": function (topic) {
            assert.strictEqual(topic, "\u001b[31mFoo\u001b[0m Bar");
        }
    },
    "When using green color": {
        topic: function () {
            return color.green("Foo") + " Bar";
        },
        "the escape is correct": function (topic) {
            assert.strictEqual(topic, "\u001b[32mFoo\u001b[0m Bar");
        }
    },
    "When using blue color": {
        topic: function () {
            return color.blue("Foo") + " Bar";
        },
        "the escape is correct": function (topic) {
            assert.strictEqual(topic, "\u001b[34mFoo\u001b[0m Bar");
        }
    }
}).export(module);

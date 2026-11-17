"use strict";

/**
 * @module streams
 */

var util = require("util");
var EventEmitter2 = require("../../lib/event-emitter");

var DEBUG = process.env.YETI_MOCK_DEBUG;

function makeString(data) {
    if (Buffer.isBuffer(data)) {
        data = data.toString("utf8");
    }

    return data;
}

function WRITE(data) {
    this.emit("data", makeString(data));
}

function NOOP() {}

/**
 * @class MockReadableStream
 * @constructor
 * @extends YetiEventEmitter2
 */
function MockReadableStream() {
    EventEmitter2.call(this);
}

util.inherits(MockReadableStream, EventEmitter2);

MockReadableStream.prototype.isTTY = false;

/**
 * No-op.
 *
 * @method setEncoding
 */
MockReadableStream.prototype.setEncoding = NOOP;

/**
 * No-op.
 *
 * @method resume
 */
MockReadableStream.prototype.resume = NOOP;

/**
 * No-op.
 *
 * @method pause
 */
MockReadableStream.prototype.pause = NOOP;

/**
 * No-op.
 *
 * @method destroy
 */
MockReadableStream.prototype.destroy = NOOP;

/**
 * Emit the `data` event with first argument
 * as a String.
 *
 * @method write
 * @param {String|Buffer} data Data.
 */
MockReadableStream.prototype.write = WRITE;

/**
 * @class MockWritableStream
 * @constructor
 * @extends YetiEventEmitter2
 */
function MockWritableStream() {
    EventEmitter2.call(this);

    if (DEBUG) {
        this.id = (Math.random() * 100000) | 0;
    }
}

util.inherits(MockWritableStream, EventEmitter2);

MockWritableStream.prototype.isTTY = false;

/**
 * No-op.
 *
 * @method end
 */
MockWritableStream.prototype.end = NOOP;

/**
 * Emit the `data` event with first argument
 * as a String.
 *
 * @method write
 * @param {String|Buffer} data Data.
 */
MockWritableStream.prototype.write = WRITE;

/**
 * Call the given callback when expectedString
 * is written to this stream. The callback recieves
 * a string of all data written since the expect call.
 *
 * @method expect
 * @param {String} expectedString Expected string.
 * @param {Function} cb Callback.
 * @param {null} cb.err Error for callback, always null.
 * @param {String} cb.data All data written between expectedString
 * appearing and calling expect.
 */
MockWritableStream.prototype.expect = function (expectedString, cb) {
    var self = this,
        what,
        dataEvents = [];

    if (DEBUG) {
        what = "MockWritableStream<" + self.id + ">#expect:";
        console.log(what, "Expecting:", expectedString);
    }

    self.on("data", function ondata(data) {
        data = makeString(data);

        dataEvents.push(data);

        if (DEBUG) {
            console.log(what, "Collecting:", data);
        }

        if (expectedString && data.indexOf(expectedString) !== -1) {
            self.removeListener("data", ondata);
            cb(null, dataEvents.join(""));
        }
    });
};

exports.MockReadableStream = MockReadableStream;
exports.MockWritableStream = MockWritableStream;

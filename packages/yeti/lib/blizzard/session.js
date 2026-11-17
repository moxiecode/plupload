"use strict";

var util = require("util");
var assert = require("assert");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

var BlizzardNamespace = require("./namespace");

/**
 * A BlizzardSession is an evented bi-directional
 * RPC channel over a net.Socket.
 *
 * @class BlizzardSession
 * @constructor
 * @param {net.Socket} socket
 * @param {Boolean} instigator True if we started this connection, false otherwise.
 * @inherits EventEmitter2
 */
function BlizzardSession(socket, instigator) {
    var sequence = instigator ? 0 : 1;

    this.socket = socket;

    // Did our side start the connection?
    this.instigator = instigator;

    this.requestCallbacks = {};
    this.requestMethods = {};
    this.streams = {};

    this.output = [];

    // This ID represents a request-response pair.
    Object.defineProperty(this, "sequence", {
        get: function () {
            return sequence;
        },
        set: function (newSequence) {
            // Blizzard IDs are 32-bit unsigned integers.
            // Numbers higher than MAX_ID can not be
            // represented, so rollover to 0.
            if (newSequence > BlizzardSession.MAX_ID) {
                newSequence = 0;
            }
            sequence = newSequence;
        }
    });

    EventEmitter2.call(this, {
        wildcard: true
    });

    if (process.env.BLIZZARD_DEBUG) {
        this.onAny(function () {
            console.log.apply(this, [
                "[BlizzardSession]",
                instigator ? "<--" : "-->",
                this.event
            ].concat(Array.prototype.slice.call(arguments, 0)));
        });
    }

    this.setupBinaryParser(this.socket);

    this.bindEvents();

    // If we're the client, tell the server the client is ready.
    if (this.instigator) {
        this.xferRawZeroLength(BlizzardSession.TYPE_HANDSHAKE, 0);
    }
}

util.inherits(BlizzardSession, EventEmitter2);

BlizzardSession.MAGIC = 89;

BlizzardSession.TYPE_HANDSHAKE = 0;
BlizzardSession.TYPE_JSON = 1;
BlizzardSession.TYPE_BUFFER_RESPONSE = 3;

// Maximum 32-bit unsigned integer.
BlizzardSession.MAX_ID = Math.pow(2, 32) - 1;

BlizzardSession.ERROR_USER = -32000;
BlizzardSession.ERROR_PARSE = -32700;
BlizzardSession.ERROR_INVALID = -32600;
BlizzardSession.ERROR_METHOD = -32601;
BlizzardSession.ERROR_INTERNAL = -32603;

/**
 * Array of output Buffers.
 *
 * @property output
 * @type {Array}
 * @private
 */

/**
 * Bind our events to handler methods.
 *
 * @method bindEvents
 * @protected
 */
BlizzardSession.prototype.bindEvents = function () {
    var self = this;

    // Handle incoming raw JSON string.
    this.on("json", this.onIncomingJSON.bind(this));

    // Handle incoming raw Buffer.
    this.on("buffer", this.bufferPut.bind(this));

    // Handle incoming Buffer EOF.
    this.on("bufferComplete", this.bufferComplete.bind(this));

    // Handle parsed JSON message.
    this.on("message", this.onMessage.bind(this));

    // Handle errors.
    this.on("fail", this.onFailure.bind(this));

    // Close when the remote socket closes.
    /**
     * @event end
     * @description Fires when the remote socket closes.
     * Attempting to use the session may cause an error.
     */
    this.socket.on("end", this.emit.bind(this, "end"));
    this.on("end", this.end.bind(this));

    // Handle socket drain.
    this.socket.on("drain", this._socketDrain.bind(this));

    // Handle RPC calls.
    /**
     * @event rpc.**
     * @description Fired to make a RPC request to the remote side.
     * @param {String} event RPC event name.
     * @param {Object} n Argument for the RPC. May be repeated.
     * @param {Function} cb Callback function. Optional. Must be the last argument.
     */
    this.on("rpc.**", function routeRPC() {
        var cb = null,
            method = this.event.substr(4), // remove "rpc."
            args = arguments.length === 1 ?
                    [arguments[0]] : Array.apply(null, arguments);

        if ("function" === typeof args[args.length - 1]) {
            // Last argument was a function,
            // so use this as a callback.
            cb = args.pop();
        }

        self.request(method, args, cb);
    });
};

/**
 * End this session and our associated socket.
 *
 * Removes all `rpc.**` listeners.
 *
 * Attempting to use this session after calling end may cause an error.
 *
 * @method end
 */
BlizzardSession.prototype.end = function () {
    this.removeAllListeners("rpc.**");
    this.socket.end();
    this.socket.destroySoon();
    this.requestCallbacks = null;
    this.requestMethods = null;
    this.streams = null;
    this.output = null;
};

/**
 * Create a {BlizzardNamespace}, which is a new evented context
 * that uses this session.
 *
 * @method createNamespace
 * @param {String} ns Namespace name.
 */
BlizzardSession.prototype.createNamespace = function (ns) {
    return new BlizzardNamespace(this, ns);
};

/**
 * Bridge a given EvemtEmitter's event to our session's RPC.
 *
 * @method outgoingBridge
 * @param {EventEmitter} emitter Source EventEmitter.
 * @param {String} event Event name.
 * @param {String} emitterEvent Optional event name for the source EventEmitter, if different.
 */
BlizzardSession.prototype.outgoingBridge = function (emitter, event, emitterEvent) {
    emitter.on(emitterEvent || event, this.emit.bind(this, "rpc." + event));
};

/**
 * Bridge an remote RPC event to the given EventEmitter.
 *
 * The remote RPC event's params (arguments) are unpacked
 * instead of given as an array in the first argument.
 * This makes an RPC event act like a local event.
 *
 * Unlike listeners to `request.*` events, the provided event
 * will not recieve a reply callback because the listener argument
 * list is variable. If you need to reply to a RPC request, listen
 * to the event on this object's request namespace instead,
 * taking care to unpack the first argument.
 *
 * @method incomingBridge
 * @param {EventEmitter} emitter Target EventEmitter.
 * @param {String} event Event name.
 * @param {String} emitterEvent Optional event name for the target EventEmitter, if different.
 */
BlizzardSession.prototype.incomingBridge = function (emitter, event, emitterEvent) {
    this.on("request." + event, function unpackArgs(remoteArgs, reply) {
        emitter.emit.apply(emitter, [emitterEvent || event].concat(remoteArgs));
    });
};

/**
 * Drain any buffered data to our socket.
 *
 * @method _socketDrain
 * @private
 * @param {Buffer} [data] Data to buffer if socket becomes unwritable.
 * @return {Boolean} True if socket remains writable, false otherwise.
 */
BlizzardSession.prototype._socketDrain = function (data) {
    if (this.socket &&
        this.socket.writable) {
        while (this.output.length) {
            if (!this.socket.writable) {
                if (data) {
                    this.output.push(data);
                }
                return false;
            }
            this.socket.write(this.output.shift());
        }
        return true;
    }
    return false;
};

/**
 * Write to our socket. If the socket is not writable,
 * the data is buffered until the next _socketWrite
 * or socket drain event.
 *
 * @method _socketWrite
 * @private
 * @param {Buffer} data Data to write.
 * @return {Boolean} True if write was successful, false if buffered.
 */
BlizzardSession.prototype._socketWrite = function (data) {
    if (data.length === 0) {
        return true;
    }

    if (this.socket &&
        this.socket.writable) {
        if (this._socketDrain(data)) {
            return this.socket.write(data);
        } else {
            return false;
        }
    } else if (this.output) {
        // this.output is null after end() is called
        this.output.push(data);
    }

    return false;
};

/**
 * Transfer a zero-length packet.
 *
 * @method xferRawZeroLength
 * @protected
 * @param {Number} type Packet type. Must be an 8-bit integer.
 * @param {Number} id Message ID. Must be a 32-bit integer.
 */
BlizzardSession.prototype.xferRawZeroLength = function (type, id) {
    assert(!isNaN(id), "ID must be a number.");

    var header = new Buffer(10);
    header.writeUInt8(BlizzardSession.MAGIC, 0);
    header.writeUInt8(type, 1);
    header.writeUInt32BE(id, 2);
    header.writeUInt32BE(0, 6);

    this._socketWrite(header);
};

/**
 * Transfer a packet with a given buffer.
 *
 * @method xferRaw
 * @protected
 * @param {Number} type Packet type. Must be an 8-bit integer.
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Buffer} buffer Packet payload.
 */
BlizzardSession.prototype.xferRaw = function (type, id, buffer) {
    assert(!isNaN(id), "ID must be a number.");
    assert(Buffer.isBuffer(buffer), "Buffer required.");

    var packet = new Buffer(10 + buffer.length);
    packet.writeUInt8(BlizzardSession.MAGIC, 0);
    packet.writeUInt8(type, 1);
    packet.writeUInt32BE(id, 2);
    packet.writeUInt32BE(buffer.length, 6);
    buffer.copy(packet, 10);

    this._socketWrite(packet);
};


/**
 * Transfer a JSONable object.
 *
 * @method xferObject
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Object} json Payload to be transformed into JSON.
 */
BlizzardSession.prototype.xferObject = function (id, json) {
    try {
        json = JSON.stringify(json);
    } catch (ex) {
        console.warn("[Blizzard] xferObject: Failed to stringify, dropping:", json);
        return;
    }

    this.xferRaw(BlizzardSession.TYPE_JSON,
        id, new Buffer(json, "utf8"));
};

/**
 * Transfer a buffer.
 *
 * @method xferBuffer
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Buffer} buffer Payload.
 */
BlizzardSession.prototype.xferBuffer = function (id, buffer) {
    this.xferRaw(BlizzardSession.TYPE_BUFFER_RESPONSE, id, buffer);
};

/**
 * Make an RPC request to the remote side.
 * Normally invoked by an `rpc.**` event.
 *
 * @method request
 * @protected
 * @param {String} method Method to call.
 * @param {Object} params Optional params for the method.
 * @param {Function} cb Optional callback.
 */
BlizzardSession.prototype.request = function (method, params, cb) {
    var id = 0,
        rpc = {
            method: method
        };

    if ("function" === typeof params) {
        // Called with method, cb -- params omitted.
        cb = params;
        params = null;
    }

    if (params) {
        rpc.params = params;
    }

    if (cb) {
        assert("function" === typeof cb, "Function expected for callback argument.");
        id = this.nextSequence();
        this.requestCallbacks[id] = cb;
        this.requestMethods[id] = method;
    }

    this.xferObject(id, rpc);
};

/**
 * Reply to a remote RPC with the given ID.
 * Normally called by the reply function passed to a `request.**` event.
 *
 * @method reply
 * @protected
 * @param {Number}
 * @param {Buffer|Object} message Payload.
 */
BlizzardSession.prototype.reply = function (id, message) {
    if (!id) {
        throw new Error("id required for reply");
    }
    if (Buffer.isBuffer(message)) {
        this.xferBuffer(id, message);
        // TODO - Streaming
        this.xferRawZeroLength(BlizzardSession.TYPE_BUFFER_RESPONSE, id);
    } else {
        this.xferObject(id, {
            "result": message
        });
    }
};

/**
 * Handle an error from the remote side.
 *
 * @method onFailure
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Number} code Error code.
 * @param {String} error Error message.
 */
BlizzardSession.prototype.onFailure = function (id, code, error) {
    if (id === 0) {
        // Unable to reply. Is this our fault?
        if (code === BlizzardSession.ERROR_INTERNAL) {
            // Crash the program.
            this.emit("error", error);
        }
        // Otherwise, do nothing.
    } else {
        // Reply with the error details.
        this.xferObject(id, {
            error: {
                code: code,
                message: error
            }
        });
    }
};

/**
 * Invoke an RPC from the remote side.
 * Fires an `rpc.**` event locally.
 *
 * @method invokeRPC
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Object} simpleError An object with code and message properties representing an error from the remote side.
 * @param {Object} result An array or an object representing the arguments to the RPC.
 */
BlizzardSession.prototype.invokeRPC = function (id, simpleError, result) {
    assert(id);

    var requestCallback = this.requestCallbacks[id],
        requestMethod = this.requestMethods[id],
        callbackArgs,
        errorMessage,
        error = null;


    if (simpleError) {
        errorMessage = "Remote error for method: " + requestMethod + ", message: ";
        // An object with code, message.
        if ("object" === typeof simpleError.message) {
            errorMessage += JSON.stringify(simpleError.message);
            error = new Error(errorMessage);
            error.error = simpleError.message;
        } else {
            errorMessage += simpleError.message;
            error = new Error(errorMessage);
        }
        error.code = simpleError.code;
    }

    if (requestCallback) {

        // requestCallback and requestMethod should
        // always be set in pairs.
        assert(requestMethod);

        // Free the callback.
        delete this.requestCallbacks[id];
        delete this.requestMethods[id];

        if (Array.isArray(result)) {
            // Treat the result as arguments.
            callbackArgs = result;
        } else {
            // Treat the result as a single argument.
            callbackArgs = [result];
        }

        // Error is always the first argument to the callback.
        callbackArgs.unshift(error);

        // Call the requestCallback with the
        // event name in its `this` context.
        requestCallback.apply({
            event: "rpc." + requestMethod
        }, callbackArgs);

    } else if (!error) {
        this.emit("fail", id, BlizzardSession.ERROR_INTERNAL, "Could not find callback for this ID.");
    }
    // If error exists, both sides do not know about this ID. Ignore.
    // Responding would cause a ERROR_INTERNAL loop.
};

/**
 * Handle incoming JSON.
 *
 * @method onIncomingJSON
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {String} jsonString Incoming JSON data.
 */
BlizzardSession.prototype.onIncomingJSON = function (id, jsonString) {
    var message;

    try {
        message = JSON.parse(jsonString);
    } catch (ex) {
        this.emit("fail", id,
            BlizzardSession.ERROR_PARSE,
            new Error("Unable to parse JSON: " +
                JSON.stringify(jsonString)));
        return;
    }

    if (message.length) {
        this.emit("fail", id, BlizzardSession.ERROR_INVALID, "Expected an object, got an array.");
    }

    this.emit("message", id, message);
};

/**
 * @event request.**
 * @description Fires when an RPC message is received from the remote side.
 * Fired by `onMessage`.
 * @param {Array} params Arguments from the remote event.
 * @param {Function} reply Reply function to respond to the RPC.
 * Note: the reply will only be sent if the remote side asked for a reply.
 * @param {Boolean} reply.err Error response, null otherwise.
 * @param {Object} reply.data Data response.
 */

/**
 * Handle an incoming message.
 *
 * @method onMessage
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Object} message Incoming message.
 */
BlizzardSession.prototype.onMessage = function (id, message) {
    var self = this,
        params = [],
        event = "request." + message.method;

    // Called by `request.{message.method}` listener.
    // Note: If the `reply` is an array, its contents will be
    // appended to the arguments list of the remote function.
    function requestCompleter(error, reply) {
        if (error) {
            self.emit("fail", id, BlizzardSession.ERROR_USER, error.message || error);
        } else if (id) {
            self.reply(id, reply);
        }
        // No ID means request() was called on the other end
        // without a callback. No response was desired.
    }

    if (message.method) {
        // The other side made an RPC to us.

        if (message.params) {
            params = message.params;
        }
        // No params? params will default to [].

        // Params will become the final arguments to
        // the `request.{message.method}` event.

        // Any listeners on request.{message.method}?
        if (self.listeners(event).length) {
            // Emit the request event with a fixed argument list.
            self.emit.call(self, event, params, requestCompleter);
        } else {
            self.emit("fail", id,
                BlizzardSession.ERROR_METHOD,
                "Method " + message.method + " not found.");
        }
    } else if (id) {
        // No method, but the packet contained an ID.
        // This must be a response to an earlier RPC.

        if (message.error) {
            self.invokeRPC(id, message.error);
        } else if (message.result) {
            self.invokeRPC(id, null, message.result);
        } else {
            self.emit("fail", id,
                BlizzardSession.ERROR_INVALID,
                "Messages with IDs must contain method, error, or result.");
        }
    } else {
        self.emit("fail", id,
            BlizzardSession.ERROR_INVALID,
            "Messages without IDs must contain method.");
    }
};

/**
 * Emit a message event by assembling all buffers
 * received for the given message ID.
 *
 * @method bufferComplete
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 */
BlizzardSession.prototype.bufferComplete = function (id) {
    var stream = this.streams[id],
        i = 0,
        offset = 0,
        length,
        buffer,
        finalBuffer;

    if (!stream) {
        this.emit("fail", id, BlizzardSession.ERROR_INVALID, "Got final packet for a stream that does not exist.");
        return;
    }

    // Free the stream.
    delete this.streams[id];

    finalBuffer = new Buffer(stream.length);

    for (length = stream.buffers.length; i < length; i += 1) {
        buffer = stream.buffers[i];
        buffer.copy(finalBuffer, offset);
        offset += buffer.length;
    }

    this.emit("message", id, {
        result: finalBuffer
    });
};

/**
 * Add the given buffer to the internal buffer list for this response ID.
 *
 * @method bufferPut
 * @protected
 * @param {Number} id Message ID. Must be a 32-bit integer.
 * @param {Buffer} buffer Data to append.
 */
BlizzardSession.prototype.bufferPut = function (id, buffer) {
    if (!this.streams[id]) {
        this.streams[id] = {
            buffers: [],
            length: 0
        };
    }

    this.streams[id].buffers.push(buffer);
    this.streams[id].length += buffer.length;
};

/**
 * Increment the internal sequence counter by 2
 * in preparation for the next message.
 *
 * @method nextSequence
 * @protected
 */
BlizzardSession.prototype.nextSequence = function () {
    this.sequence = this.sequence + 2;
    return this.sequence;
};

/**
 * Setup a parser on the given socket that will fire
 * events from incoming parsed packets:
 *
 *   - json
 *   - buffer
 *   - bufferComplete
 *   - ready
 *   - fail
 *
 * @method setupBinaryParser
 * @private
 * @param {Socket} socket Socket to parse.
 */
BlizzardSession.prototype.setupBinaryParser = function (socket) {
    var self = this;

    function parser(onPacket) {
        var buffer = null,
            type = null,
            offset = 0,
            payloadLength = 0,
            state = 0,
            id = 0;
        return function emitter(chunk) {
            var i = 0,
                emit = false,
                chunkLength = chunk.length,
                chunkPayloadLength,
                byte;
            for (; i < chunkLength; i += 1) {
                byte = chunk[i];
                switch (state) {
                // magic
                case 0:
                    if (byte === BlizzardSession.MAGIC) {
                        state = 1;
                    }
                    break;
                // type
                case 1:
                    type = byte;
                    state = 2;
                    break;
                // id - 4 bytes
                case 2:
                    id |= byte << 24;
                    state = 3;
                    break;
                case 3:
                    id |= byte << 16;
                    state = 4;
                    break;
                case 4:
                    id |= byte << 8;
                    state = 5;
                    break;
                case 5:
                    id |= byte;
                    state = 6;
                    break;
                // length - 4 bytes
                case 6:
                    payloadLength |= byte << 24;
                    state = 7;
                    break;
                case 7:
                    payloadLength |= byte << 16;
                    state = 8;
                    break;
                case 8:
                    payloadLength |= byte << 8;
                    state = 9;
                    break;
                case 9:
                    payloadLength |= byte;
                    if (payloadLength > 0) {
                        state = 10;
                        buffer = new Buffer(payloadLength);
                    } else {
                        emit = true;
                    }
                    break;
                // data
                case 10:
                    chunkPayloadLength = chunkLength - i;
                    if (chunkPayloadLength + offset >= payloadLength) {
                        emit = true;
                        chunkPayloadLength = payloadLength - offset;
                    }
                    chunk.copy(buffer, offset, i, i + chunkPayloadLength);
                    offset += chunkPayloadLength;
                    i += chunkPayloadLength - 1;
                    break;
                }
                if (emit) {
                    onPacket(type, id, buffer);
                    buffer = null;
                    type = null;
                    offset = 0;
                    payloadLength = 0;
                    state = 0;
                    id = 0;
                    emit = false;
                }
            }
        };
    }

    socket.on("data", parser(function (type, id, buffer) {
        if (type === BlizzardSession.TYPE_JSON) {
            /**
             * @event json
             * @protected
             * @description Fires when JSON is received from the remote side.
             * @param {Number} id Message ID. Must be a 32-bit integer.
             * @param {String} json UTF-8 JSON string.
             */
            self.emit("json", id, buffer.toString("utf8"));
        } else if (type === BlizzardSession.TYPE_BUFFER_RESPONSE) {
            if (!buffer) {
                /**
                 * @event bufferComplete
                 * @protected
                 * @description Fires when a buffer message has been completely received.
                 * @param {Number} id Message ID. Must be a 32-bit integer.
                 */
                self.emit("bufferComplete", id);
            } else {
                /**
                 * @event buffer
                 * @protected
                 * @description Fires when a buffer is available for the given message.
                 * Only a part of the message is available. The `bufferComplete` message
                 * will fire when the stream is complete.
                 * @param {Number} id Message ID. Must be a 32-bit integer.
                 * @param {Buffer} buffer Buffer payload.
                 */
                self.emit("buffer", id, buffer);
            }
        } else if (type === BlizzardSession.TYPE_HANDSHAKE) {
            /**
             * @event ready
             * @description Fires when the remote side is ready.
             */
            self.emit("ready");
        } else {
            /**
             * @event fail
             * @protected
             * @description Fires when a failure occurs. Handled by `onFailure`.
             * @param {Number} id Message ID. Must be a 32-bit integer.
             * @param {Number} code Error code.
             * @param {String} error Error message.
             */
            self.emit("fail", 0, BlizzardSession.ERROR_INVALID, "Unknown packet type.");
        }
    }));
};

module.exports = BlizzardSession;

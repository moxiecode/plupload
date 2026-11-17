"use strict";

var util = require("util");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

function BlizzardNamespace(session, ns) {
    this.session = session;
    this.ns = ns;

    EventEmitter2.call(this, {
        wildcard: true
    });

    this.rpcListener = null;

    this.sessionRequestEvent = null;
    this.sessionRequestListener = null;

    this.bound = false;

    this.bind();
}

util.inherits(BlizzardNamespace, EventEmitter2);

BlizzardNamespace.prototype.outgoingBridge = function (emitter, event, emitterEvent) {
    emitter.on(emitterEvent || event, this.emit.bind(this, "rpc." + event));
};

BlizzardNamespace.prototype.incomingBridge = function (emitter, event, emitterEvent) {
    this.on("request." + event, function unpackArgs(remoteArgs, reply) {
        emitter.emit.apply(emitter, [emitterEvent || event].concat(remoteArgs));
    });
};

BlizzardNamespace.prototype.bind = function () {
    var self = this;

    if (self.bound) {
        return false;
    }

    if (process.env.BLIZZARD_DEBUG) {
        this.onAny(function () {
            console.log.apply(this, [
                "[BlizzardNamespace]",
                "[" + self.ns + "]",
                self.session.instigator ? "<--" : "-->",
                this.event
            ].concat(Array.prototype.slice.call(arguments, 0)));
        });
    }

    // Translate our rpc.** event an rpc.ns.** style request.
    self.rpcListener = function routeRPC() {
        var cb = null,
            method = this.event.substr(4), // remove "rpc."
            args = arguments.length === 1 ?
                    [arguments[0]] : Array.apply(null, arguments);

        if ("function" === typeof args[args.length - 1]) {
            // Last argument was a function,
            // so use this as a callback.
            cb = args.pop();
        }

        self.session.request(self.ns + "." + method, args, cb);
    };

    self.sessionRequestEvent = ["request", self.ns, "**"];

    // Translate session request.ns.event to our request.event.
    self.sessionRequestListener = function routeRequest() {
        var eventParts = this.event.split("."),
            // Remove the namespace.
            selfEvent,
            emitArgs = arguments.length === 1 ?
                    [arguments[0]] : Array.apply(null, arguments);

        eventParts.splice(1, 1);
        selfEvent = eventParts.join(".");

        emitArgs.unshift(selfEvent);

        self.emit.apply(self, emitArgs);
    };

    self.endListener = self.unbind.bind(self);

    self.on("rpc.**", self.rpcListener);
    self.session.on(self.sessionRequestEvent, self.sessionRequestListener);
    self.session.once("end", self.endListener);

    self.bound = true;

    return true;
};

BlizzardNamespace.prototype.unbind = function () {
    if (!this.bound) {
        return false;
    }

    this.emit("end");

    this.removeListener("rpc.**", this.rpcListener);
    this.session.removeListener(this.sessionRequestEvent, this.sessionRequestListener);
    this.session.removeListener("end", this.endListener);

    this.bound = false;

    return true;
};

module.exports = BlizzardNamespace;

"use strict";

var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var periodicRegistry = require("./periodic-registry").getRegistry();

var parseUA = require("./ua");
var makeURLFromComponents = require("./url-builder");

// TODO: Periodic GC of missing Agents.
// var periodic = require("./periodic");

/**
 * An Agent represents a web browser.
 *
 * @class Agent
 * @constructor
 * @inherits EventEmitter2
 * @param {AllAgents} allAgents Agent repository associated with this Agent.
 * @param {Object} registration Object with `id` and `ua` properties.
 */
function Agent(allAgents, registration) {
    this.allAgents = allAgents;

    this.id = registration.id;
    this.ua = registration.ua;

    this.ttl = registration.ttl || Agent.TTL;

    if (!this.id) {
        throw new Error("ID required.");
    } else if (!this.ua) {
        throw new Error("UA required.");
    }

    this.name = parseUA(this.ua);

    this.seen = new Date();
    this.lastNavigate = new Date();
    this.connected = true;

    this.target = null;
    this.currentUrl = null;

    this.remoteAddress = "<unknown address>";

    EventEmitter2.call(this);

    // The this.socketEmitter EventYoshi should
    // contain at most 1 Socket.io socket.
    //
    // We use an EventYoshi so that event
    // listeners for sockets only need to be
    // setup once. We can then connect and
    // disconnect the Agent's socket as needed.
    this.socketEmitter = new EventYoshi();
    this.socketEmitterQueue = [];

    // Same thing for Target. Only
    // 1 Target is ever used.
    this.targetEmitter = new EventYoshi();

    this.setupEvents();

    this.lastHealthCheck = new Date(0);
    this.startPeriodicHealthCheck();
    this.unresponsivePings = 0;
}

util.inherits(Agent, EventEmitter2);

/**
 * TTL for Agents in milliseconds.
 *
 * Agents are discared if they do not respond
 * for this many milliseconds.
 *
 * @property TTL
 * @type Number
 * @default 45000
 */
Agent.TTL = 200000;

/**
 * The Agent emitted a heartbeat.
 *
 * @event beat
 */

/**
 * The Agent reported test results.
 *
 * @event results
 * @param {Object} YUI Test results object.
 */

/**
 * The Agent reported a JavaScript error.
 *
 * @event scriptError
 * @param {Object} Error-like object.
 */

/**
 * The Agent became unable to run tests.
 *
 * @event agentError
 * @param {Object} Error-like object.
 */

/**
 * The Agent disconnected. This event is normal during
 * test runs as the Agent navigates to a new test.
 *
 * @event agentDisconnect
 */

/**
 * The Agent was seen, e.g. by connecting.
 *
 * @event agentSeen
 * @param {String} name Agent name.
 */

/**
 * The current queue of test URLs was aborted.
 *
 * @event abort
 */

/**
 * Setup events on `this.socketEmitter`.
 *
 * @method setupEvents
 * @private
 */
Agent.prototype.setupEvents = function () {
    var self = this;

    // Kickoff.
    self.targetEmitter.on("dispatch", self.next.bind(self));

    // Cleanup.
    self.targetEmitter.on("complete", self.removeTarget.bind(self));

    // Proxy to SockJS end()
    self.socketEmitter.proxy("end");

    self.socketEmitter.on("pong", function () {
        self.ping();
    });

    self.socketEmitter.on("close", function () {
        self.socketEmitter.remove(this.child);
    });

    self.socketEmitter.on("results", function (data) {
        self.emit("results", data);
    });

    self.socketEmitter.on("scriptError", function (data) {
        self.emit("scriptError", data);
    });

    self.socketEmitter.on("heartbeat", function () {
        self.ping();
    });

    self.socketEmitter.on("beat", function () {
        self.ping();
        self.emit("beat");
    });
};

/**
 * Get this agent's human-readable name.
 *
 * @method getName
 * @return {String} Agent name.
 */
Agent.prototype.getName = function () {
    return this.name + " from " + this.remoteAddress;
};

Agent.prototype.healthCheck = function agentHealthCheck() {
    if (this.currentTestShouldTimeout()) {
        this.giveUpOnCurrentTest();
    } else if (this.shouldUnload()) {
        this.unload();
    } else if (!this.seenSince(new Date(this.lastHealthCheck.getTime() - 60000))) {
        this.sendPing();
    }
    this.lastHealthCheck = new Date();
};

/**
 * @method currentTestShouldTimeout
 * @private
 * @return {Boolean}
 */
Agent.prototype.currentTestShouldTimeout = function () {
    return (
        this.target &&
        this.currentTest &&
        !this.currentTest.isNull() &&
        this.unresponsivePings === 0 &&
        (Date.now() - this.lastNavigate.getTime()) > this.getTimeoutMilliseconds()
    );
};

/**
 * @method startPeriodicHealthCheck
 * @private
 */
Agent.prototype.startPeriodicHealthCheck = function () {
    this.lastHealthCheck = new Date();
    periodicRegistry.add("agent-health-" + this.id, this.healthCheck.bind(this), 1000);
};

/**
 * @method stopPeriodicHealthCheck
 * @private
 */
Agent.prototype.stopPeriodicHealthCheck = function () {
    periodicRegistry.remove("agent-health-" + this.id);
};

/**
 * Provide a socket for communication with
 * the Agent.
 *
 * @method connect
 * @param {SimpleEvents} socket Instance of SimpleEvents
 * for this socket connection, itself an EventEmitter2 instance.
 * @return {Boolean} False if connection failed because a socket
 * is already connected. True otherwise.
 */
Agent.prototype.connect = function (socket) {
    var self = this,
        queuedEvents = self.socketEmitterQueue.slice(),
        existingConnection = self.socketEmitter.children.length !== 0;

    self.ping();

    if (existingConnection) {
        // Duplicate ID.
        // The last socket connection may have ended abruptly.
        // Destroy the other connections in favor of this one.
        self.socketEmitter.children.forEach(function (emitter) {
            emitter.socket.end();
            self.socketEmitter.remove(emitter);
        });
    }

    self.socketEmitter.add(socket);
    self.remoteAddress = socket.socket.remoteAddress;

    if (queuedEvents.length) {
        self.socketEmitterQueue = [];
        queuedEvents.forEach(function (args) {
            self.socketEmitter.emit.apply(self.socketEmitter, args);
        });
    }

    return true;
};

Agent.prototype.setTarget = function (target) {
    if (!this.target) {
        this.target = target;
        this.targetEmitter.add(target);
        this.debug("Added to Target", target.id);

        if (this.target.tests.totalPending() > 0) {
            // Tests are already available.
            this.next();
        }
    }
};

Agent.prototype.removeTarget = function () {
    if (this.target) {
        this.targetEmitter.remove(this.target);
        this.target = null;
        this.debug("Removed from Target");
    }
};

/**
 * Get the value for the next URL,
 * removing it from the Target's queue.
 *
 * Fires our complete event when no more
 * URLs are in the queue, then returns
 * the capture page URL.
 *
 * @method nextURL
 * @return {String} Next test URL, or capture page URL.
 */
Agent.prototype.nextURL = function () {
    var url = this.allAgents.hub.mountpoint,
        test;

    // this.target should be defined
    // if we're calling this function.

    if (this.target) {
        test = this.target.nextTest();
        this.currentTest = test;
        this.currentTest.setExecuting(true);
        this.lastNavigate = new Date();
        url = test.getUrlForAgentId(this.id);
    } else {
        this.currentTest = null;
        // This agent is no longer a part of an Target.
        // This happens when a Batch is ended, esp.
        // when it's aborted.
        //
        // Go back to the capture page keeping
        // the same agentId.
        url = makeURLFromComponents(url, this.id);
    }

    this.currentUrl = url;

    return url;
};

/**
 * Queue an event to emit on the socketEmitter
 * once a socket is added to the socketEmitter
 * EventYoshi. If a socket is ready, emit
 * the event immediately.
 *
 * @method queueSocketEmit
 * @protected
 * @param {String} event Event name.
 * @param {Object} data Event payload.
 */
Agent.prototype.queueSocketEmit = function (event, data) {
    // Is anybody listening on the socketEmitter?
    if (this.socketEmitter.children.length > 0) {
        this.socketEmitter.emit(event, data);
    } else {
        this.socketEmitterQueue.push([event, data]);
    }
};

/**
 * Queue an event to navigate the Agent
 * to the next URL.
 *
 * @method next
 * @return {Boolean} True if the browser is waiting, false otherwise
 */
Agent.prototype.next = function () {
    this.queueSocketEmit("navigate", this.nextURL());
    return !this.waiting;
};

/**
 * Is this browser running tests?
 *
 * @method available
 * @return {Boolean} True if the browser idle, false if it is running tests.
 */
Agent.prototype.available = function () {
    return !this.target;
};

/**
 * TODO
 *
 * @method unload
 */
Agent.prototype.unload = function () {
    this.debug("disconnecting agent! stack:", (new Error()).stack);
    if (this.currentTest) {
        this.currentTest.setExecuting(false);
    }
    this.stopPeriodicHealthCheck();
    this.connected = false;
    this.seen = new Date(0);
    this.socketEmitter.end();
    this.emit("disconnect");
};

/**
 * Abort running the current test
 * and advance to the next test.
 *
 * @method giveUpOnCurrentTest
 */
Agent.prototype.giveUpOnCurrentTest = function () {
    this.emit("abort");
    this.emit("agentError", {
        message: "Agent timed out running test: " + this.currentUrl
    });
    if (this.currentTest) {
        this.currentTest.setResults({});
        this.currentTest.setExecuting(false);
    }
    this.next();
};

/**
 * Record that this browser is
 * still active.
 *
 * @method ping
 */
Agent.prototype.ping = function () {
    this.unresponsivePings = 0;
    this.connected = true;
    this.seen = new Date();
    this.emit("beat");
};

/**
 * Ask the browser to respond: is it still connected?
 *
 * @method sendPing
 */
Agent.prototype.sendPing = function () {
    this.unresponsivePings += 1;
    this.queueSocketEmit("ping");
};

/**
 * Determine if the browser was seen since the given time.
 *
 * @method seenSince
 * @param {Date} since Last date.
 * @return {Boolean} True if browser was seen, false otherwise.
 */
Agent.prototype.seenSince = function (since) {
    return this.seen.getTime() > since.getTime();
};

/**
 * Get the current timeout in milliseconds.
 *
 * @method getTimeoutMilliseconds
 * @private
 * @return {Number} Timeout in milliseconds.
 */
Agent.prototype.getTimeoutMilliseconds = function () {
    var ttl = this.ttl;

    if (this.target && this.target.testSpec) {
        ttl = this.target.testSpec.getTimeoutMilliseconds();
    }

    return ttl;
};

/**
 * Check if this Agent should be unloaded,
 * meaning that it has not pinged us for too long.
 *
 * @method shouldUnload
 * @return {Boolean} True if the Agent is should unload, false otherwise.
 */
Agent.prototype.shouldUnload = function () {
    return this.unresponsivePings !== 0 && this.unresponsivePings > 3;
};

module.exports = Agent;

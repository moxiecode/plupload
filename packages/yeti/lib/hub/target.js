"use strict";

var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var parseUA = require("./ua");
var makeURLFromComponents = require("./url-builder");

var NullTests = require("./null-tests");

/**
 * An Target is a collection of Agents
 * that share the load of testing a Batch.
 *
 * @class Target
 * @constructor
 * @inherits EventEmitter2
 * @param {Batch} batch Batch associated with this Target.
 * @param {String} ua User-Agent string for this Target.
 */
function Target(batch, ua) {
    this.batch = batch;
    this.agents = {};

    this.id = String(Date.now()) + String(Math.random() * 0x100000 | 0);
    this.ua = ua;
    this.name = parseUA(ua);

    EventEmitter2.call(this);

    this.batchId = null;
    this.testSpec = null;
    this.nullTests = new NullTests.createForMountpoint(batch.allBatches.hub.mountpoint);
    this.tests = this.nullTests;

    this.agentEmitter = new EventYoshi();
    this.agentEmitter.proxy("setTarget");
    this.setupEvents();
}

util.inherits(Target, EventEmitter2);

Target.prototype.isAgentAllowed = function (agent) {
    var permittedIds;
    if (agent.ua !== this.ua) { return false; }
    permittedIds = this.batch.getAgentWhitelist();
    if (!permittedIds.length) { return true; }
    return permittedIds.some(function (id) {
        return id === agent.id;
    });
};

Target.prototype.appendAgentIfAllowed = function (agent) {
    if (this.isAgentAllowed(agent)) {
        this.appendAgent(agent);
        return true;
    }
    return false;
};

Target.prototype.appendAgent = function (agent) {
    agent.pipeLog(this);
    agent.setTarget(this);
    this.agents[agent.id] = agent;
    this.agentEmitter.add(agent);
};

/**
 * Append agents to agent list.
 *
 * @param {Agent[]} Array of Agent objects.
 */
Target.prototype.appendAgents = function (agents) {
    agents.forEach(this.appendAgentIfAllowed.bind(this));
};

/**
 * Get this agent's human-readable name.
 *
 * @method getName
 * @return {String} Agent name.
 */
Target.prototype.getName = function () {
    return this.name;
};

/**
 * Get an Agent from this group.
 *
 * @param {String} agentId Agent ID.
 * @return {Agent} Agent object.
 */
Target.prototype.getAgent = function (agentId) {
    return this.agents[agentId];
};

/**
 * Get this agent's ID.
 *
 * @method getId
 * @return {String} Numeric agent ID.
 */
Target.prototype.getId = function () {
    return this.id;
};

/**
 * Setup events.
 *
 * @method setupEvents
 * @private
 */
Target.prototype.setupEvents = function () {
    var self = this;

    self.agentEmitter.on("results", function (data) {
        var test = self.tests.getByUrl(data.url);
        if (!test.isExecuting()) { return; }
        test.setResults(data);
        test.setExecuting(false);
        self.emit("results", data);
        this.child.next();
    });
    self.agentEmitter.on("scriptError", function (data) {
        var test = self.tests.getByUrl(data.url);
        // TODO: Set results should include error message.
        data.url = test.location;
        self.emit("scriptError", data);
    });
    self.agentEmitter.on("beat", self.emit.bind(self, "beat"));
    self.agentEmitter.on("agentError", self.emit.bind(self, "agentError"));
    // TODO handle disconnects

    self.agentEmitter.on("disconnect", function () {
        self.emit("disconnect", this.child);
        self.agentEmitter.remove(this.child);
    });
};

/**
 * Get the next Test.
 *
 * Fires our complete event when no more
 * URLs are in the queue, then returns
 * the capture page URL.
 *
 * @method nextTest
 * @param {String} agentId Agent ID.
 * @return {Test} Next test. May be a NullTest if we're done.
 */
Target.prototype.nextTest = function (agentId) {
    if (this.tests.didComplete()) {
        this.emit("complete");
        this.batchId = null;
    }

    this.emit("progress", {
        total: this.tests.totalSubmitted(),
        current: this.tests.totalSubmitted() - this.tests.totalPending()
    });

    return this.tests.next();
};

/**
 * Set the URL queue to the given URL array
 * and advance the browser to the first test.
 *
 * @method dispatch
 * @param {String} batchId Batch ID.
 * @param {TestSpecification} testSpec Test specification.
 */
Target.prototype.dispatch = function (batchId, testSpec) {
    this.batchId = batchId;
    this.testSpec = testSpec;
    this.ttl = testSpec.timeout * 1000;
    this.tests = testSpec.createTests();
    this.debug("Emit dispatch for batchId", batchId);
    this.emit("dispatch", batchId);

};

module.exports = Target;

"use strict";

var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var Agent = require("./agent");
var Target = require("./target");

var makeURLFromComponents = require("./url-builder");

/**
 * @class AllAgents
 * @constructor
 * @inherits EventEmitter2
 * @param {Hub} hub Hub associated with this object.
 */
function AllAgents(hub) {
    this.hub = hub;
    this.agents = {};
    this.boundTargets = {};
    EventEmitter2.call(this, {
        verbose: true
    });
}

util.inherits(AllAgents, EventEmitter2);

AllAgents.prototype.bindTarget = function (target) {
    this.debug("bindTarget", target.id);

    target.pipeLog(this);

    target.on("complete", this.unbindTarget.bind(this, target));

    this.boundTargets[target.id] = target;

};

AllAgents.prototype.unbindTarget = function (target) {
    delete this.boundTargets[target.id];
};

/**
 * Get all Agents matching the given ids.
 *
 * @method getAllById
 * @param {String[]} agentIds
 * @return {Agent[]} Matching Agents.
 */
AllAgents.prototype.getAllById = function (agentIds) {
    return this.getAgents().filter(function (agent) {
        return agentIds.some(function (agentId) {
            return agent.id === agentId;
        });
    });
};

/**
 * Get all Agents marked as available.
 *
 * @method getAvailableAgents
 * @return {Agent[]} Agents marked available.
 */
AllAgents.prototype.getAvailableAgents = function () {
    return this.getAgents().filter(function (agent) {
        return agent.available();
    });
};

/**
 * Create new Target objects for the given Agents
 * grouped by their User-Agent string.
 *
 * Side-effect: This will make all given agents unavailable
 * to prepare for binding to a Batch.
 *
 * @method createBatchTargetsFromAgents
 * @return {Target[]} Targets.
 */
AllAgents.prototype.createBatchTargetsFromAgents = function (batch, agents) {
    var self = this,
        agentsByUA = {},
        targets = [];

    agents.forEach(function (agent) {
        if (!(agent.ua in agentsByUA)) {
            agentsByUA[agent.ua] = [];
        }

        agentsByUA[agent.ua].push(agent);
    });

    Object.keys(agentsByUA).forEach(function (ua) {
        var target,
            agentsForUA = agentsByUA[ua];

        target = new Target(batch, ua);
        target.appendAgents(agentsForUA);

        self.bindTarget(target);

        targets.push(target);
    });

    return targets;
};

/**
 * Get all Agents.
 *
 * @method getAgents
 * @return {Agent[]} Agents.
 */
AllAgents.prototype.getAgents = function () {
    var out = [],
        self = this;
    Object.keys(self.agents).forEach(function (id) {
        out.push(self.agents[id]);
    });
    return out;
};

/**
 * Get an Agent by ID.
 *
 * @method getAgent
 * @param {Number} id Agent ID.
 * @return {Agent} The matching agent.
 */
AllAgents.prototype.getAgent = function (id) {
    return this.agents[id];
};

AllAgents.prototype.removeAgent = function (id) {
    var agent = this.agents[id];

    if (agent) {
        agent.unload();
        delete this.agents[id];
    }

    return !!agent;
};

/**
 * Append this Agent to an active Target,
 * if available. This allows a new Agent to
 * join a Batch that is already in progress.
 *
 * @method findTargetForNewAgent
 * @private
 * @param {Agent} agent Agent to add.
 */
AllAgents.prototype.findTargetForNewAgent = function (agent) {
    var self = this,
        boundTargets = this.boundTargets,
        target;

    Object.keys(boundTargets).forEach(function (targetId) {
        target = boundTargets[targetId];
        target.appendAgentIfAllowed(agent);
    });
};

/**
 * Connect the given socket and UA string
 * to the Agent instance identified by the
 * given ID.
 *
 * @method connectAgent
 * @param {Object} message Registration data.
 * @param {String} message.agentId Agent ID.
 * @param {String} [message.ua] User-Agent.
 * @param {SimpleEvents} socket Socket.
 */
AllAgents.prototype.connectAgent = function (message, socket) {
    var self = this,
        id = message.agentId,
        ua = message.ua,
        firstConnect = false,
        agent = self.agents[id],
        mountpoint = self.hub.mountpoint;

    if (!id) {
        throw new Error("ID required.");
    } else if (!socket) {
        throw new Error("Socket required.");
    }

    if (agent) {
        agent.connect(socket);
    } else if (ua) {
        firstConnect = true;
        agent = self.agents[id] = new Agent(self, {
            id: id,
            ua: ua
        });
        agent.once("disconnect", function () {
            delete self.agents[agent.id];
            self.emit("agentDisconnect", agent.getName());
        });
        agent.pipeLog(self);
        agent.connect(socket);
        self.findTargetForNewAgent(agent);
    } else {
        // First-time connection from an injected
        // page instead of the capture page.
        socket.emit("navigate", makeURLFromComponents(mountpoint, id));
        return;
    }

    if (firstConnect) {
        // XXX Serialize the agent to JSON.
        self.emit("agentConnect", agent.getName());
        self.emit("newAgent", agent);
    }

    self.emit("agentSeen", agent.getName());
};

module.exports = AllAgents;

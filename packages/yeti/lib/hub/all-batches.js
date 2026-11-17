"use strict";

var Batch = require("./batch");

/**
 * AllBatches keeps track of Batch objects on behalf of a Hub.
 *
 * @class AllBatches
 * @constructor
 * @param {Hub} hub Hub object for agentManager and mountpoint properties.
 */
function AllBatches(hub) {
    this.batches = {};
    this.hub = hub;
    this.allAgents = hub.allAgents;
}

AllBatches.prototype.newId = function () {
    return String(Date.now()) + String(Math.random() * 0x100000 | 0);
};

AllBatches.prototype.destroyBatch = function (id) {
    this.batches[id].destroy();
    delete this.batches[id];
};

/**
 * Create a new Batch.
 *
 * @param {BlizzardSession} session Hub session.
 * @param {Object} spec Test specification. (see `Client.createBatch()`).
 * @param {Function} reply Blizzard reply callback.
 */
AllBatches.prototype.createBatch = function (session, spec, reply) {
    var batch,
        options = {};

    options.spec = spec;
    options.allBatches = this;
    options.id = this.newId();
    options.session = session;

    batch = new Batch(options);

    this.batches[options.id] = batch;

    batch.pipeLog(this.hub);

    batch.batchSession.once("end", this.destroyBatch.bind(this, options.id));

    if (options.spec.launchBrowsers) {
        batch.launchAndDispatch(reply);
    } else {
        reply(null, options.id);
        batch.dispatch();
    }
};

AllBatches.prototype.getBatch = function (id) {
    return this.batches[id];
};

module.exports = AllBatches;

"use strict";

var assert = require("assert");
var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var TestSpecification = require("./test-specification");
var TestServer = require("./http/test-server");

var WebDriverCollection = require("./webdriver-collection");

/**
 * A Batch represents a collection of tests on the Hub.
 *
 * @class Batch
 * @constructor
 * @param {Object} options Options
 * @param {AllBatches} options.allBatches
 * @param {Number} options.id Batch ID.
 * @param {BlizzardSession} options.session Hub session.
 * @param {Object} options.spec Test specification, see constructor for TestSpecification.
 */
function Batch(options) {
    this.allBatches = options.allBatches;
    this.id = options.id;
    this.session = options.session;

    var mountpoint = this.allBatches.hub.mountpoint;

    if (mountpoint === "/") {
        mountpoint = "";
    }

    options.spec.mountpoint = mountpoint;
    options.spec.batchId = options.id;
    this.spec = new TestSpecification(options.spec);

    this.testServer = new TestServer(
        '<script src="' + mountpoint + '/agent/public/inject.js"></script>'
    );

    EventEmitter2.call(this);

    this.batchSession = this.session.createNamespace("batch" + this.id);

    this.targets = {};
    this.runningTargets = {};

    this.targetEmitter = new EventYoshi();

    this.setupAgentEmitter();
    this.setupCleanupEvents();

    this.requestedCapabilities = options.requestedCapabilities;

    this.agentIdWhitelist = {};
}

util.inherits(Batch, EventEmitter2);

/**
 * Prepare to handle the end of our Yeti Client session.
 *
 * @method setupCleanupEvents
 * @private
 */
Batch.prototype.setupCleanupEvents = function () {
    var self = this;

    // Our Yeti Client, who has our test data, has died.
    self.session.on("end", function handleDeadClient() {
        // TODO: Place into an abort() method.

        self.destroy();

    });
};

Batch.prototype.report = function (event, target, data) {
    this.batchSession.emit("rpc." + event, target.getName(), data);
};

Batch.prototype.destroy = function () {
    var self = this;

    if (self.destroyed) {
        return;
    }

    function completer() {
        self.emit("end");
        self.batchSession.emit("rpc.end");
        self.batchSession.unbind();
    }

    self.destroyed = true;

    // Return all browsers to the capture page.
    // Important: remove targetEmitter's targets
    Object.keys(self.runningTargets).forEach(function unbind(id) {
        var target = self.targets[id];

        self.targetEmitter.remove(target);
        target.dispatch(self.id, TestSpecification.empty());
    });

    if (self.managedBrowsers) {
        self.managedBrowsers.quit(completer);
        delete self.managedBrowsers;
    } else {
        completer();
    }

    self.runningTargets = null;
    self.targets = null;
};

Batch.prototype.completeTarget = function (target) {
    var id = target.getId();

    delete this.runningTargets[id];

    this.targetEmitter.remove(target);

    if (Object.keys(this.runningTargets).length === 0) {
        this.emit("complete");
        this.report("complete", target);
        this.destroy();
    }
};

Batch.prototype.proxyEvent = function (yoshiEvent, selfEvent) {
    var self = this;

    if (!selfEvent) {
        selfEvent = yoshiEvent;
    }

    assert(self.targetEmitter.listeners(yoshiEvent).length === 0,
        "This event was already proxied. EventYoshi cannot handle more than 1 listener.");

    self.targetEmitter.on(yoshiEvent, function (data) {
        // Send the event over the wire first.
        // Then handle it ourselves. If we don't,
        // complete could be sent before targetComplete.
        self.report(selfEvent, this.child, data);
        self.emit(selfEvent, this.child, data);
    });
};

Batch.prototype.setupAgentEmitter = function () {
    var self = this;

    // Proxy these events from Targets
    // to our BlizzardSession.
    // TODO: Update Client to use these new events
    //       Update docs to use these new events
    //       Remove legacy events after 0.2.x
    /*
     * XXX Unable to use these because of a bug in EventYoshi, see below.
    this.proxyEvent("complete", "targetComplete");
    this.proxyEvent("results", "targetResult");
    this.proxyEvent("beat", "targetBeat");
    this.proxyEvent("progress", "targetProgress");
    this.proxyEvent("agentError", "targetError"); // FIXME: Change target to emit targetError?
    this.proxyEvent("disconnect", "targetDisconnect");
    this.proxyEvent("scriptError", "targetScriptError");
    */

    // LEGACY EVENT HANDLERS
    // Targets used to be called AgentGroups,
    // which used to be not groupable at all and
    // were simply Agents. Provide these events
    // for 0.2.x API compatibility.
    this.proxyEvent("complete", "agentComplete");
    this.proxyEvent("results", "agentResult");
    this.proxyEvent("beat", "agentBeat");
    this.proxyEvent("progress", "agentProgress");
    this.proxyEvent("agentError", "agentError");
    this.proxyEvent("disconnect", "agentDisconnect");
    this.proxyEvent("scriptError", "agentScriptError");

    // Attaching multiple .on listeners to the targetEmitter
    // can trigger a bug in eventyoshi@0.1.2, so here we
    // listen to our re-emitted agentComplete event setup
    // earlier by proxyEvent.
    self.on("agentComplete", function (target) {
        self.completeTarget(target);
    });
    // This event means one browser disconnected,
    // perhaps not the entire target.
    self.on("agentDisconnect", function (target, agent) {
        if (self.managedBrowsers) {
            self.managedBrowsers.restart(agent.id, function (err) {
                if (err) { console.warn("[Yeti] Unable to restart browser", agent.ua, err); }
            });
        }
    });
};

Batch.prototype.getId = function () {
    return this.id;
};

Batch.prototype.allowAgentId = function (id) {
    this.agentIdWhitelist[id] = 1;
};

Batch.prototype.disallowAgentId = function (id) {
    delete this.agentIdWhitelist[id];
};

Batch.prototype.getAgentWhitelist = function () {
    return Object.keys(this.agentIdWhitelist);
};

Batch.prototype.launchAndDispatch = function (reply) {
    var self = this,
        address,
        remote,
        queue;

    self.managedBrowsers = new WebDriverCollection({
        batch: self,
        hub: self.allBatches.hub,
        browsers: self.spec.launchBrowsers,
        webdriver: self.spec.webdriver
    });

    self.managedBrowsers.launch(function (err) {
        reply(err, self.id);
        // TODO destroy self on error
        self.dispatch();
    });
};

Batch.prototype.dispatch = function () {
    if (this.destroyed) {
        return false;
    }

    // Freeze the current available targets.
    // TODO: Only select targets asked for.

    var targets,
        agents,
        allAgents = this.allBatches.allAgents,
        targetNames = [],
        mountpoint = this.allBatches.hub.mountpoint,
        self = this;

    if (self.managedBrowsers) {
        agents = allAgents.getAllById(self.managedBrowsers.getAllAgentIds());
    } else {
        agents = allAgents.getAvailableAgents();
    }

    targets = allAgents.createBatchTargetsFromAgents(self, agents);

    targetNames = targets.map(function (target) {
        return target.getName();
    });

    self.batchSession.emit("rpc.dispatch", targetNames);

    self.debug("dispatch targets:", targets);

    targets.forEach(function (target) {
        var id = target.getId();

        if (self.destroyed) {
            // We were destroyed on the same tick.
            return;
        }

        self.targets[id] = target;
        self.runningTargets[id] = true;

        self.targetEmitter.add(target);

        allAgents.bindTarget(target);

        target.dispatch(self.id, self.spec);
    });

};

Batch.prototype.getFile = function (filename, cb) {
    this.batchSession.emit("rpc.clientFile", filename, cb);
};

Batch.prototype.getAgent = function (agentId) {
    var targetId,
        agent;

    for (targetId in this.targets) {
        agent = this.targets[targetId].getAgent(agentId);
        if (agent) {
            break;
        }
    }

    return agent;
};

Batch.prototype.handleFileRequest = function (server, agentId, filename) {
    var agent,
        fileInBatch,
        batch = this;

    if (agentId) {
        agent = batch.getAgent(agentId);
    }

    fileInBatch = batch.spec.tests.some(function (test) {
        return test === filename;
    });

    this.getFile(filename, function (err, buffer) {
        if (err) {
            if (agent) {
                // If this file is in the current test batch,
                // redirect to the next test.
                // Otherwise, send a 404.
                // Note: calling nextURL has side effects
                // and it may fire the complete event.
                if (fileInBatch) {
                    batch.report("agentError", agent, {
                        message: "Unable to serve the test: " + filename
                    });
                    if (agent.target) {
                        agent.target.tests.getByUrl(filename).setResults({});
                    }
                    server.res.writeHead(302, {
                        "Location": agent.nextURL()
                    });
                    server.res.end();
                } else {
                    batch.report("agentPedanticError", agent, {
                        message: "Unable to serve the file: " + filename + ", ignoring"
                    });
                    server.res.message(404);
                }
            } else {
                server.res.message(500, "Unable to locate the requested agent.");
            }
            return;
        }

        if (agent) {
            batch.debug("Recording ping for agentId =", agentId, "for file =", filename);
            agent.ping();
        }

        batch.testServer.serve(server, filename, fileInBatch, buffer);
    });
};

module.exports = Batch;

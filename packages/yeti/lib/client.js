/**
 * Yeti Hub Client.
 * @module client
 */

"use strict";

var fs = require("graceful-fs");
var path = require("path");
var util = require("util");
var shallowCopy = require("./shallow-copy");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

/**
 * The ClientBatch represents a batch on the Hub.
 *
 * @class ClientBatch
 * @constructor
 * @extends EventEmitter2
 * @param {BlizzardSession} session Connected Blizzard session to the Hub.
 * @param {Object} options Options (see `Client.createBatch()`).
 */
function ClientBatch(session, options) {
    var basedir = options.basedir,
        tests = options.tests;

    if (!basedir && options.useProxy) {
        throw new Error("Basedir required.");
    }

    if (basedir && (basedir !== path.resolve(basedir))) {
        throw new Error("Basedir is not an absolute path!");
    }

    if (!Array.isArray(tests)) {
        throw new Error("Array of tests required.");
    }

    EventEmitter2.call(this);

    this.session = session;
    this.basedir = basedir;
    this.tests = tests;

    this.id = null;
    this.batchSession = null;

    // Setup our events.
    this.once("ack", this.onAck.bind(this));

    // Remove options.basedir before sending to the server.
    options = shallowCopy(options);
    delete options.basedir;

    this.session.emit("rpc.batch", options, this.emit.bind(this, "ack"));
}

util.inherits(ClientBatch, EventEmitter2);

/**
 * Something went wrong.
 * @event error
 * @param {Error} error The error object.
 */

/**
 * The batch is complete. Browsers may be shutting down.
 * @event complete
 */

/**
 * The batch has finished, browsers have shut down.
 * No more events will be fired.
 * @event end
 */

/**
 * The agent given has completed testing.
 * @event agentComplete
 * @param {String} agent Agent name.
 */

/**
 * Test result from an agent.
 * @event agentResult
 * @param {String} agent Agent name.
 * @param {Object} details Test result details, in YUI Test JSON format.
 * @param {Object} [details.coverage] Test coverage details, if YUI Test Coverage instrumented code was present.
 */

/**
 * Error while handling an agent request.
 * @event agentError
 * @param {String} agent Agent name.
 * @param {Object} details Exception details.
 * @param {String} details.message Exception message.
 */

/**
 * Pedantic error while handling an agent request.
 * @event agentPedanticError
 * @param {String} agent Agent name.
 * @param {Object} details Exception details.
 * @param {String} details.message Exception message.
 */

/**
 * Uncaught JavaScript error from an agent.
 * @event agentScriptError
 * @param {String} agent Agent name.
 * @param {Object} details Exception details.
 * @param {String} details.url Exception URL.
 * @param {Number} details.line Exception line number.
 * @param {String} details.message Exception message.
 */

/**
 * @method onAck
 * @protected
 * @param {Error} err
 * @param {Number} id
 */
ClientBatch.prototype.onAck = function (err, id) {
    var self = this;

    if (err) {
        self.emit("error", err);
    }

    self.id = id;

    self.batchSession = self.session.createNamespace("batch" + self.id);

    self.batchSession.incomingBridge(self, "end");
    self.batchSession.incomingBridge(self, "complete");
    self.batchSession.incomingBridge(self, "dispatch");
    self.batchSession.incomingBridge(self, "agentComplete");
    self.batchSession.incomingBridge(self, "agentResult");
    self.batchSession.incomingBridge(self, "agentBeat");
    self.batchSession.incomingBridge(self, "agentProgress");
    self.batchSession.incomingBridge(self, "agentError");
    self.batchSession.incomingBridge(self, "agentPedanticError");
    self.batchSession.incomingBridge(self, "agentScriptError");

    self.once("end", function () {
        self.batchSession.unbind();
    });

    self.provideTests();
};

/**
 * Setup BlizzardNamespace event listener that will
 * serve local test files under this.basedir.
 *
 * @method provideTests
 * @protected
 */
ClientBatch.prototype.provideTests = function () {
    var self = this;

    self.batchSession.on("request.clientFile", function (args, reply) {
        var file = args[0];

        if (!self.basedir) {
            reply("Not permitted.");
            return;
        }

        if (file[0] !== "/") {
            // Path is relative, resolve it to an absolute path.
            file = path.resolve(self.basedir, file);
        }

        // The file path must be inside the basedir.
        if (file.indexOf(self.basedir) !== 0) {
            reply("Filename provided is not in basedir!");
            return;
        }

        fs.readFile(file, reply);
    });

};

/**
 * The Client submits test batches to a Yeti Hub and tracks their progress.
 *
 * @class Client
 * @constructor
 * @extends EventEmitter2
 * @param {String} url Yeti Hub HTTP URL.
 */
function Client(url) {
    EventEmitter2.call(this);

    this.session = null;

    this.url = url;

    this.blizzard = new Blizzard();

    this.blizzard.on("error", this.handleBlizzardError.bind(this));
}

util.inherits(Client, EventEmitter2);

/**
 * Something went wrong.
 * @event error
 * @param {Error} error The error object.
 */

/**
 * An agent connected to the Hub.
 * @event agentConnect
 * @param {String} agent Agent name.
 */

/**
 * An agent requested a page (test or capture) from the connected Hub.
 * @event agentSeen
 * @param {String} agent Agent name.
 */

/**
 * An agent disconnected from the Hub.
 * @event agentDisconnect
 * @param {String} agent Agent name.
 */

/**
 * Connect to the Yeti Hub.
 *
 * @method connect
 * @param {Function} cb Callback function.
 */
Client.prototype.connect = function (cb) {
    var self = this;
    self.blizzard.connect(self.url, function (err, session) {
        if (err) {
            cb(err);
            return;
        }

        session.incomingBridge(self, "agentConnect");
        session.incomingBridge(self, "agentSeen");
        session.incomingBridge(self, "agentDisconnect");

        self.session = session;

        cb(err);
    });
};

/**
 * Disconnect from the Yeti Hub.
 *
 * @method end
 */
Client.prototype.end = function () {
    if (!this.session) {
        throw new Error("Session not started.");
    }
    this.session.end();
};

/**
 * @method handleBlizzardError
 * @protected
 */
Client.prototype.handleBlizzardError = function (err) {
    if (err.code === "ECONNRESET") {
        this.emit("error", new Error("Server does not speak Yeti's protocol. Version mismatch?"));
        return;
    }
    this.emit("error", err);
};

/**
 * Create and submit a batch of tests to the Hub.
 *
 * @method createBatch
 * @param {Object} config Batch information.
 * @param {String[]} config.tests Tests. Either relative paths to `config.basedir` or URL pathnames.
 * @param {String} [config.basedir] Root path for serving tests. Required if `useProxy` is true or not provided.
 * @param {String} [config.query] Query string additions for test URLs.
 * @param {Number} [config.timeout] Per-test timeout in seconds. Default is 45 seconds.
 *                                  If no activity occurs before the timeout, the next test is loaded.
 * @param {Boolean} [config.useProxy] True if tests are filenames to proxy to the Hub.
 *                           false if they are literal URL pathnames.
 *                           If not provided, defaults to true.
 * @return {ClientBatch} batch The new ClientBatch object.
 */
Client.prototype.createBatch = function (config) {
    if (!this.session) {
        throw new Error("Not connected. Call connect() before creating a batch.");
    }

    config = shallowCopy(config);

    if (undefined === config.useProxy) {
        // Use the proxy by default.
        config.useProxy = true;
    }

    return new ClientBatch(this.session, config);
};

/**
 * Get an array of available agents on the Hub.
 *
 * @method getAgents
 * @param {Function} cb Callback with agent names.
 */
Client.prototype.getAgents = function (cb) {
    this.session.emit("rpc.agents", cb);
};

/**
 * @class exports
 * @static
 */
exports.Client = Client;

/**
 * Create a new Yeti Client instance.
 *
 * @method createClient
 * @param {String} url Yeti Hub HTTP URL.
 * @return {Client} client Yeti Client instance.
 */
exports.createClient = function (url) {
    return new Client(url);
};

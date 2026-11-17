"use strict";

var util = require("util");
var path = require("path");
var fs = require("graceful-fs");
var ProtoList = require("proto-list");
var EventEmitter2 = require("../event-emitter");

// Node v0.8 & v0.6 APIs.
var existsSync = fs.existsSync || path.existsSync;

/**
 * A nice home for your Configuration.
 *
 * @class Configuration
 * @constructor
 * @extends EventEmitter2
 */
var Configuration = module.exports = function Configuration() {
    this.filename = null;
    this.process = process;

    this.configs = new ProtoList();

    EventEmitter2.call(this);
};

/**
 * Configuration store.
 *
 * @property configs
 * @private
 * @type ProtoList
 */

util.inherits(Configuration, EventEmitter2);

var proto = Configuration.prototype;

/**
 * Locate a configuration file start
 * Find a configuration file named `this.filename`
 * recursively from the given directory. Stop and return
 * that filename if a match is found.
 *
 * @method locate
 * @private
 * @param {String} directory Directory to begin search.
 * @return {String} Filename match if found, otherwise `null`.
 */
proto.locate = function configurationFinder(directory, disableScan) {
    var filename = path.normalize(path.join(directory, this.filename)),
        parent = path.resolve(directory, "..");

    this.debug("Searching for filename = " + filename);

    if (existsSync(filename)) {
        return filename;
    } else if ((directory === parent) || disableScan) {
        this.debug("Giving up.");
        return null;
    } else {
        this.debug("Unable to find configuration in directory = " + directory +
                ", looking in parent.");
        return configurationFinder.call(this, parent);
    }
};

/**
 * Parse a configuration file as JSON.
 *
 * @method parse
 * @private
 * @param {String} filename Configuration file. Must exist.
 * @return {Object} Parsed configuration, null if failed.
 */
proto.parseFile = function (filename, cb) {
    var self = this,
        finalConfig = null;

    if (!filename) {
        return finalConfig;
    }

    self.debug("Parsing: " + filename);

    finalConfig = self.parse(fs.readFileSync(filename, "utf8"));

    if (finalConfig === null) {
        return null;
    }

    Object.keys(finalConfig).filter(function (key) {
        return key.indexOf("dir") > 0;
    }).forEach(function (key) {
        finalConfig[key] = path.resolve(
            path.dirname(filename),
            finalConfig[key]
        );
        self.debug("Rewrote configuration for key: " + key,
            ", to: " + finalConfig[key]);
    });

    return finalConfig;
};

proto.parse = function (json) {
    var finalConfig = null;

    try {
        finalConfig = JSON.parse(json);
    } catch (ex) {
        this.debug("Configuration parse error: " + ex.message +
                ", json = " + json);
    }

    return finalConfig;
};

/**
 * Import a configuration object into our ProtoList.
 *
 * @method import
 * @chainable
 */
proto.import = function (config) {
    if (config !== null) {
        this.debug("Importing configuration.", config);
        this.configs.unshift(config);
    } else {
        this.debug("Not importing.");
    }
    return this;
};

/**
 * Set a configuration value.
 *
 * @method get
 * @param {String} key Configuration key.
 * @param {Object} value Configuration value.
 *      While the value can be any type,
 *      it is not recommended to store objects.
 *      Object values are not deep merged, so only the most
 *      recent object value will be returned from
 *      get() and export().
 */
proto.set = function (key, value) {
    this.debug("Set key:", key, "value:", value);
    this.configs.set(key, value);
};

/**
 * Get a configuration value.
 *
 * @method get
 * @param {String} key Configuration key.
 * @return {String} Configuration value.
 */
proto.get = function (key) {
    return this.configs.get(key);
};

/**
 * Get the entire configuration object.
 *
 * @method export
 * @return {Object} Merged configuration object.
 */
proto.export = function () {
    return this.configs.snapshot;
};

/**
 * Find a configuration file named `this.filename`
 * recursively from the given directory. Stop and import
 * that configuration is a match is found.
 *
 * @method importFromDirectory
 * @param {String} directory Directory to begin searching.
 * @param {Boolean} disableScan Only check the given directory, if true.
 */
proto.importFromDirectory = function (directory, disableScan) {
    this.import(this.parseFile(this.locate(directory, disableScan)));
};

/**
 * Import configuration from a file.
 * The file must exist.
 *
 * @method importFromFile
 * @param {String} filename JSON file.
 */
proto.importFromFile = function (filename) {
    this.import(this.parseFile(filename));
};

/**
 * Find a configuration file named `this.filename`
 * recursively from the current directory. Stop
 * and import that configuration if a match is found.
 *
 * @method find
 * @chainable
 */
proto.find = function () {
    this.importFromDirectory(this.process.cwd());
    return this;
};

/**
 * Import configuration from `this.filename` in the
 * home directory, if one exists.
 *
 * @method home
 * @chainable
 */
proto.home = function () {
    this.importFromDirectory(this.process.env.HOME, true);
    return this;
};

/**
 * Set the filename instance property.
 *
 * @method setFilename
 * @param {String} filename Name of configuration file.
 * @chainable
 */
proto.setFilename = function (filename) {
    this.filename = filename;
    return this;
};

/**
 * Set the process object. Only useful for unit testing.
 *
 * @method setProcess
 * @param {String} process Process object.
 * @chainable
 */
proto.setProcess = function (newProcess) {
    this.process = newProcess;
    return this;
};

/**
 * Import all environment variables with names matching
 * `envPrefix`, case-sensitive. The imported variable
 * keys will exclude the envPrefix and will be lowercased.
 *
 * @method env
 * @param {String} envPrefix Prefix for environment variables.
 * @chainable
 */
proto.env = function (envPrefix) {
    var self = this,
        config = {},
        env = self.process.env;
    Object.keys(env).filter(function (key) {
        return key.indexOf(envPrefix) === 0;
    }).forEach(function (key) {
        var value = env[key];
        self.debug("Parsing env key: " + key);
        key = key.substr(envPrefix.length).toLowerCase();
        self.debug("Processed key: " + key + ", value: " + value);
        config[key] = value;
    });
    self.import(config);
    return self;
};

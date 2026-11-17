/**
 * collection.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

var util = require('./util');

/**
Helper collection class - in a way a mix of object and array

@contsructor
@class Collection
*/
var Collection = function() {
	var registry = {};

	this.length = 0;

	this.get = function(key) {
		return registry.hasOwnProperty(key) ? registry[key] : null;
	};

	this.add = function(key, obj) {
		if (!registry.hasOwnProperty(key)) {
			this.length++;
		}
		registry[key] = obj;
	};

	this.remove = function(key) {
		if (registry.hasOwnProperty(key)) {
			delete registry[key];
			this.length--;
		}
	};

	this.update = function(key, obj) {
		registry[key] = obj;
	};

	this.each = function(cb) {
		util.each(registry, cb);
	};

	this.clear = function() {
		registry = {};
		this.length = 0;
	};
};

module.exports = Collection;

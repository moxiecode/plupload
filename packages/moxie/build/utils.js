var util = require('util');

/**
Executes the callback function for each item in array/object. If you return false in the
callback it will break the loop.

@author Moxiecode
@method each
@param {Object} obj Object to iterate.
@param {function} callback Callback function to execute for each item.
 */
var each = function(obj, callback) {
	var length, key, i;

	if (obj) {
		length = obj.length;

		if (length === undefined) {
			// Loop object items
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (callback(obj[key], key) === false) {
						return;
					}
				}
			}
		} else {
			// Loop array items
			for (i = 0; i < length; i++) {
				if (callback(obj[i], i) === false) {
					return;
				}
			}
		}
	}
};

/**
Extends the specified object with another object.

@author Moxiecode
@method extend
@param {Object} target Object to extend.
@param {Object} [obj]* Multiple objects to extend with.
@return {Object} Same as target, the extended object.
*/
var extend = function(target) {
	var undef;

	each(arguments, function(arg, i) {
		if (i > 0) {
			each(arg, function(value, key) {
				if (value !== undef) {
					if (typeof(target[key]) === typeof(value) && (typeof(value) === 'object' || util.isArray(value))) {
						extend(target[key], value);
					} else {
						target[key] = value;
					}
				}
			});
		}
	});
	return target;
};

/**
Generates an unique ID. This is 99.99% unique since it takes the current time and 5 random numbers.
The only way a user would be able to get the same ID is if the two persons at the same exact milisecond manages
to get 5 the same random numbers between 0-65535 it also uses a counter so each call will be guaranteed to be page unique.
It's more probable for the earth to be hit with an ansteriod. Y

@author Moxiecode
@method guid
@param {String} prefix to prepend (by default 'o' will be prepended).
@method guid
@return {String} Virtually unique id.
 */
var guid = (function() { 
	var counter = 0;
	
	return function(prefix) {
		var guid = new Date().getTime().toString(32), i;

		for (i = 0; i < 5; i++) {
			guid += Math.floor(Math.random() * 65535).toString(32);
		}
		
		return (prefix || '') + guid + (counter++).toString(32);
	};
}());


var inSeries = function(queue, cb) {
	var i = 0, length = queue.length;

	if (typeof(cb) !== 'function') {
		cb = function() {};
	}

	function callNext(i) {
		if (typeof(queue[i]) === 'function') {
			queue[i](function(error) {
				++i < length && !error ? callNext(i) : cb(error);
			});
		}
	}
	callNext(i);
};


function asFlags(arr) {
	var obj = {};
	each(arr, function(flag) {
		obj[flag] = true;
	});
	return obj;
}


extend(util, {
	  guid: guid
	, each: each
	, extend: extend
	, inSeries: inSeries
	, asFlags: asFlags
});

module.exports = util;

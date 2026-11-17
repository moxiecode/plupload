/**
 * Basic.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Basic
@public
@static
*/

define('moxie/core/utils/Basic', [], function() {
	/**
	Gets the true type of the built-in object (better version of typeof).
	@author Angus Croll (http://javascriptweblog.wordpress.com/)

	@method typeOf
	@static
	@param {Object} o Object to check.
	@return {String} Object [[Class]]
	*/
	function typeOf(o) {
		var undef;

		if (o === undef) {
			return 'undefined';
		} else if (o === null) {
			return 'null';
		} else if (o.nodeType) {
			return 'node';
		}

		// the snippet below is awesome, however it fails to detect null, undefined and arguments types in IE lte 8
		return ({}).toString.call(o).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	}

	/**
	Extends the specified object with another object(s).

	@method extend
	@static
	@param {Object} target Object to extend.
	@param {Object} [obj]* Multiple objects to extend with.
	@return {Object} Same as target, the extended object.
	*/
	function extend() {
		return merge(false, false, arguments);
	}


	/**
	Extends the specified object with another object(s), but only if the property exists in the target.

	@method extendIf
	@static
	@param {Object} target Object to extend.
	@param {Object} [obj]* Multiple objects to extend with.
	@return {Object} Same as target, the extended object.
	*/
	function extendIf() {
		return merge(true, false, arguments);
	}


	function extendImmutable() {
		return merge(false, true, arguments);
	}


	function extendImmutableIf() {
		return merge(true, true, arguments);
	}


	function clone(value) {
		switch (typeOf(value)) {
			case 'array':
				return merge(false, true, [[], value]);

			case 'object':
				return merge(false, true, [{}, value]);

			default:
				return value;
		}
	}


	function shallowCopy(obj) {
		switch (typeOf(obj)) {
			case 'array':
				return Array.prototype.slice.call(obj);

			case 'object':
				return extend({}, obj);
		}
		return obj;
	}


	function merge(strict, immutable, args) {
		var undef;
		var target = args[0];

		each(args, function(arg, i) {
			if (i > 0) {
				each(arg, function(value, key) {
					var isComplex = inArray(typeOf(value), ['array', 'object']) !== -1;

					if (value === undef || strict && target[key] === undef) {
						return true;
					}

					if (isComplex && immutable) {
						value = shallowCopy(value);
					}

					if (typeOf(target[key]) === typeOf(value) && isComplex) {
						merge(strict, immutable, [target[key], value]);
					} else {
						target[key] = value;
					}
				});
			}
		});

		return target;
	}


	/**
	A way to inherit one `class` from another in a consisstent way (more or less)

	@method inherit
	@static
	@since >1.4.1
	@param {Function} child
	@param {Function} parent
	@return {Function} Prepared constructor
	*/
	function inherit(child, parent) {
		// copy over all parent properties
		for (var key in parent) {
			if ({}.hasOwnProperty.call(parent, key)) {
				child[key] = parent[key];
			}
		}

		// give child `class` a place to define its own methods
		function ctor() {
			this.constructor = child;

			if (MXI_DEBUG) {
				var getCtorName = function(fn) {
					var m = fn.toString().match(/^function\s([^\(\s]+)/);
					return m ? m[1] : false;
				};

				this.ctorName = getCtorName(child);
			}
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();

		// keep a way to reference parent methods
		child.parent = parent.prototype;
		return child;
	}


	/**
	Executes the callback function for each item in array/object. If you return false in the
	callback it will break the loop.

	@method each
	@static
	@param {Object} obj Object to iterate.
	@param {function} callback Callback function to execute for each item.
	*/
	function each(obj, callback) {
		var length, key, i, undef;

		if (obj) {
			try {
				length = obj.length;
			} catch(ex) {
				length = undef;
			}

			if (length === undef || typeof(length) !== 'number') {
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
	}

	/**
	Checks if object is empty.

	@method isEmptyObj
	@static
	@param {Object} o Object to check.
	@return {Boolean}
	*/
	function isEmptyObj(obj) {
		var prop;

		if (!obj || typeOf(obj) !== 'object') {
			return true;
		}

		for (prop in obj) {
			return false;
		}

		return true;
	}

	/**
	Recieve an array of functions (usually async) to call in sequence, each  function
	receives a callback as first argument that it should call, when it completes. Finally,
	after everything is complete, main callback is called. Passing truthy value to the
	callback as a first argument will interrupt the sequence and invoke main callback
	immediately.

	@method inSeries
	@static
	@param {Array} queue Array of functions to call in sequence
	@param {Function} cb Main callback that is called in the end, or in case of error
	*/
	function inSeries(queue, cb) {
		var i = 0, length = queue.length;

		if (typeOf(cb) !== 'function') {
			cb = function() {};
		}

		if (!queue || !queue.length) {
			cb();
		}

		function callNext(i) {
			if (typeOf(queue[i]) === 'function') {
				queue[i](function(error) {
					/*jshint expr:true */
					++i < length && !error ? callNext(i) : cb(error);
				});
			}
		}
		callNext(i);
	}


	/**
	Recieve an array of functions (usually async) to call in parallel, each  function
	receives a callback as first argument that it should call, when it completes. After
	everything is complete, main callback is called. Passing truthy value to the
	callback as a first argument will interrupt the process and invoke main callback
	immediately.

	@method inParallel
	@static
	@param {Array} queue Array of functions to call in sequence
	@param {Function} cb Main callback that is called in the end, or in case of erro
	*/
	function inParallel(queue, cb) {
		var count = 0, num = queue.length, cbArgs = new Array(num);

		each(queue, function(fn, i) {
			fn(function(error) {
				if (error) {
					return cb(error);
				}

				var args = [].slice.call(arguments);
				args.shift(); // strip error - undefined or not

				cbArgs[i] = args;
				count++;

				if (count === num) {
					cbArgs.unshift(null);
					cb.apply(this, cbArgs);
				}
			});
		});
	}


	/**
	Find an element in array and return it's index if present, otherwise return -1.

	@method inArray
	@static
	@param {Mixed} needle Element to find
	@param {Array} array
	@return {Int} Index of the element, or -1 if not found
	*/
	function inArray(needle, array) {
		if (array) {
			if (Array.prototype.indexOf) {
				return Array.prototype.indexOf.call(array, needle);
			}

			for (var i = 0, length = array.length; i < length; i++) {
				if (array[i] === needle) {
					return i;
				}
			}
		}
		return -1;
	}


	/**
	Returns elements of first array if they are not present in second. And false - otherwise.

	@private
	@method arrayDiff
	@param {Array} needles
	@param {Array} array
	@return {Array|Boolean}
	*/
	function arrayDiff(needles, array) {
		var diff = [];

		if (typeOf(needles) !== 'array') {
			needles = [needles];
		}

		if (typeOf(array) !== 'array') {
			array = [array];
		}

		for (var i in needles) {
			if (inArray(needles[i], array) === -1) {
				diff.push(needles[i]);
			}
		}
		return diff.length ? diff : false;
	}


	/**
	Find intersection of two arrays.

	@private
	@method arrayIntersect
	@param {Array} array1
	@param {Array} array2
	@return {Array} Intersection of two arrays or null if there is none
	*/
	function arrayIntersect(array1, array2) {
		var result = [];
		each(array1, function(item) {
			if (inArray(item, array2) !== -1) {
				result.push(item);
			}
		});
		return result.length ? result : null;
	}


	/**
	Forces anything into an array.

	@method toArray
	@static
	@param {Object} obj Object with length field.
	@return {Array} Array object containing all items.
	*/
	function toArray(obj) {
		var i, arr = [];

		for (i = 0; i < obj.length; i++) {
			arr[i] = obj[i];
		}

		return arr;
	}


	/**
	Generates an unique ID. The only way a user would be able to get the same ID is if the two persons
	at the same exact millisecond manage to get the same 5 random numbers between 0-65535; it also uses
	a counter so each ID is guaranteed to be unique for the given page. It is more probable for the earth
	to be hit with an asteroid.

	@method guid
	@static
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

			return (prefix || 'o_') + guid + (counter++).toString(32);
		};
	}());


	/**
	Trims white spaces around the string

	@method trim
	@static
	@param {String} str
	@return {String}
	*/
	function trim(str) {
		if (!str) {
			return str;
		}
		return String.prototype.trim ? String.prototype.trim.call(str) : str.toString().replace(/^\s*/, '').replace(/\s*$/, '');
	}


	/**
	Parses the specified size string into a byte value. For example 10kb becomes 10240.

	@method parseSizeStr
	@static
	@param {String/Number} size String to parse or number to just pass through.
	@return {Number} Size in bytes.
	*/
	function parseSizeStr(size) {
		if (typeof(size) !== 'string') {
			return size;
		}

		var muls = {
				t: 1099511627776,
				g: 1073741824,
				m: 1048576,
				k: 1024
			},
			mul;

		size = /^([0-9\.]+)([tmgk]?)$/.exec(size.toLowerCase().replace(/[^0-9\.tmkg]/g, ''));
		mul = size[2];
		size = +size[1];

		if (muls.hasOwnProperty(mul)) {
			size *= muls[mul];
		}
		return Math.floor(size);
	}


	/**
	 * Pseudo sprintf implementation - simple way to replace tokens with specified values.
	 *
	 * @param {String} str String with tokens
	 * @return {String} String with replaced tokens
	 */
	function sprintf(str) {
		var args = [].slice.call(arguments, 1);

		return str.replace(/%([a-z])/g, function($0, $1) {
			var value = args.shift();

			switch ($1) {
				case 's':
					return value + '';

				case 'd':
					return parseInt(value, 10);

				case 'f':
					return parseFloat(value);

				case 'c':
					return '';

				default:
					return value;
			}
		});
	}



	function delay(cb, timeout) {
		var self = this;
		setTimeout(function() {
			cb.call(self);
		}, timeout || 1);
	}


	return {
		guid: guid,
		typeOf: typeOf,
		extend: extend,
		extendIf: extendIf,
		extendImmutable: extendImmutable,
		extendImmutableIf: extendImmutableIf,
		clone: clone,
		inherit: inherit,
		each: each,
		isEmptyObj: isEmptyObj,
		inSeries: inSeries,
		inParallel: inParallel,
		inArray: inArray,
		arrayDiff: arrayDiff,
		arrayIntersect: arrayIntersect,
		toArray: toArray,
		trim: trim,
		sprintf: sprintf,
		parseSizeStr: parseSizeStr,
		delay: delay
	};
});

/**
 * Plupload - multi-runtime File Uploader
 * v3.1.1
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 *
 * Date: 2017-10-03
 */
;var MXI_DEBUG = true;
;(function (global, factory) {
	var extract = function() {
		var ctx = {};
		factory.apply(ctx, arguments);
		return ctx.plupload;
	};
	
	if (typeof define === "function" && define.amd) {
		define("plupload", [], extract);
	} else if (typeof module === "object" && module.exports) {
		module.exports = extract();
	} else {
		global.plupload = extract();
	}
}(this || window, function() {
/**
 * Compiled inline version. (Library mode)
 */

/*jshint smarttabs:true, undef:true, latedef:true, curly:true, bitwise:true, camelcase:true */
/*globals $code */

(function(exports, undefined) {
	"use strict";

	var modules = {};

	function require(ids, callback) {
		var module, defs = [];

		for (var i = 0; i < ids.length; ++i) {
			module = modules[ids[i]] || resolve(ids[i]);
			if (!module) {
				throw 'module definition dependecy not found: ' + ids[i];
			}

			defs.push(module);
		}

		callback.apply(null, defs);
	}

	function define(id, dependencies, definition) {
		if (typeof id !== 'string') {
			throw 'invalid module definition, module id must be defined and be a string';
		}

		if (dependencies === undefined) {
			throw 'invalid module definition, dependencies must be specified';
		}

		if (definition === undefined) {
			throw 'invalid module definition, definition function must be specified';
		}

		require(dependencies, function() {
			modules[id] = definition.apply(null, arguments);
		});
	}

	function defined(id) {
		return !!modules[id];
	}

	function resolve(id) {
		var target = exports;
		var fragments = id.split(/[.\/]/);

		for (var fi = 0; fi < fragments.length; ++fi) {
			if (!target[fragments[fi]]) {
				return;
			}

			target = target[fragments[fi]];
		}

		return target;
	}

	function expose(ids) {
		for (var i = 0; i < ids.length; i++) {
			var target = exports;
			var id = ids[i];
			var fragments = id.split(/[.\/]/);

			for (var fi = 0; fi < fragments.length - 1; ++fi) {
				if (target[fragments[fi]] === undefined) {
					target[fragments[fi]] = {};
				}

				target = target[fragments[fi]];
			}

			target[fragments[fragments.length - 1]] = modules[id];
		}
	}

// Included from: src/moxie/src/javascript/core/utils/Basic.js

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

// Included from: src/moxie/src/javascript/core/utils/Env.js

/**
 * Env.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Env
@public
@static
*/

define("moxie/core/utils/Env", [
	"moxie/core/utils/Basic"
], function(Basic) {

	/**
	 * UAParser.js v0.7.7
	 * Lightweight JavaScript-based User-Agent string parser
	 * https://github.com/faisalman/ua-parser-js
	 *
	 * Copyright © 2012-2015 Faisal Salman <fyzlman@gmail.com>
	 * Dual licensed under GPLv2 & MIT
	 */
	var UAParser = (function (undefined) {

	    //////////////
	    // Constants
	    /////////////


	    var EMPTY       = '',
	        UNKNOWN     = '?',
	        FUNC_TYPE   = 'function',
	        UNDEF_TYPE  = 'undefined',
	        OBJ_TYPE    = 'object',
	        MAJOR       = 'major',
	        MODEL       = 'model',
	        NAME        = 'name',
	        TYPE        = 'type',
	        VENDOR      = 'vendor',
	        VERSION     = 'version',
	        ARCHITECTURE= 'architecture',
	        CONSOLE     = 'console',
	        MOBILE      = 'mobile',
	        TABLET      = 'tablet';


	    ///////////
	    // Helper
	    //////////


	    var util = {
	        has : function (str1, str2) {
	            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
	        },
	        lowerize : function (str) {
	            return str.toLowerCase();
	        }
	    };


	    ///////////////
	    // Map helper
	    //////////////


	    var mapper = {

	        rgx : function () {

	            // loop through all regexes maps
	            for (var result, i = 0, j, k, p, q, matches, match, args = arguments; i < args.length; i += 2) {

	                var regex = args[i],       // even sequence (0,2,4,..)
	                    props = args[i + 1];   // odd sequence (1,3,5,..)

	                // construct object barebones
	                if (typeof(result) === UNDEF_TYPE) {
	                    result = {};
	                    for (p in props) {
	                        q = props[p];
	                        if (typeof(q) === OBJ_TYPE) {
	                            result[q[0]] = undefined;
	                        } else {
	                            result[q] = undefined;
	                        }
	                    }
	                }

	                // try matching uastring with regexes
	                for (j = k = 0; j < regex.length; j++) {
	                    matches = regex[j].exec(this.getUA());
	                    if (!!matches) {
	                        for (p = 0; p < props.length; p++) {
	                            match = matches[++k];
	                            q = props[p];
	                            // check if given property is actually array
	                            if (typeof(q) === OBJ_TYPE && q.length > 0) {
	                                if (q.length == 2) {
	                                    if (typeof(q[1]) == FUNC_TYPE) {
	                                        // assign modified match
	                                        result[q[0]] = q[1].call(this, match);
	                                    } else {
	                                        // assign given value, ignore regex match
	                                        result[q[0]] = q[1];
	                                    }
	                                } else if (q.length == 3) {
	                                    // check whether function or regex
	                                    if (typeof(q[1]) === FUNC_TYPE && !(q[1].exec && q[1].test)) {
	                                        // call function (usually string mapper)
	                                        result[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
	                                    } else {
	                                        // sanitize match using given regex
	                                        result[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
	                                    }
	                                } else if (q.length == 4) {
	                                        result[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
	                                }
	                            } else {
	                                result[q] = match ? match : undefined;
	                            }
	                        }
	                        break;
	                    }
	                }

	                if(!!matches) break; // break the loop immediately if match found
	            }
	            return result;
	        },

	        str : function (str, map) {

	            for (var i in map) {
	                // check if array
	                if (typeof(map[i]) === OBJ_TYPE && map[i].length > 0) {
	                    for (var j = 0; j < map[i].length; j++) {
	                        if (util.has(map[i][j], str)) {
	                            return (i === UNKNOWN) ? undefined : i;
	                        }
	                    }
	                } else if (util.has(map[i], str)) {
	                    return (i === UNKNOWN) ? undefined : i;
	                }
	            }
	            return str;
	        }
	    };


	    ///////////////
	    // String map
	    //////////////


	    var maps = {

	        browser : {
	            oldsafari : {
	                major : {
	                    '1' : ['/8', '/1', '/3'],
	                    '2' : '/4',
	                    '?' : '/'
	                },
	                version : {
	                    '1.0'   : '/8',
	                    '1.2'   : '/1',
	                    '1.3'   : '/3',
	                    '2.0'   : '/412',
	                    '2.0.2' : '/416',
	                    '2.0.3' : '/417',
	                    '2.0.4' : '/419',
	                    '?'     : '/'
	                }
	            }
	        },

	        device : {
	            sprint : {
	                model : {
	                    'Evo Shift 4G' : '7373KT'
	                },
	                vendor : {
	                    'HTC'       : 'APA',
	                    'Sprint'    : 'Sprint'
	                }
	            }
	        },

	        os : {
	            windows : {
	                version : {
	                    'ME'        : '4.90',
	                    'NT 3.11'   : 'NT3.51',
	                    'NT 4.0'    : 'NT4.0',
	                    '2000'      : 'NT 5.0',
	                    'XP'        : ['NT 5.1', 'NT 5.2'],
	                    'Vista'     : 'NT 6.0',
	                    '7'         : 'NT 6.1',
	                    '8'         : 'NT 6.2',
	                    '8.1'       : 'NT 6.3',
	                    'RT'        : 'ARM'
	                }
	            }
	        }
	    };


	    //////////////
	    // Regex map
	    /////////////


	    var regexes = {

	        browser : [[

	            // Presto based
	            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
	            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
	            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
	            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80

	            ], [NAME, VERSION], [

	            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
	            ], [[NAME, 'Opera'], VERSION], [

	            // Mixed
	            /(kindle)\/([\w\.]+)/i,                                             // Kindle
	            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
	                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

	            // Trident based
	            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
	                                                                                // Avant/IEMobile/SlimBrowser/Baidu
	            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

	            // Webkit/KHTML based
	            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
	            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi)\/([\w\.-]+)/i
	                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron
	            ], [NAME, VERSION], [

	            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
	            ], [[NAME, 'IE'], VERSION], [

	            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
	            ], [NAME, VERSION], [

	            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
	            ], [[NAME, 'Yandex'], VERSION], [

	            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
	            ], [[NAME, /_/g, ' '], VERSION], [

	            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i,
	                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
	            /(uc\s?browser|qqbrowser)[\/\s]?([\w\.]+)/i
	                                                                                // UCBrowser/QQBrowser
	            ], [NAME, VERSION], [

	            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
	            ], [[NAME, 'Dolphin'], VERSION], [

	            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
	            ], [[NAME, 'Chrome'], VERSION], [

	            /XiaoMi\/MiuiBrowser\/([\w\.]+)/i                                   // MIUI Browser
	            ], [VERSION, [NAME, 'MIUI Browser']], [

	            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)/i         // Android Browser
	            ], [VERSION, [NAME, 'Android Browser']], [

	            /FBAV\/([\w\.]+);/i                                                 // Facebook App for iOS
	            ], [VERSION, [NAME, 'Facebook']], [

	            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
	            ], [VERSION, [NAME, 'Mobile Safari']], [

	            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
	            ], [VERSION, NAME], [

	            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
	            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

	            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
	            /(webkit|khtml)\/([\w\.]+)/i
	            ], [NAME, VERSION], [

	            // Gecko based
	            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
	            ], [[NAME, 'Netscape'], VERSION], [
	            /(swiftfox)/i,                                                      // Swiftfox
	            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
	                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
	            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
	                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
	            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

	            // Other
	            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf)[\/\s]?([\w\.]+)/i,
	                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf
	            /(links)\s\(([\w\.]+)/i,                                            // Links
	            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
	            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
	            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
	            ], [NAME, VERSION]
	        ],

	        engine : [[

	            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
	            ], [VERSION, [NAME, 'EdgeHTML']], [

	            /(presto)\/([\w\.]+)/i,                                             // Presto
	            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
	            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
	            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
	            ], [NAME, VERSION], [

	            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
	            ], [VERSION, NAME]
	        ],

	        os : [[

	            // Windows based
	            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
	            ], [NAME, VERSION], [
	            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
	            /(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
	            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
	            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
	            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

	            // Mobile/Embedded OS
	            /\((bb)(10);/i                                                      // BlackBerry 10
	            ], [[NAME, 'BlackBerry'], VERSION], [
	            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
	            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
	            /(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
	                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
	            /linux;.+(sailfish);/i                                              // Sailfish OS
	            ], [NAME, VERSION], [
	            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
	            ], [[NAME, 'Symbian'], VERSION], [
	            /\((series40);/i                                                    // Series 40
	            ], [NAME], [
	            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
	            ], [[NAME, 'Firefox OS'], VERSION], [

	            // Console
	            /(nintendo|playstation)\s([wids3portablevu]+)/i,                    // Nintendo/Playstation

	            // GNU/Linux based
	            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
	            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
	            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?([\w\.-]+)*/i,
	                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
	                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
	            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
	            /(gnu)\s?([\w\.]+)*/i                                               // GNU
	            ], [NAME, VERSION], [

	            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
	            ], [[NAME, 'Chromium OS'], VERSION],[

	            // Solaris
	            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
	            ], [[NAME, 'Solaris'], VERSION], [

	            // BSD based
	            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
	            ], [NAME, VERSION],[

	            /(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i             // iOS
	            ], [[NAME, 'iOS'], [VERSION, /_/g, '.']], [

	            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
	            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
	            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

	            // Other
	            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
	            /(haiku)\s(\w+)/i,                                                  // Haiku
	            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
	            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
	                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
	            /(unix)\s?([\w\.]+)*/i                                              // UNIX
	            ], [NAME, VERSION]
	        ]
	    };


	    /////////////////
	    // Constructor
	    ////////////////


	    var UAParser = function (uastring) {

	        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);

	        this.getBrowser = function () {
	            return mapper.rgx.apply(this, regexes.browser);
	        };
	        this.getEngine = function () {
	            return mapper.rgx.apply(this, regexes.engine);
	        };
	        this.getOS = function () {
	            return mapper.rgx.apply(this, regexes.os);
	        };
	        this.getResult = function() {
	            return {
	                ua      : this.getUA(),
	                browser : this.getBrowser(),
	                engine  : this.getEngine(),
	                os      : this.getOS()
	            };
	        };
	        this.getUA = function () {
	            return ua;
	        };
	        this.setUA = function (uastring) {
	            ua = uastring;
	            return this;
	        };
	        this.setUA(ua);
	    };

	    return UAParser;
	})();


	function version_compare(v1, v2, operator) {
	  // From: http://phpjs.org/functions
	  // +      original by: Philippe Jausions (http://pear.php.net/user/jausions)
	  // +      original by: Aidan Lister (http://aidanlister.com/)
	  // + reimplemented by: Kankrelune (http://www.webfaktory.info/)
	  // +      improved by: Brett Zamir (http://brett-zamir.me)
	  // +      improved by: Scott Baker
	  // +      improved by: Theriault
	  // *        example 1: version_compare('8.2.5rc', '8.2.5a');
	  // *        returns 1: 1
	  // *        example 2: version_compare('8.2.50', '8.2.52', '<');
	  // *        returns 2: true
	  // *        example 3: version_compare('5.3.0-dev', '5.3.0');
	  // *        returns 3: -1
	  // *        example 4: version_compare('4.1.0.52','4.01.0.51');
	  // *        returns 4: 1

	  // Important: compare must be initialized at 0.
	  var i = 0,
	    x = 0,
	    compare = 0,
	    // vm maps textual PHP versions to negatives so they're less than 0.
	    // PHP currently defines these as CASE-SENSITIVE. It is important to
	    // leave these as negatives so that they can come before numerical versions
	    // and as if no letters were there to begin with.
	    // (1alpha is < 1 and < 1.1 but > 1dev1)
	    // If a non-numerical value can't be mapped to this table, it receives
	    // -7 as its value.
	    vm = {
	      'dev': -6,
	      'alpha': -5,
	      'a': -5,
	      'beta': -4,
	      'b': -4,
	      'RC': -3,
	      'rc': -3,
	      '#': -2,
	      'p': 1,
	      'pl': 1
	    },
	    // This function will be called to prepare each version argument.
	    // It replaces every _, -, and + with a dot.
	    // It surrounds any nonsequence of numbers/dots with dots.
	    // It replaces sequences of dots with a single dot.
	    //    version_compare('4..0', '4.0') == 0
	    // Important: A string of 0 length needs to be converted into a value
	    // even less than an unexisting value in vm (-7), hence [-8].
	    // It's also important to not strip spaces because of this.
	    //   version_compare('', ' ') == 1
	    prepVersion = function (v) {
	      v = ('' + v).replace(/[_\-+]/g, '.');
	      v = v.replace(/([^.\d]+)/g, '.$1.').replace(/\.{2,}/g, '.');
	      return (!v.length ? [-8] : v.split('.'));
	    },
	    // This converts a version component to a number.
	    // Empty component becomes 0.
	    // Non-numerical component becomes a negative number.
	    // Numerical component becomes itself as an integer.
	    numVersion = function (v) {
	      return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
	    };

	  v1 = prepVersion(v1);
	  v2 = prepVersion(v2);
	  x = Math.max(v1.length, v2.length);
	  for (i = 0; i < x; i++) {
	    if (v1[i] == v2[i]) {
	      continue;
	    }
	    v1[i] = numVersion(v1[i]);
	    v2[i] = numVersion(v2[i]);
	    if (v1[i] < v2[i]) {
	      compare = -1;
	      break;
	    } else if (v1[i] > v2[i]) {
	      compare = 1;
	      break;
	    }
	  }
	  if (!operator) {
	    return compare;
	  }

	  // Important: operator is CASE-SENSITIVE.
	  // "No operator" seems to be treated as "<."
	  // Any other values seem to make the function return null.
	  switch (operator) {
	  case '>':
	  case 'gt':
	    return (compare > 0);
	  case '>=':
	  case 'ge':
	    return (compare >= 0);
	  case '<=':
	  case 'le':
	    return (compare <= 0);
	  case '==':
	  case '=':
	  case 'eq':
	    return (compare === 0);
	  case '<>':
	  case '!=':
	  case 'ne':
	    return (compare !== 0);
	  case '':
	  case '<':
	  case 'lt':
	    return (compare < 0);
	  default:
	    return null;
	  }
	}


	var can = (function() {
		var caps = {
			access_global_ns: function () {
				return !!window.moxie;
			},

			create_canvas: function() {
				// On the S60 and BB Storm, getContext exists, but always returns undefined
				// so we actually have to call getContext() to verify
				// github.com/Modernizr/Modernizr/issues/issue/97/
				var el = document.createElement('canvas');
				var isSupported = !!(el.getContext && el.getContext('2d'));
				caps.create_canvas = isSupported;
				return isSupported;
			},

			filter_by_extension: function() { // if you know how to feature-detect this, please suggest
				return !(
					(Env.browser === 'Chrome' && Env.verComp(Env.version, 28, '<')) ||
					(Env.browser === 'IE' && Env.verComp(Env.version, 10, '<')) ||
					(Env.browser === 'Safari' && Env.verComp(Env.version, 7, '<')) ||
					(Env.browser === 'Firefox' && Env.verComp(Env.version, 37, '<'))
				);
			},

			return_response_type: function(responseType) {
				try {
					if (Basic.inArray(responseType, ['', 'text', 'document']) !== -1) {
						return true;
					} else if (window.XMLHttpRequest) {
						var xhr = new XMLHttpRequest();
						xhr.open('get', '/'); // otherwise Gecko throws an exception
						if ('responseType' in xhr) {
							xhr.responseType = responseType;
							// as of 23.0.1271.64, Chrome switched from throwing exception to merely logging it to the console (why? o why?)
							if (xhr.responseType !== responseType) {
								return false;
							}
							return true;
						}
					}
				} catch (ex) {}
				return false;
			},

			select_file: function() {
				return Env.can('use_fileinput') && window.File;
			},

			select_folder: function() {
				return Env.can('select_file') && (
					Env.browser === 'Chrome' && Env.verComp(Env.version, 21, '>=') ||
					Env.browser === 'Firefox' && Env.verComp(Env.version, 42, '>=') // https://developer.mozilla.org/en-US/Firefox/Releases/42
				);
			},

			select_multiple: function() {
				// it is buggy on Safari Windows and iOS
				return Env.can('select_file') &&
					!(Env.browser === 'Safari' && Env.os === 'Windows') &&
					!(Env.os === 'iOS' && Env.verComp(Env.osVersion, "7.0.0", '>') && Env.verComp(Env.osVersion, "8.0.0", '<'));
			},

			summon_file_dialog: function() { // yeah... some dirty sniffing here...
				return Env.can('select_file') && !(
					(Env.browser === 'Firefox' && Env.verComp(Env.version, 4, '<')) ||
					(Env.browser === 'Opera' && Env.verComp(Env.version, 12, '<')) ||
					(Env.browser === 'IE' && Env.verComp(Env.version, 10, '<'))
				);
			},

			use_blob_uri: function() {
				var URL = window.URL;
				caps.use_blob_uri = (URL &&
					'createObjectURL' in URL &&
					'revokeObjectURL' in URL &&
					(Env.browser !== 'IE' || Env.verComp(Env.version, '11.0.46', '>=')) // IE supports createObjectURL, but not fully, for example it fails to use it as a src for the image
				);
				return caps.use_blob_uri;
			},

			// ideas for this heavily come from Modernizr (http://modernizr.com/)
			use_data_uri: (function() {
				var du = new Image();

				du.onload = function() {
					caps.use_data_uri = (du.width === 1 && du.height === 1);
				};

				setTimeout(function() {
					du.src = "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
				}, 1);
				return false;
			}()),

			use_data_uri_over32kb: function() { // IE8
				return caps.use_data_uri && (Env.browser !== 'IE' || Env.version >= 9);
			},

			use_data_uri_of: function(bytes) {
				return (caps.use_data_uri && bytes < 33000 || caps.use_data_uri_over32kb());
			},

			use_fileinput: function() {
				if (navigator.userAgent.match(/(Android (1.0|1.1|1.5|1.6|2.0|2.1))|(Windows Phone (OS 7|8.0))|(XBLWP)|(ZuneWP)|(w(eb)?OSBrowser)|(webOS)|(Kindle\/(1.0|2.0|2.5|3.0))/)) {
					return false;
				}

				var el = document.createElement('input');
				el.setAttribute('type', 'file');
				return caps.use_fileinput = !el.disabled;
			},

			use_webgl: function() {
				var canvas = document.createElement('canvas');
				var gl = null, isSupported;
				try {
					gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
				}
				catch(e) {}

				if (!gl) { // it seems that sometimes it doesn't throw exception, but still fails to get context
					gl = null;
				}

				isSupported = !!gl;
				caps.use_webgl = isSupported; // save result of our check
				canvas = undefined;
				return isSupported;
			}
		};

		return function(cap) {
			var args = [].slice.call(arguments);
			args.shift(); // shift of cap
			return Basic.typeOf(caps[cap]) === 'function' ? caps[cap].apply(this, args) : !!caps[cap];
		};
	}());


	var uaResult = new UAParser().getResult();


	var Env = {
		can: can,

		uaParser: UAParser,

		browser: uaResult.browser.name,
		version: uaResult.browser.version,
		os: uaResult.os.name, // everybody intuitively types it in a lowercase for some reason
		osVersion: uaResult.os.version,

		verComp: version_compare
	};

	// for backward compatibility
	// @deprecated Use `Env.os` instead
	Env.OS = Env.os;

	if (MXI_DEBUG) {
		Env.debug = {
			runtime: true,
			events: false
		};

		Env.log = function() {

			function logObj(data) {
				// TODO: this should recursively print out the object in a pretty way
				console.appendChild(document.createTextNode(data + "\n"));
			}

			// if debugger present, IE8 might have window.console.log method, but not be able to apply on it (why...)
			if (window && window.console && window.console.log && window.console.log.apply) {
				window.console.log.apply(window.console, arguments);
			} else if (document) {
				var console = document.getElementById('moxie-console');
				if (!console) {
					console = document.createElement('pre');
					console.id = 'moxie-console';
					//console.style.display = 'none';
					document.body.appendChild(console);
				}

				var data = arguments[0];
				if (Basic.typeOf(data) === 'string') {
					data = Basic.sprintf.apply(this, arguments);
				} else if (Basic.inArray(Basic.typeOf(data), ['object', 'array']) !== -1) {
					logObj(data);
					return;
				}

				console.appendChild(document.createTextNode(data + "\n"));
			}
		};
	}

	return Env;
});

// Included from: src/moxie/src/javascript/core/utils/Dom.js

/**
 * Dom.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Dom
@public
@static
*/

define('moxie/core/utils/Dom', ['moxie/core/utils/Env'], function(Env) {

	/**
	Get DOM Element by it's id.

	@method get
	@param {String} id Identifier of the DOM Element
	@return {DOMElement}
	*/
	var get = function(id) {
		if (typeof id !== 'string') {
			return id;
		}
		return document.getElementById(id);
	};

	/**
	Checks if specified DOM element has specified class.

	@method hasClass
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Class name
	*/
	var hasClass = function(obj, name) {
		if (!obj.className) {
			return false;
		}

		var regExp = new RegExp("(^|\\s+)"+name+"(\\s+|$)");
		return regExp.test(obj.className);
	};

	/**
	Adds specified className to specified DOM element.

	@method addClass
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Class name
	*/
	var addClass = function(obj, name) {
		if (!hasClass(obj, name)) {
			obj.className = !obj.className ? name : obj.className.replace(/\s+$/, '') + ' ' + name;
		}
	};

	/**
	Removes specified className from specified DOM element.

	@method removeClass
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Class name
	*/
	var removeClass = function(obj, name) {
		if (obj.className) {
			var regExp = new RegExp("(^|\\s+)"+name+"(\\s+|$)");
			obj.className = obj.className.replace(regExp, function($0, $1, $2) {
				return $1 === ' ' && $2 === ' ' ? ' ' : '';
			});
		}
	};

	/**
	Returns a given computed style of a DOM element.

	@method getStyle
	@static
	@param {Object} obj DOM element like object.
	@param {String} name Style you want to get from the DOM element
	*/
	var getStyle = function(obj, name) {
		if (obj.currentStyle) {
			return obj.currentStyle[name];
		} else if (window.getComputedStyle) {
			return window.getComputedStyle(obj, null)[name];
		}
	};


	/**
	Returns the absolute x, y position of an Element. The position will be returned in a object with x, y fields.

	@method getPos
	@static
	@param {Element} node HTML element or element id to get x, y position from.
	@param {Element} root Optional root element to stop calculations at.
	@return {object} Absolute position of the specified element object with x, y fields.
	*/
	var getPos = function(node, root) {
		var x = 0, y = 0, parent, doc = document, nodeRect;

		node = node;
		root = root || doc.body;

		parent = node;
		while (parent && parent != root && parent.nodeType) {
			x += parent.offsetLeft || 0;
			y += parent.offsetTop || 0;
			parent = parent.offsetParent;
		}

		parent = node.parentNode;
		while (parent && parent != root && parent.nodeType) {
			x -= parent.scrollLeft || 0;
			y -= parent.scrollTop || 0;
			parent = parent.parentNode;
		}

		return {
			x : x,
			y : y
		};
	};

	/**
	Returns the size of the specified node in pixels.

	@method getSize
	@static
	@param {Node} node Node to get the size of.
	@return {Object} Object with a w and h property.
	*/
	var getSize = function(node) {
		return {
			w : node.offsetWidth || node.clientWidth,
			h : node.offsetHeight || node.clientHeight
		};
	};

	return {
		get: get,
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		getStyle: getStyle,
		getPos: getPos,
		getSize: getSize
	};
});

// Included from: src/moxie/src/javascript/core/utils/Events.js

/**
 * Events.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Events
@public
@static
*/

define('moxie/core/utils/Events', [
	'moxie/core/utils/Basic'
], function(Basic) {
	var eventhash = {}, uid = 'moxie_' + Basic.guid();

	/**
	Adds an event handler to the specified object and store reference to the handler
	in objects internal Plupload registry (@see removeEvent).

	@method addEvent
	@static
	@param {Object} obj DOM element like object to add handler to.
	@param {String} name Name to add event listener to.
	@param {Function} callback Function to call when event occurs.
	@param {String} [key] that might be used to add specifity to the event record.
	*/
	var addEvent = function(obj, name, func, key) {
		var events;

		name = name.toLowerCase();

		// Add event listener
		obj.addEventListener(name, func, false);

		// Log event handler to objects internal mOxie registry
		if (!obj[uid]) {
			obj[uid] = Basic.guid();
		}

		if (!eventhash.hasOwnProperty(obj[uid])) {
			eventhash[obj[uid]] = {};
		}

		events = eventhash[obj[uid]];

		if (!events.hasOwnProperty(name)) {
			events[name] = [];
		}

		events[name].push({
			func: func,
			key: key
		});
	};


	/**
	Remove event handler from the specified object. If third argument (callback)
	is not specified remove all events with the specified name.

	@method removeEvent
	@static
	@param {Object} obj DOM element to remove event listener(s) from.
	@param {String} name Name of event listener to remove.
	@param {Function|String} [callback] might be a callback or unique key to match.
	*/
	var removeEvent = function(obj, name, callback) {
		var type, undef;

		name = name.toLowerCase();

		if (obj[uid] && eventhash[obj[uid]] && eventhash[obj[uid]][name]) {
			type = eventhash[obj[uid]][name];
		} else {
			return;
		}

		for (var i = type.length - 1; i >= 0; i--) {
			// undefined or not, key should match
			if (type[i].func === callback || type[i].key === callback) {
				obj.removeEventListener(name, type[i].func, false);

				type[i].func = null;
				type.splice(i, 1);

				// If callback was passed we are done here, otherwise proceed
				if (callback !== undef) {
					break;
				}
			}
		}

		// If event array got empty, remove it
		if (!type.length) {
			delete eventhash[obj[uid]][name];
		}

		// If mOxie registry has become empty, remove it
		if (Basic.isEmptyObj(eventhash[obj[uid]])) {
			delete eventhash[obj[uid]];

			// IE doesn't let you remove DOM object property with - delete
			try {
				delete obj[uid];
			} catch(e) {
				obj[uid] = undef;
			}
		}
	};


	/**
	Remove all kind of events from the specified object

	@method removeAllEvents
	@static
	@param {Object} obj DOM element to remove event listeners from.
	@param {String} [key] unique key to match, when removing events.
	*/
	var removeAllEvents = function(obj, key) {
		if (!obj || !obj[uid]) {
			return;
		}

		Basic.each(eventhash[obj[uid]], function(events, name) {
			removeEvent(obj, name, key);
		});
	};

	return {
		addEvent: addEvent,
		removeEvent: removeEvent,
		removeAllEvents: removeAllEvents
	};
});

// Included from: src/moxie/src/javascript/core/utils/Url.js

/**
 * Url.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Url
@public
@static
*/

define('moxie/core/utils/Url', [
	'moxie/core/utils/Basic'
], function(Basic) {
	/**
	Parse url into separate components and fill in absent parts with parts from current url,
	based on https://raw.github.com/kvz/phpjs/master/functions/url/parse_url.js

	@method parseUrl
	@static
	@param {String} url Url to parse (defaults to empty string if undefined)
	@return {Object} Hash containing extracted uri components
	*/
	var parseUrl = function(url, currentUrl) {
		var key = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
		, i = key.length
		, ports = {
			http: 80,
			https: 443
		}
		, uri = {}
		, regex = /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@\/]*):?([^:@\/]*))?@)?(\[[\da-fA-F:]+\]|[^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/
		, m = regex.exec(url || '')
		, isRelative
		, isSchemeLess = /^\/\/\w/.test(url)
		;

		switch (Basic.typeOf(currentUrl)) {
			case 'undefined':
				currentUrl = parseUrl(document.location.href, false);
				break;

			case 'string':
				currentUrl = parseUrl(currentUrl, false);
				break;
		}

		while (i--) {
			if (m[i]) {
				uri[key[i]] = m[i];
			}
		}

		isRelative = !isSchemeLess && !uri.scheme;

		if (isSchemeLess || isRelative) {
			uri.scheme = currentUrl.scheme;
		}

		// when url is relative, we set the origin and the path ourselves
		if (isRelative) {
			uri.host = currentUrl.host;
			uri.port = currentUrl.port;

			var path = '';
			// for urls without trailing slash we need to figure out the path
			if (/^[^\/]/.test(uri.path)) {
				path = currentUrl.path;
				// if path ends with a filename, strip it
				if (/\/[^\/]*\.[^\/]*$/.test(path)) {
					path = path.replace(/\/[^\/]+$/, '/');
				} else {
					// avoid double slash at the end (see #127)
					path = path.replace(/\/?$/, '/');
				}
			}
			uri.path = path + (uri.path || ''); // site may reside at domain.com or domain.com/subdir
		}

		if (!uri.port) {
			uri.port = ports[uri.scheme] || 80;
		}

		uri.port = parseInt(uri.port, 10);

		if (!uri.path) {
			uri.path = "/";
		}

		delete uri.source;

		return uri;
	};

	/**
	Resolve url - among other things will turn relative url to absolute

	@method resolveUrl
	@static
	@param {String|Object} url Either absolute or relative, or a result of parseUrl call
	@return {String} Resolved, absolute url
	*/
	var resolveUrl = function(url) {
		var ports = { // we ignore default ports
			http: 80,
			https: 443
		}
		, urlp = typeof(url) === 'object' ? url : parseUrl(url);

		return urlp.scheme + '://' + urlp.host + (urlp.port !== ports[urlp.scheme] ? ':' + urlp.port : '') + urlp.path + (urlp.query ? urlp.query : '');
	};

	/**
	Check if specified url has the same origin as the current document

	@method hasSameOrigin
	@static
	@param {String|Object} url
	@return {Boolean}
	*/
	var hasSameOrigin = function(url) {
		function origin(url) {
			return [url.scheme, url.host, url.port].join('/');
		}

		if (typeof url === 'string') {
			url = parseUrl(url);
		}

		return origin(parseUrl()) === origin(url);
	};

	return {
		parseUrl: parseUrl,
		resolveUrl: resolveUrl,
		hasSameOrigin: hasSameOrigin
	};
});

// Included from: src/moxie/src/javascript/core/I18n.js

/**
 * I18n.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/core/I18n", [
	"moxie/core/utils/Basic"
], function(Basic) {
	var i18n = {};

	/**
	@class moxie/core/I18n
	*/
	return {
		/**
		 * Extends the language pack object with new items.
		 *
		 * @param {Object} pack Language pack items to add.
		 * @return {Object} Extended language pack object.
		 */
		addI18n: function(pack) {
			return Basic.extend(i18n, pack);
		},

		/**
		 * Translates the specified string by checking for the english string in the language pack lookup.
		 *
		 * @param {String} str String to look for.
		 * @return {String} Translated string or the input string if it wasn't found.
		 */
		translate: function(str) {
			return i18n[str] || str;
		},

		/**
		 * Shortcut for translate function
		 *
		 * @param {String} str String to look for.
		 * @return {String} Translated string or the input string if it wasn't found.
		 */
		_: function(str) {
			return this.translate(str);
		},

		/**
		 * Pseudo sprintf implementation - simple way to replace tokens with specified values.
		 *
		 * @param {String} str String with tokens
		 * @return {String} String with replaced tokens
		 */
		sprintf: function(str) {
			var args = [].slice.call(arguments, 1);

			return str.replace(/%[a-z]/g, function() {
				var value = args.shift();
				return Basic.typeOf(value) !== 'undefined' ? value : '';
			});
		}
	};
});

// Included from: src/moxie/src/javascript/core/utils/Mime.js

/**
 * Mime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Mime
@public
@static
*/

define("moxie/core/utils/Mime", [
	"moxie/core/utils/Basic",
	"moxie/core/I18n"
], function(Basic, I18n) {

	var mimeData = "" +
		"application/msword,doc dot," +
		"application/pdf,pdf," +
		"application/pgp-signature,pgp," +
		"application/postscript,ps ai eps," +
		"application/rtf,rtf," +
		"application/vnd.ms-excel,xls xlb xlt xla," +
		"application/vnd.ms-powerpoint,ppt pps pot ppa," +
		"application/zip,zip," +
		"application/x-shockwave-flash,swf swfl," +
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document,docx," +
		"application/vnd.openxmlformats-officedocument.wordprocessingml.template,dotx," +
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,xlsx," +
		"application/vnd.openxmlformats-officedocument.presentationml.presentation,pptx," +
		"application/vnd.openxmlformats-officedocument.presentationml.template,potx," +
		"application/vnd.openxmlformats-officedocument.presentationml.slideshow,ppsx," +
		"application/x-javascript,js," +
		"application/json,json," +
		"audio/mpeg,mp3 mpga mpega mp2," +
		"audio/x-wav,wav," +
		"audio/x-m4a,m4a," +
		"audio/ogg,oga ogg," +
		"audio/aiff,aiff aif," +
		"audio/flac,flac," +
		"audio/aac,aac," +
		"audio/ac3,ac3," +
		"audio/x-ms-wma,wma," +
		"image/bmp,bmp," +
		"image/gif,gif," +
		"image/jpeg,jpg jpeg jpe," +
		"image/photoshop,psd," +
		"image/png,png," +
		"image/svg+xml,svg svgz," +
		"image/tiff,tiff tif," +
		"text/plain,asc txt text diff log," +
		"text/html,htm html xhtml," +
		"text/css,css," +
		"text/csv,csv," +
		"text/rtf,rtf," +
		"video/mpeg,mpeg mpg mpe m2v," +
		"video/quicktime,qt mov," +
		"video/mp4,mp4," +
		"video/x-m4v,m4v," +
		"video/x-flv,flv," +
		"video/x-ms-wmv,wmv," +
		"video/avi,avi," +
		"video/webm,webm," +
		"video/3gpp,3gpp 3gp," +
		"video/3gpp2,3g2," +
		"video/vnd.rn-realvideo,rv," +
		"video/ogg,ogv," +
		"video/x-matroska,mkv," +
		"application/vnd.oasis.opendocument.formula-template,otf," +
		"application/octet-stream,exe";


	/**
	 * Map of mimes to extensions
	 *
	 * @property mimes
	 * @type {Object}
	 */
	var mimes = {};

	/**
	 * Map of extensions to mimes
	 *
	 * @property extensions
	 * @type {Object}
	 */
	var extensions = {};


	/**
	* Parses mimeData string into a mimes and extensions lookup maps. String should have the
	* following format:
	*
	* application/msword,doc dot,application/pdf,pdf, ...
	*
	* so mime-type followed by comma and followed by space-separated list of associated extensions,
	* then comma again and then another mime-type, etc.
	*
	* If invoked externally will replace override internal lookup maps with user-provided data.
	*
	* @method addMimeType
	* @param {String} mimeData
	*/
	var addMimeType = function (mimeData) {
		var items = mimeData.split(/,/), i, ii, ext;

		for (i = 0; i < items.length; i += 2) {
			ext = items[i + 1].split(/ /);

			// extension to mime lookup
			for (ii = 0; ii < ext.length; ii++) {
				mimes[ext[ii]] = items[i];
			}
			// mime to extension lookup
			extensions[items[i]] = ext;
		}
	};


	var extList2mimes = function (filters, addMissingExtensions) {
		var ext, i, ii, type, mimes = [];

		// convert extensions to mime types list
		for (i = 0; i < filters.length; i++) {
			ext = filters[i].extensions.toLowerCase().split(/\s*,\s*/);

			for (ii = 0; ii < ext.length; ii++) {

				// if there's an asterisk in the list, then accept attribute is not required
				if (ext[ii] === '*') {
					return [];
				}

				type = mimes[ext[ii]];

				// future browsers should filter by extension, finally
				if (addMissingExtensions && /^\w+$/.test(ext[ii])) {
					mimes.push('.' + ext[ii]);
				} else if (type && Basic.inArray(type, mimes) === -1) {
					mimes.push(type);
				} else if (!type) {
					// if we have no type in our map, then accept all
					return [];
				}
			}
		}
		return mimes;
	};


	var mimes2exts = function(mimes) {
		var exts = [];

		Basic.each(mimes, function(mime) {
			mime = mime.toLowerCase();

			if (mime === '*') {
				exts = [];
				return false;
			}

			// check if this thing looks like mime type
			var m = mime.match(/^(\w+)\/(\*|\w+)$/);
			if (m) {
				if (m[2] === '*') {
					// wildcard mime type detected
					Basic.each(extensions, function(arr, mime) {
						if ((new RegExp('^' + m[1] + '/')).test(mime)) {
							[].push.apply(exts, extensions[mime]);
						}
					});
				} else if (extensions[mime]) {
					[].push.apply(exts, extensions[mime]);
				}
			}
		});
		return exts;
	};


	var mimes2extList = function(mimes) {
		var accept = [], exts = [];

		if (Basic.typeOf(mimes) === 'string') {
			mimes = Basic.trim(mimes).split(/\s*,\s*/);
		}

		exts = mimes2exts(mimes);

		accept.push({
			title: I18n.translate('Files'),
			extensions: exts.length ? exts.join(',') : '*'
		});

		return accept;
	};

	/**
	 * Extract extension from the given filename
	 *
	 * @method getFileExtension
	 * @param {String} fileName
	 * @return {String} File extension
	 */
	var getFileExtension = function(fileName) {
		var matches = fileName && fileName.match(/\.([^.]+)$/);
		if (matches) {
			return matches[1].toLowerCase();
		}
		return '';
	};


	/**
	 * Get file mime-type from it's filename - will try to match the extension
	 * against internal mime-type lookup map
	 *
	 * @method getFileMime
	 * @param {String} fileName
	 * @return File mime-type if found or an empty string if not
	 */
	var getFileMime = function(fileName) {
		return mimes[getFileExtension(fileName)] || '';
	};


	addMimeType(mimeData);

	return {
		mimes: mimes,
		extensions: extensions,
		addMimeType: addMimeType,
		extList2mimes: extList2mimes,
		mimes2exts: mimes2exts,
		mimes2extList: mimes2extList,
		getFileExtension: getFileExtension,
		getFileMime: getFileMime
	};
});

// Included from: src/moxie/src/javascript/core/Exceptions.js

/**
 * Exceptions.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/Exceptions', [
	'moxie/core/utils/Basic'
], function(Basic) {
	
	function _findKey(obj, value) {
		var key;
		for (key in obj) {
			if (obj[key] === value) {
				return key;
			}
		}
		return null;
	}

	/**
	@class moxie/core/Exception
	*/
	return {
		RuntimeError: (function() {
			var namecodes = {
				NOT_INIT_ERR: 1,
				EXCEPTION_ERR: 3,
				NOT_SUPPORTED_ERR: 9,
				JS_ERR: 4
			};

			function RuntimeError(code, message) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + (message || ": RuntimeError " + this.code);
			}
			
			Basic.extend(RuntimeError, namecodes);
			RuntimeError.prototype = Error.prototype;
			return RuntimeError;
		}()),
		
		OperationNotAllowedException: (function() {
			
			function OperationNotAllowedException(code) {
				this.code = code;
				this.name = 'OperationNotAllowedException';
			}
			
			Basic.extend(OperationNotAllowedException, {
				NOT_ALLOWED_ERR: 1
			});
			
			OperationNotAllowedException.prototype = Error.prototype;
			
			return OperationNotAllowedException;
		}()),

		ImageError: (function() {
			var namecodes = {
				WRONG_FORMAT: 1,
				MAX_RESOLUTION_ERR: 2,
				INVALID_META_ERR: 3
			};

			function ImageError(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": ImageError " + this.code;
			}
			
			Basic.extend(ImageError, namecodes);
			ImageError.prototype = Error.prototype;

			return ImageError;
		}()),

		FileException: (function() {
			var namecodes = {
				NOT_FOUND_ERR: 1,
				SECURITY_ERR: 2,
				ABORT_ERR: 3,
				NOT_READABLE_ERR: 4,
				ENCODING_ERR: 5,
				NO_MODIFICATION_ALLOWED_ERR: 6,
				INVALID_STATE_ERR: 7,
				SYNTAX_ERR: 8
			};

			function FileException(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": FileException " + this.code;
			}
			
			Basic.extend(FileException, namecodes);
			FileException.prototype = Error.prototype;
			return FileException;
		}()),
		
		DOMException: (function() {
			var namecodes = {
				INDEX_SIZE_ERR: 1,
				DOMSTRING_SIZE_ERR: 2,
				HIERARCHY_REQUEST_ERR: 3,
				WRONG_DOCUMENT_ERR: 4,
				INVALID_CHARACTER_ERR: 5,
				NO_DATA_ALLOWED_ERR: 6,
				NO_MODIFICATION_ALLOWED_ERR: 7,
				NOT_FOUND_ERR: 8,
				NOT_SUPPORTED_ERR: 9,
				INUSE_ATTRIBUTE_ERR: 10,
				INVALID_STATE_ERR: 11,
				SYNTAX_ERR: 12,
				INVALID_MODIFICATION_ERR: 13,
				NAMESPACE_ERR: 14,
				INVALID_ACCESS_ERR: 15,
				VALIDATION_ERR: 16,
				TYPE_MISMATCH_ERR: 17,
				SECURITY_ERR: 18,
				NETWORK_ERR: 19,
				ABORT_ERR: 20,
				URL_MISMATCH_ERR: 21,
				QUOTA_EXCEEDED_ERR: 22,
				TIMEOUT_ERR: 23,
				INVALID_NODE_TYPE_ERR: 24,
				DATA_CLONE_ERR: 25
			};

			function DOMException(code) {
				this.code = code;
				this.name = _findKey(namecodes, code);
				this.message = this.name + ": DOMException " + this.code;
			}
			
			Basic.extend(DOMException, namecodes);
			DOMException.prototype = Error.prototype;
			return DOMException;
		}()),
		
		EventException: (function() {
			function EventException(code) {
				this.code = code;
				this.name = 'EventException';
			}
			
			Basic.extend(EventException, {
				UNSPECIFIED_EVENT_TYPE_ERR: 0
			});
			
			EventException.prototype = Error.prototype;
			
			return EventException;
		}())
	};
});

// Included from: src/moxie/src/javascript/core/EventTarget.js

/**
 * EventTarget.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/core/EventTarget', [
	'moxie/core/utils/Env',
	'moxie/core/Exceptions',
	'moxie/core/utils/Basic'
], function(Env, x, Basic) {

	// hash of event listeners by object uid
	var eventpool = {};

	/**
	Parent object for all event dispatching components and objects

	@class moxie/core/EventTarget
	@constructor EventTarget
	*/
	function EventTarget() {
		/**
		Unique id of the event dispatcher, usually overriden by children

		@property uid
		@type String
		*/
		this.uid = Basic.guid();
	}


	Basic.extend(EventTarget.prototype, {

		/**
		Can be called from within a child  in order to acquire uniqie id in automated manner

		@method init
		*/
		init: function() {
			if (!this.uid) {
				this.uid = Basic.guid('uid_');
			}
		},

		/**
		Register a handler to a specific event dispatched by the object

		@method addEventListener
		@param {String} type Type or basically a name of the event to subscribe to
		@param {Function} fn Callback function that will be called when event happens
		@param {Number} [priority=0] Priority of the event handler - handlers with higher priorities will be called first
		@param {Object} [scope=this] A scope to invoke event handler in
		*/
		addEventListener: function(type, fn, priority, scope) {
			var self = this, list;

			// without uid no event handlers can be added, so make sure we got one
			if (!this.hasOwnProperty('uid')) {
				this.uid = Basic.guid('uid_');
			}

			type = Basic.trim(type);

			if (/\s/.test(type)) {
				// multiple event types were passed for one handler
				Basic.each(type.split(/\s+/), function(type) {
					self.addEventListener(type, fn, priority, scope);
				});
				return;
			}

			type = type.toLowerCase();
			priority = parseInt(priority, 10) || 0;

			list = eventpool[this.uid] && eventpool[this.uid][type] || [];
			list.push({fn : fn, priority : priority, scope : scope || this});

			if (!eventpool[this.uid]) {
				eventpool[this.uid] = {};
			}
			eventpool[this.uid][type] = list;
		},

		/**
		Check if any handlers were registered to the specified event

		@method hasEventListener
		@param {String} [type] Type or basically a name of the event to check
		@return {Mixed} Returns a handler if it was found and false, if - not
		*/
		hasEventListener: function(type) {
			var list;
			if (type) {
				type = type.toLowerCase();
				list = eventpool[this.uid] && eventpool[this.uid][type];
			} else {
				list = eventpool[this.uid];
			}
			return list ? list : false;
		},

		/**
		Unregister the handler from the event, or if former was not specified - unregister all handlers

		@method removeEventListener
		@param {String} type Type or basically a name of the event
		@param {Function} [fn] Handler to unregister
		*/
		removeEventListener: function(type, fn) {
			var self = this, list, i;

			type = type.toLowerCase();

			if (/\s/.test(type)) {
				// multiple event types were passed for one handler
				Basic.each(type.split(/\s+/), function(type) {
					self.removeEventListener(type, fn);
				});
				return;
			}

			list = eventpool[this.uid] && eventpool[this.uid][type];

			if (list) {
				if (fn) {
					for (i = list.length - 1; i >= 0; i--) {
						if (list[i].fn === fn) {
							list.splice(i, 1);
							break;
						}
					}
				} else {
					list = [];
				}

				// delete event list if it has become empty
				if (!list.length) {
					delete eventpool[this.uid][type];

					// and object specific entry in a hash if it has no more listeners attached
					if (Basic.isEmptyObj(eventpool[this.uid])) {
						delete eventpool[this.uid];
					}
				}
			}
		},

		/**
		Remove all event handlers from the object

		@method removeAllEventListeners
		*/
		removeAllEventListeners: function() {
			if (eventpool[this.uid]) {
				delete eventpool[this.uid];
			}
		},

		/**
		Dispatch the event

		@method dispatchEvent
		@param {String/Object} Type of event or event object to dispatch
		@param {Mixed} [...] Variable number of arguments to be passed to a handlers
		@return {Boolean} true by default and false if any handler returned false
		*/
		dispatchEvent: function(type) {
			var uid, list, args, tmpEvt, evt = {}, result = true, undef;

			if (Basic.typeOf(type) !== 'string') {
				// we can't use original object directly (because of Silverlight)
				tmpEvt = type;

				if (Basic.typeOf(tmpEvt.type) === 'string') {
					type = tmpEvt.type;

					if (tmpEvt.total !== undef && tmpEvt.loaded !== undef) { // progress event
						evt.total = tmpEvt.total;
						evt.loaded = tmpEvt.loaded;
					}
					evt.async = tmpEvt.async || false;
				} else {
					throw new x.EventException(x.EventException.UNSPECIFIED_EVENT_TYPE_ERR);
				}
			}

			// check if event is meant to be dispatched on an object having specific uid
			if (type.indexOf('::') !== -1) {
				(function(arr) {
					uid = arr[0];
					type = arr[1];
				}(type.split('::')));
			} else {
				uid = this.uid;
			}

			type = type.toLowerCase();

			list = eventpool[uid] && eventpool[uid][type];

			if (list) {
				// sort event list by prority
				list.sort(function(a, b) { return b.priority - a.priority; });

				args = [].slice.call(arguments);

				// first argument will be pseudo-event object
				args.shift();
				evt.type = type;
				args.unshift(evt);

				if (MXI_DEBUG && Env.debug.events) {
					Env.log("%cEvent '%s' fired on %s", 'color: #999;', evt.type, (this.ctorName ? this.ctorName + '::' : '') + uid);
				}

				// Dispatch event to all listeners
				var queue = [];
				Basic.each(list, function(handler) {
					// explicitly set the target, otherwise events fired from shims do not get it
					args[0].target = handler.scope;
					// if event is marked as async, detach the handler
					if (evt.async) {
						queue.push(function(cb) {
							setTimeout(function() {
								cb(handler.fn.apply(handler.scope, args) === false);
							}, 1);
						});
					} else {
						queue.push(function(cb) {
							cb(handler.fn.apply(handler.scope, args) === false); // if handler returns false stop propagation
						});
					}
				});
				if (queue.length) {
					Basic.inSeries(queue, function(err) {
						result = !err;
					});
				}
			}
			return result;
		},

		/**
		Register a handler to the event type that will run only once

		@method bindOnce
		@since >1.4.1
		@param {String} type Type or basically a name of the event to subscribe to
		@param {Function} fn Callback function that will be called when event happens
		@param {Number} [priority=0] Priority of the event handler - handlers with higher priorities will be called first
		@param {Object} [scope=this] A scope to invoke event handler in
		*/
		bindOnce: function(type, fn, priority, scope) {
			var self = this;
			self.bind.call(this, type, function cb() {
				self.unbind(type, cb);
				return fn.apply(this, arguments);
			}, priority, scope);
		},

		/**
		Alias for addEventListener

		@method bind
		@protected
		*/
		bind: function() {
			this.addEventListener.apply(this, arguments);
		},

		/**
		Alias for removeEventListener

		@method unbind
		@protected
		*/
		unbind: function() {
			this.removeEventListener.apply(this, arguments);
		},

		/**
		Alias for removeAllEventListeners

		@method unbindAll
		@protected
		*/
		unbindAll: function() {
			this.removeAllEventListeners.apply(this, arguments);
		},

		/**
		Alias for dispatchEvent

		@method trigger
		@protected
		*/
		trigger: function() {
			return this.dispatchEvent.apply(this, arguments);
		},


		/**
		Handle properties of on[event] type.

		@method handleEventProps
		@private
		*/
		handleEventProps: function(dispatches) {
			var self = this;

			this.bind(dispatches.join(' '), function(e) {
				var prop = 'on' + e.type.toLowerCase();
				if (Basic.typeOf(this[prop]) === 'function') {
					this[prop].apply(this, arguments);
				}
			});

			// object must have defined event properties, even if it doesn't make use of them
			Basic.each(dispatches, function(prop) {
				prop = 'on' + prop.toLowerCase(prop);
				if (Basic.typeOf(self[prop]) === 'undefined') {
					self[prop] = null;
				}
			});
		}

	});


	EventTarget.instance = new EventTarget();

	return EventTarget;
});

// Included from: src/moxie/src/javascript/file/BlobRef.js

/**
 * BlobRef.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/BlobRef', [
	'moxie/core/utils/Basic'
], function(Basic) {

	var blobpool = {};

	/**
	@class moxie/file/BlobRef
	@constructor
	@param {Object} blob Object "Native" blob object, as it is represented in the runtime
	*/
	function BlobRef(blob) {
		// originally the first argument was runtime uid, but then we got rid of runtimes
		// however lets better retain backward compatibility here
		if (Basic.typeOf(blob) !== 'object' && Basic.typeOf(arguments[1]) !== 'undefined') {
			blob = arguments[1];
		}

		if (!blob) {
			blob = {};
		}

		Basic.extend(this, {

			/**
			Unique id of the component

			@property uid
			@type {String}
			*/
			uid: blob.uid || Basic.guid('uid_'),

			/**
			Size of blob

			@property size
			@type {Number}
			@default 0
			*/
			size: blob.size || 0,

			/**
			Mime type of blob

			@property type
			@type {String}
			@default ''
			*/
			type: blob.type || '',

			/**
			@method slice
			@param {Number} [start=0]
			@param {Number} [end=blob.size]
			@param {String} [type] Content Mime type
			*/
			slice: function() {
				return new BlobRef(blob.slice.apply(blob, arguments));
			},

			/**
			Returns "native" blob object (as it is represented in connected runtime) or null if not found

			@method getSource
			@return {BlobRef} Returns "native" blob object or null if not found
			*/
			getSource: function() {
				if (!blobpool[this.uid]) {
					return null;
				}
				return blobpool[this.uid];
			},

			/**
			Destroy BlobRef and free any resources it was using

			@method destroy
			*/
			destroy: function() {
				delete blobpool[this.uid];
			}
		});


		blobpool[this.uid] = blob;
	}

	return BlobRef;
});

// Included from: src/moxie/src/javascript/file/FileRef.js

/**
 * FileRef.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileRef', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Mime',
	'moxie/file/BlobRef'
], function(Basic, Mime, BlobRef) {
	/**
	@class moxie/file/FileRef
	@extends BlobRef
	@constructor
	@param {Object} file Object "Native" file object, as it is represented in the runtime
	*/
	function FileRef(file) {
		// originally the first argument was runtime uid, but then we got rid of runtimes
		// however lets better retain backward compatibility here
		if (Basic.typeOf(file) !== 'object' && Basic.typeOf(arguments[1]) !== 'undefined') {
			file = arguments[1];
		}

		BlobRef.apply(this, arguments);

		// if type was not set by BlobRef constructor and we have a clue, try some
		if (!this.type) {
			this.type = Mime.getFileRefMime(file.name);
		}

		// sanitize file name or generate new one
		var name;
		if (file.name) {
			name = file.name.replace(/\\/g, '/'); // this is weird, but I think this was meant to extract the file name from the URL
			name = name.substr(name.lastIndexOf('/') + 1);
		} else if (this.type) {
			var prefix = this.type.split('/')[0];
			name = Basic.guid((prefix !== '' ? prefix : 'file') + '_');

			if (Mime.extensions[this.type]) {
				name += '.' + Mime.extensions[this.type][0]; // append proper extension if possible
			}
		}


		Basic.extend(this, {
			/**
			FileRef name

			@property name
			@type {String}
			@default UID
			*/
			name: name || Basic.guid('file_'),

			/**
			Relative path to the file inside a directory
			(in fact this property currently is the whole reason for this wrapper to exist)

			@property relativePath
			@type {String}
			@default ''
			*/
			relativePath: '',

			/**
			Date of last modification

			@property lastModifiedDate
			@type {String}
			@default now
			*/
			lastModifiedDate: file.lastModifiedDate || (new Date()).toLocaleString() // Thu Aug 23 2012 19:40:00 GMT+0400 (GET)
		});
	}

	Basic.inherit(FileRef, BlobRef);

	return FileRef;
});

// Included from: src/moxie/src/javascript/file/FileInput.js

/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileInput', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Env',
	'moxie/core/utils/Mime',
	'moxie/core/utils/Dom',
	'moxie/core/utils/Events',
	'moxie/core/EventTarget',
	'moxie/core/I18n',
	'moxie/file/FileRef'
], function(Basic, Env, Mime, Dom, Events, EventTarget, I18n, FileRef) {
	/**
	Provides a convenient way to turn any DOM element into a file-picker.

	@class moxie/file/FileInput
	@constructor
	@extends EventTarget
	@uses RuntimeClient
	@param {Object|String|DOMElement} options If options is string or node, argument is considered as _browse\_button_.
		@param {String|DOMElement} options.browse_button DOM Element to turn into file picker.
		@param {Array} [options.accept] Array of mime types to accept. By default accepts all.
		@param {Boolean} [options.multiple=false] Enable selection of multiple files.
		@param {Boolean} [options.directory=false] Turn file input into the folder input (cannot be both at the same time).
		@param {String|DOMElement} [options.container] DOM Element to use as a container for file-picker. Defaults to parentNode
		for _browse\_button_.

	@example
		<div id="container">
			<a id="file-picker" href="javascript:;">Browse...</a>
		</div>

		<script>
			var fileInput = new moxie.file.FileInput({
				browse_button: 'file-picker', // or document.getElementById('file-picker')
				container: 'container',
				accept: [
					{title: "Image files", extensions: "jpg,gif,png"} // accept only images
				],
				multiple: true // allow multiple file selection
			});

			fileInput.onchange = function(e) {
				// do something to files array
				console.info(e.target.files); // or this.files or fileInput.files
			};

			fileInput.init(); // initialize
		</script>
	*/
	var dispatches = [
		/**
		Dispatched when runtime is connected and file-picker is ready to be used.

		@event ready
		@param {Object} event
		*/
		'ready',

		/**
		Dispatched right after [ready](#event_ready) event, and whenever [refresh()](#method_refresh) is invoked.
		Check [corresponding documentation entry](#method_refresh) for more info.

		@event refresh
		@param {Object} event
		*/
		'refresh',

		/**
		Dispatched when option is getting changed (@see setOption)

		@event optionchange
		@param {Object} event
		@param {String} name
		@param {Mixed} value
		@param {Mixed} oldValue Previous value of the option
		*/
		'optionchange',

		/**
		Dispatched when selection of files in the dialog is complete.

		@event change
		@param {Object} event
		@param {Array} fileRefs Array of selected file references
		*/
		'change',

		/**
		Dispatched when mouse cursor enters file-picker area. Can be used to style element
		accordingly.

		@event mouseenter
		@param {Object} event
		*/
		'mouseenter',

		/**
		Dispatched when mouse cursor leaves file-picker area. Can be used to style element
		accordingly.

		@event mouseleave
		@param {Object} event
		*/
		'mouseleave',

		/**
		Dispatched when functional mouse button is pressed on top of file-picker area.

		@event mousedown
		@param {Object} event
		*/
		'mousedown',

		/**
		Dispatched when functional mouse button is released on top of file-picker area.

		@event mouseup
		@param {Object} event
		*/
		'mouseup',

		/**
		Dispatched when component is destroyed (just before all events are unbined).

		@event destroy
		@param {Object} event
		*/
		'destroy'
	];

	function FileInput(options) {
		if (MXI_DEBUG) {
			Env.log("Instantiating FileInput...");
		}

		var _uid = Basic.guid('mxi_');
		var _disabled = true;
		var _fileRefs = [];
		var _options;

		var _containerPosition, _browseButtonPosition, _browseButtonZindex;

		// if flat argument passed it should be browse_button id
		if (Basic.inArray(Basic.typeOf(options), ['string', 'node']) !== -1) {
			_options = { browse_button : options };
		}

		if (!Dom.get(options.browse_button)) {
			// browse button is required
			throw new Error("browse_button must be present in the DOM, prior to FileInput instantiation.");
		}

		_options = Basic.extend({
			accept: [{
				title: I18n.translate('All Files'),
				extensions: '*'
			}],
			multiple: false
		}, options);

		// normalize accept option (could be list of mime types or array of title/extensions pairs)
		if (typeof(_options.accept) === 'string') {
			_options.accept = Mime.mimes2extList(_options.accept);
		}

		Basic.extend(this, {
			/**
			Unique id of the component

			@property uid
			@protected
			@readOnly
			@type {String}
			@default UID
			*/
			uid: _uid,

			/**
			Unique id of the runtime container. Useful to get hold of it for various manipulations.

			@property shimid
			@protected
			@type {String}
			*/
			shimid: _uid + '_container',

			/**
			Array of selected File objects

			@property files
			@type {Array}
			@default null
			*/
			files: _fileRefs,

			/**
			Initializes the component and dispatches event ready when done.

			@method init
			*/
			init: function() {
				var self = this;
				var container = Dom.get(_options.container) || document.body;
				var browseButton = Dom.get(_options.browse_button);
				var shimContainer = createShimContainer.call(self);
				var input = createInput.call(self);
				var top;

				// we will be altering some initial styles, so lets save them to restore later
				_containerPosition = Dom.getStyle(container, 'position');
				_browseButtonPosition = Dom.getStyle(browseButton, 'position');
				_browseButtonZindex = Dom.getStyle(browseButton, 'z-index') || 'auto';

				// it shouldn't be possible to tab into the hidden element
				(Env.can('summon_file_dialog') ? input : browseButton).setAttribute('tabindex', -1);

				/* Since we have to place input[type=file] on top of the browse_button for some browsers,
				browse_button loses interactivity, so we restore it here */
				top = Env.can('summon_file_dialog') ? browseButton : shimContainer;

				Events.addEvent(top, 'mouseover', function() {
					self.trigger('mouseenter');
				}, _uid);

				Events.addEvent(top, 'mouseout', function() {
					self.trigger('mouseleave');
				}, _uid);

				Events.addEvent(top, 'mousedown', function() {
					self.trigger('mousedown');
				}, _uid);

				Events.addEvent(container, 'mouseup', function() {
					self.trigger('mouseup');
				}, _uid);

				// Route click event to the input[type=file] element for browsers that support such behavior
				if (Env.can('summon_file_dialog')) {
					if (_browseButtonPosition === 'static') {
						browseButton.style.position = 'relative';
					}

					Events.addEvent(browseButton, 'click', function(e) {
						if (!_disabled) {
							input.click();
						}
						e.preventDefault();
					}, _uid);
				}

				// make container relative, if it's not (TODO: maybe save initial state to restore it later)
				if (_containerPosition === 'static') {
					container.style.position = 'relative';
				}

				shimContainer.appendChild(input);
				container.appendChild(shimContainer);

				self.handleEventProps(dispatches);

				self.disable(false);
				self.refresh();

				// ready event is perfectly asynchronous
				self.trigger({ type: 'ready', async: true });
			},

			/**
			Returns container for the runtime as DOM element

			@method getShimContainer
			@return {DOMElement}
			*/
			getShimContainer: function() {
				return Dom.get(this.shimid);
			},

			/**
			 * Get current option value by its name
			 *
			 * @method getOption
			 * @param name
			 * @return {Mixed}
			 */
			getOption: function(name) {
				return options[name];
			},


			/**
			 * Sets a new value for the option specified by name
			 *
			 * @method setOption
			 * @param name
			 * @param value
			 */
			setOption: function(name, value) {
				if (!_options.hasOwnProperty(name)) {
					return;
				}

				var oldValue = _options[name];
				var input = Dom.get(_uid);

				switch (name) {
					case 'accept':
						if (value) {
							var mimes = Mime.extList2mimes(value, Env.can('filter_by_extension'));
							input.setAttribute('accept', mimes.join(','));
						} else {
							input.removeAttribute('accept');
						}
						break;

					case 'directory':
						if (value && Env.can('select_folder')) {
							input.setAttribute('directory', '');
							input.setAttribute('webkitdirectory', '');
						} else {
							input.removeAttribute('directory');
							input.removeAttribute('webkitdirectory');
						}
						break;

					case 'multiple':
						if (value && Env.can('select_multiple')) {
							input.setAttribute('multiple', '');
						} else {
							input.removeAttribute('multiple');
						}
						break;

					case 'container':
						throw new Error("container option cannot be altered.");
				}

				_options[name] = value;

				this.trigger('OptionChanged', name, value, oldValue);
			},

			/**
			Disables file-picker element, so that it doesn't react to mouse clicks.

			@method disable
			@param {Boolean} [state=true] Disable component if - true, enable if - false
			*/
			disable: function(state) {
				var input = Dom.get(_uid);
				if (input) {
					input.disabled = (_disabled = state === undefined ? true : state);
				}
			},


			/**
			Reposition and resize dialog trigger to match the position and size of browse_button element.

			@method refresh
			*/
			refresh: function() {
				var self = this;
				var container = Dom.get(_options.container) || document.body;
				var browseButton = Dom.get(_options.browse_button);
				var shimContainer = self.getShimContainer();
				var zIndex = parseInt(Dom.getStyle(browseButton, 'z-index'), 10) || 0;

				if (browseButton) {
					var pos = Dom.getPos(browseButton, container);
					var size = Dom.getSize(browseButton);

					if (Env.can('summon_file_dialog')) {
						browseButton.style.zIndex = zIndex + 1;
					}

					if (shimContainer) {
						Basic.extend(shimContainer.style, {
							top: pos.y + 'px',
							left: pos.x + 'px',
							width: size.w + 'px',
							height: size.h + 'px',
							zIndex: zIndex
						});
					}
				}

				self.trigger("Refresh");
			},


			/**
			Destroy component.

			@method destroy
			*/
			destroy: function() {
				var self = this;
				var shimContainer = self.getShimContainer();
				var container = Dom.get(_options.container);
				var browseButton = Dom.get(_options.browse_button);

				if (container) {
					Events.removeAllEvents(container, _uid);
					container.style.position = _containerPosition;
				}

				if (browseButton) {
					Events.removeAllEvents(browseButton, _uid);
					Basic.extend(browseButton.style, {
						position: _browseButtonPosition,
						zIndex: _browseButtonZindex
					});
				}

				if (shimContainer) {
					Events.removeAllEvents(shimContainer, _uid);
				}

				if (Basic.typeOf(_fileRefs) === 'array') {
					// no sense in leaving associated files behind
					Basic.each(_fileRefs, function (file) {
						file.destroy();
					});
				}

				_options = null;
				_fileRefs.length = 0;

				self.trigger('Destroy');
				self.unbindAll();
			}
		});


		function createInput() {
			var self = this;
			// figure out accept string
			var mimes = Mime.extList2mimes(_options.accept, Env.can('filter_by_extension'));
			var input = document.createElement('input');

			input.id = _uid;
			input.setAttribute('type', 'file');
			input.disabled = true;

			if (_options.multiple && Env.can('select_multiple')) {
				input.multiple = true;
			}

			if (_options.directory && Env.can('select_folder')) {
				input.setAttribute('directory', 'directory');
				input.setAttribute('webkitdirectory', 'webkitdirectory');
			}

			if (mimes) {
				input.setAttribute('accept', mimes.join(','));
			}

			// prepare file input to be placed underneath the browse_button element
			Basic.extend(input.style, {
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				fontSize: '999px',
				opacity: 0,
				cursor: 'pointer'
			});

			input.onchange = function onChange() { // there should be only one handler for this
				_fileRefs.length = 0;

				Basic.each(this.files, function(file) {
					if (_options.directory) {
						// folders are represented by dots, filter them out (Chrome 11+)
						if (file.name == ".") {
							// if it looks like a folder...
							return true;
						}
					}

					var fileRef = new FileRef(null, file);
					fileRef.relativePath = file.webkitRelativePath ? '/' + file.webkitRelativePath.replace(/^\//, '') : '';

					_fileRefs.push(fileRef);
				});

				// clearing the value enables the user to select the same file again if they want to
				if (Env.browser !== 'IE' && Env.browser !== 'IEMobile') {
					this.value = '';
				} else {
					// in IE input[type="file"] is read-only so the only way to reset it is to re-insert it
					var clone = this.cloneNode(true);
					this.parentNode.replaceChild(clone, this);
					clone.onchange = onChange;
				}

				if (_fileRefs.length) {
					self.trigger('change', _fileRefs);
				}
			};

			return input;
		}

		function createShimContainer() {
			var shimContainer;

			// create shim container and insert it at an absolute position into the outer container
			shimContainer = document.createElement('div');
			shimContainer.id = this.shimid;
			shimContainer.className = 'mxi-shim';

			Basic.extend(shimContainer.style, {
				position: 'absolute',
				top: '0px',
				left: '0px',
				width: '1px',
				height: '1px',
				overflow: 'hidden'
			});

			return shimContainer;
		}
	}

	FileInput.prototype = EventTarget.instance;

	return FileInput;
});

// Included from: src/moxie/src/javascript/file/FileDrop.js

/**
 * FileDrop.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileDrop', [
	'moxie/core/I18n',
	'moxie/core/utils/Dom',
	'moxie/core/utils/Basic',
	'moxie/core/utils/Events',
	'moxie/core/utils/Env',
	'moxie/file/FileRef',
	'moxie/core/EventTarget',
	'moxie/core/utils/Mime'
], function(I18n, Dom, Basic, Events, Env, FileRef, EventTarget, Mime) {
	/**
	Turn arbitrary DOM element to a drop zone accepting files.

	@example
		<div id="drop_zone">
			Drop files here
		</div>
		<br />
		<div id="filelist"></div>

		<script type="text/javascript">
			var fileDrop = new moxie.file.FileDrop('drop_zone'), fileList = moxie.utils.Dom.get('filelist');

			fileDrop.ondrop = function() {
				moxie.utils.Basic.each(this.files, function(file) {
					fileList.innerHTML += '<div>' + file.name + '</div>';
				});
			};

			fileDrop.init();
		</script>

	@class moxie/file/FileDrop
	@constructor
	@extends EventTarget
	@uses RuntimeClient
	@param {Object|String} options If options has typeof string, argument is considered as options.drop_zone
		@param {String|DOMElement} options.drop_zone DOM Element to turn into a drop zone
		@param {Array} [options.accept] Array of mime types to accept. By default accepts all
	*/
	var dispatches = [
		/**
		Dispatched when runtime is connected and drop zone is ready to accept files.

		@event ready
		@param {Object} event
		*/
		'ready',

		/**
		Dispatched when option is getting changed (@see setOption)

		@event optionchange
		@param {Object} event
		@param {String} name
		@param {Mixed} value
		@param {Mixed} oldValue Previous value of the option
		*/
		'optionchange',

		/**
		Dispatched when dragging cursor enters the drop zone.

		@event dragenter
		@param {Object} event
		*/
		'dragenter',

		/**
		Dispatched when dragging cursor leaves the drop zone.

		@event dragleave
		@param {Object} event
		*/
		'dragleave',

		/**
		Dispatched when file is dropped onto the drop zone.

		@event drop
		@param {Object} event
		*/
		'drop',

		/**
		Dispatched if error occurs.

		@event error
		@param {Object} event
		*/
		'error',

		/**
		Dispatched when component is destroyed (just before all events are unbined).

		@event destroy
		@param {Object} event
		*/
		'destroy'
	];

	function FileDrop(options) {
		if (MXI_DEBUG) {
			Env.log("Instantiating FileDrop...");
		}

		var _uid = Basic.guid('mxi_');
		var _options;
		var _fileRefs = [];
		var _disabled = true;

		var _containerPosition;

		// if flat argument passed it should be drop_zone id
		if (typeof(options) === 'string') {
			_options = { drop_zone : options };
		}

		_options = Basic.extend({
			accept: [{
				title: I18n.translate('All Files'),
				extensions: '*'
			}]
		}, options);

		// normalize accept option (could be list of mime types or array of title/extensions pairs)
		if (typeof(_options.accept) === 'string') {
			_options.accept = Mime.mimes2extList(_options.accept);
		}


		Basic.extend(this, {
			/**
			Unique id of the component

			@property uid
			@protected
			@readOnly
			@type {String}
			@default UID
			*/
			uid: _uid,

			/**
			Unique id of the runtime container. Useful to get hold of it for various manipulations.

			@property shimid
			@protected
			@type {String}
			*/
			shimid: _uid + '_container',

			/**
			Array of selected File objects

			@property files
			@type {Array}
			@default null
			*/
			files: _fileRefs,

			/**
			Initializes the component and dispatches event ready when done.

			@method init
			*/
			init: function() {
				var self = this;
				var dropZone = Dom.get(_options.drop_zone) || document.body;

				if (dropZone.id) {
					self.shimid = dropZone.id;
				} else {
					dropZone.id = self.shimid;
				}

				// make container relative, if it is not
				_containerPosition = Dom.getStyle(dropZone, 'position');
				if (_containerPosition === 'static') {
					options.drop_zone.style.position = 'relative';
				}

				Events.addEvent(dropZone, 'dragover', function(e) {
					if (!_hasFiles(e)) {
						return;
					}
					e.preventDefault();
					e.dataTransfer.dropEffect = 'copy';
				}, _uid);

				Events.addEvent(dropZone, 'drop', function(e) {
					e.preventDefault();

					if (!_hasFiles(e) || _disabled) {
						return;
					}

					_fileRefs.length = 0;

					// Chrome 21+ accepts folders via Drag'n'Drop
					if (e.dataTransfer.items && e.dataTransfer.items[0].webkitGetAsEntry) {
						_readItems(e.dataTransfer.items, function() {
							self.trigger("drop");
						});
					} else {
						Basic.each(e.dataTransfer.files, function(file) {
							_addFile(file);
						});
						self.trigger("drop", _fileRefs);
					}
				}, _uid);

				Events.addEvent(dropZone, 'dragenter', function(e) {
					self.trigger("dragenter");
				}, _uid);

				Events.addEvent(dropZone, 'dragleave', function(e) {
					self.trigger("dragleave");
				}, _uid);


				self.handleEventProps(dispatches);

				self.disable(false);

				// ready event is perfectly asynchronous
				self.trigger({ type: 'ready', async: true });
			},

			/**
			Returns container for the runtime as DOM element

			@method getShimContainer
			@return {DOMElement}
			*/
			getShimContainer: function() {
				return Dom.get(this.shimid);
			},

			/**
			 * Get current option value by its name
			 *
			 * @method getOption
			 * @param name
			 * @return {Mixed}
			 */
			getOption: function(name) {
				return options[name];
			},


			/**
			 * Sets a new value for the option specified by name
			 *
			 * @method setOption
			 * @param name
			 * @param value
			 */
			setOption: function(name, value) {
				if (!_options.hasOwnProperty(name)) {
					return;
				}

				var oldValue = _options[name];
				_options[name] = value;

				this.trigger('OptionChanged', name, value, oldValue);
			},

			/**
			Disables component, so that it doesn't accept files.

			@method disable
			@param {Boolean} [state=true] Disable component if - true, enable if - false
			*/
			disable: function(state) {
				_disabled = (state === undefined ? true : state);
			},

			/**
			Destroy component.

			@method destroy
			*/
			destroy: function() {
				var dropZone = Dom.get(_options.drop_zone) || document.body;

				Events.removeAllEvents(dropZone, _uid);
				dropZone.style.position = _containerPosition;

				if (Basic.typeOf(_fileRefs) === 'array') {
					// no sense in leaving associated files behind
					Basic.each(_fileRefs, function (file) {
						file.destroy();
					});
				}

				_options = null;
				_fileRefs.length = 0;

				this.trigger('Destroy');
				this.unbindAll();
			}
		});


		function _hasFiles(e) {
			if (!e.dataTransfer || !e.dataTransfer.types) { // e.dataTransfer.files is not available in Gecko during dragover
				return false;
			}

			var types = Basic.toArray(e.dataTransfer.types || []);

			return Basic.inArray("Files", types) !== -1 ||
				Basic.inArray("public.file-url", types) !== -1 || // Safari < 5
				Basic.inArray("application/x-moz-file", types) !== -1 // Gecko < 1.9.2 (< Firefox 3.6)
				;
		}

		function _addFile(file, relativePath) {
			if (_isAcceptable(file)) {
				var fileObj = new FileRef(null, file);
				fileObj.relativePath = relativePath || ''; // (!) currently this is the only reason to have a FileRef wrapper around native File
				_fileRefs.push(fileObj);
			}
		}

		function _extractExts(accept) {
			var exts = [];
			for (var i = 0; i < accept.length; i++) {
				[].push.apply(exts, accept[i].extensions.split(/\s*,\s*/));
			}
			return Basic.inArray('*', exts) === -1 ? exts : [];
		}

		function _isAcceptable(file) {
			var allowedExts = _extractExts(_options.accept);

			if (!allowedExts.length) {
				return true;
			}
			var ext = Mime.getFileExtension(file.name);
			return !ext || Basic.inArray(ext, allowedExts) !== -1;
		}

		function _readItems(items, cb) {
			var entries = [];
			Basic.each(items, function(item) {
				var entry = item.webkitGetAsEntry();
				// Address #998 (https://code.google.com/p/chromium/issues/detail?id=332579)
				if (entry) {
					// file() fails on OSX when the filename contains a special character (e.g. umlaut): see #61
					if (entry.isFile) {
						_addFile(item.getAsFile(), entry.fullPath);
					} else {
						entries.push(entry);
					}
				}
			});

			if (entries.length) {
				_readEntries(entries, cb);
			} else {
				cb();
			}
		}

		function _readEntries(entries, cb) {
			var queue = [];
			Basic.each(entries, function(entry) {
				queue.push(function(cbcb) {
					_readEntry(entry, cbcb);
				});
			});
			Basic.inSeries(queue, function() {
				cb();
			});
		}

		function _readEntry(entry, cb) {
			if (entry.isFile) {
				entry.file(function(file) {
					_addFile(file, entry.fullPath);
					cb();
				}, function() {
					// fire an error event maybe
					cb();
				});
			} else if (entry.isDirectory) {
				_readDirEntry(entry, cb);
			} else {
				cb(); // not file, not directory? what then?..
			}
		}

		function _readDirEntry(dirEntry, cb) {
			var entries = [], dirReader = dirEntry.createReader();

			// keep quering recursively till no more entries
			function getEntries(cbcb) {
				dirReader.readEntries(function(moreEntries) {
					if (moreEntries.length) {
						[].push.apply(entries, moreEntries);
						getEntries(cbcb);
					} else {
						cbcb();
					}
				}, cbcb);
			}

			// ...and you thought FileReader was crazy...
			getEntries(function() {
				_readEntries(entries, cb);
			});
		}
	}

	FileDrop.prototype = EventTarget.instance;

	return FileDrop;
});

// Included from: src/plupload.js

/**
 * plupload.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
Namespace for all Plupload related classes, methods and properties.

@class plupload
@public
@static
*/
define('plupload', [
	'moxie/core/utils/Env',
	'moxie/core/utils/Dom',
	'moxie/core/utils/Basic',
	'moxie/core/utils/Events',
	'moxie/core/utils/Url',
	'moxie/core/utils/Mime',
	'moxie/core/I18n',
	'moxie/core/EventTarget',
	'moxie/file/FileInput',
	'moxie/file/FileDrop',
	'moxie/file/BlobRef',
	'moxie/file/FileRef'
], function(Env, Dom, Basic, Events, Url, Mime, I18n, EventTarget, FileInput, FileDrop, BlobRef, FileRef) {

	return {
		/**
		 * Plupload version will be replaced on build.
		 *
		 * @property VERSION
		 * @static
		 * @final
		 */
		VERSION: '3.1.1',

		/**
		 * The state of the queue before it has started and after it has finished
		 *
		 * @property STOPPED
		 * @static
		 * @final
		 */
		STOPPED: 1,

		/**
		 * Upload process is running
		 *
		 * @property STARTED
		 * @static
		 * @final
		 */
		STARTED: 2,

		/**
		File is queued for upload

		@property QUEUED
		@static
		@final
		*/
		QUEUED: 1,

		/**
		File is being uploaded

		@property UPLOADING
		@static
		@final
		 */
		UPLOADING: 2,

		/**
		File has failed to be uploaded

		@property FAILED
		@static
		@final
		 */
		FAILED: 4,

		/**
		File has been uploaded successfully

		@property DONE
		@static
		@final
		 */
		DONE: 5,

		// Error constants used by the Error event

		/**
		 * Generic error for example if an exception is thrown inside Silverlight.
		 *
		 * @property GENERIC_ERROR
		 * @static
		 * @final
		 */
		GENERIC_ERROR: -100,

		/**
		 * HTTP transport error. For example if the server produces a HTTP status other than 200.
		 *
		 * @property HTTP_ERROR
		 * @static
		 * @final
		 */
		HTTP_ERROR: -200,

		/**
		 * Generic I/O error. For example if it wasn't possible to open the file stream on local machine.
		 *
		 * @property IO_ERROR
		 * @static
		 * @final
		 */
		IO_ERROR: -300,

		/**
		 * @property SECURITY_ERROR
		 * @static
		 * @final
		 */
		SECURITY_ERROR: -400,

		/**
		 * Initialization error. Will be triggered if no runtime was initialized.
		 *
		 * @property INIT_ERROR
		 * @static
		 * @final
		 */
		INIT_ERROR: -500,

		/**
		 * File size error. If the user selects a file that is too large it will be blocked and an error of this type will be triggered.
		 *
		 * @property FILE_SIZE_ERROR
		 * @static
		 * @final
		 */
		FILE_SIZE_ERROR: -600,

		/**
		 * File extension error. If the user selects a file that isn't valid according to the filters setting.
		 *
		 * @property FILE_EXTENSION_ERROR
		 * @static
		 * @final
		 */
		FILE_EXTENSION_ERROR: -601,

		/**
		 * Duplicate file error. If prevent_duplicates is set to true and user selects the same file again.
		 *
		 * @property FILE_DUPLICATE_ERROR
		 * @static
		 * @final
		 */
		FILE_DUPLICATE_ERROR: -602,

		/**
		 * Runtime will try to detect if image is proper one. Otherwise will throw this error.
		 *
		 * @property IMAGE_FORMAT_ERROR
		 * @static
		 * @final
		 */
		IMAGE_FORMAT_ERROR: -700,

		/**
		 * While working on files runtime may run out of memory and will throw this error.
		 *
		 * @since 2.1.2
		 * @property MEMORY_ERROR
		 * @static
		 * @final
		 */
		MEMORY_ERROR: -701,

		/**
		 * Each runtime has an upper limit on a dimension of the image it can handle. If bigger, will throw this error.
		 *
		 * @property IMAGE_DIMENSIONS_ERROR
		 * @static
		 * @final
		 */
		IMAGE_DIMENSIONS_ERROR: -702,


		/**
		Invalid option error. Will be thrown if user tries to alter the option that cannot be changed without
		uploader reinitialisation.

		@property OPTION_ERROR
		@static
		@final
		*/
		OPTION_ERROR: -800,

		/**
		 * In some cases sniffing is the only way around :(
		 */
		ua: Env,

		/**
		 * Gets the true type of the built-in object (better version of typeof).
		 * @credits Angus Croll (http://javascriptweblog.wordpress.com/)
		 *
		 * @method typeOf
		 * @static
		 * @param {Object} o Object to check.
		 * @return {String} Object [[Class]]
		 */
		typeOf: Basic.typeOf,

		clone: Basic.clone,

		inherit: Basic.inherit,


		/**
		 * Extends the specified object with another object.
		 *
		 * @method extend
		 * @static
		 * @param {Object} target Object to extend.
		 * @param {Object..} obj Multiple objects to extend with.
		 * @return {Object} Same as target, the extended object.
		 */
		extend: Basic.extend,


		extendImmutable: Basic.extendImmutable,

		/**
		Extends the specified object with another object(s), but only if the property exists in the target.

		@method extendIf
		@static
		@param {Object} target Object to extend.
		@param {Object} [obj]* Multiple objects to extend with.
		@return {Object} Same as target, the extended object.
		*/
		extendIf: Basic.extendIf,

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
		inSeries: Basic.inSeries,

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
		inParallel: Basic.inParallel,

		/**
		 * Generates an unique ID. This is 99.99% unique since it takes the current time and 5 random numbers.
		 * The only way a user would be able to get the same ID is if the two persons at the same exact millisecond manages
		 * to get 5 the same random numbers between 0-65535 it also uses a counter so each call will be guaranteed to be page unique.
		 * It's more probable for the earth to be hit with an asteriod. You can also if you want to be 100% sure set the plupload.guidPrefix property
		 * to an user unique key.
		 *
		 * @method guid
		 * @static
		 * @return {String} Virtually unique id.
		 */
		guid: Basic.guid,

		/**
		 * Get array of DOM Elements by their ids.
		 *
		 * @method get
		 * @param {String} id Identifier of the DOM Element
		 * @return {Array}
		 */
		getAll: function get(ids) {
			var els = [],
				el;

			if (Basic.typeOf(ids) !== 'array') {
				ids = [ids];
			}

			var i = ids.length;
			while (i--) {
				el = Dom.get(ids[i]);
				if (el) {
					els.push(el);
				}
			}

			return els.length ? els : null;
		},

		/**
		Get DOM element by id

		@method get
		@param {String} id Identifier of the DOM Element
		@return {Node}
		*/
		get: Dom.get,

		/**
		 * Executes the callback function for each item in array/object. If you return false in the
		 * callback it will break the loop.
		 *
		 * @method each
		 * @static
		 * @param {Object} obj Object to iterate.
		 * @param {function} callback Callback function to execute for each item.
		 */
		each: Basic.each,

		/**
		 * Returns the absolute x, y position of an Element. The position will be returned in a object with x, y fields.
		 *
		 * @method getPos
		 * @static
		 * @param {Element} node HTML element or element id to get x, y position from.
		 * @param {Element} root Optional root element to stop calculations at.
		 * @return {object} Absolute position of the specified element object with x, y fields.
		 */
		getPos: Dom.getPos,

		/**
		 * Returns the size of the specified node in pixels.
		 *
		 * @method getSize
		 * @static
		 * @param {Node} node Node to get the size of.
		 * @return {Object} Object with a w and h property.
		 */
		getSize: Dom.getSize,

		/**
		 * Encodes the specified string.
		 *
		 * @method xmlEncode
		 * @static
		 * @param {String} s String to encode.
		 * @return {String} Encoded string.
		 */
		xmlEncode: function(str) {
			var xmlEncodeChars = {
					'<': 'lt',
					'>': 'gt',
					'&': 'amp',
					'"': 'quot',
					'\'': '#39'
				},
				xmlEncodeRegExp = /[<>&\"\']/g;

			return str ? ('' + str).replace(xmlEncodeRegExp, function(chr) {
				return xmlEncodeChars[chr] ? '&' + xmlEncodeChars[chr] + ';' : chr;
			}) : str;
		},

		/**
		 * Forces anything into an array.
		 *
		 * @method toArray
		 * @static
		 * @param {Object} obj Object with length field.
		 * @return {Array} Array object containing all items.
		 */
		toArray: Basic.toArray,

		/**
		 * Find an element in array and return its index if present, otherwise return -1.
		 *
		 * @method inArray
		 * @static
		 * @param {mixed} needle Element to find
		 * @param {Array} array
		 * @return {Int} Index of the element, or -1 if not found
		 */
		inArray: Basic.inArray,

		/**
		 * Extends the language pack object with new items.
		 *
		 * @method addI18n
		 * @static
		 * @param {Object} pack Language pack items to add.
		 * @return {Object} Extended language pack object.
		 */
		addI18n: I18n.addI18n,

		/**
		 * Translates the specified string by checking for the english string in the language pack lookup.
		 *
		 * @method translate
		 * @static
		 * @param {String} str String to look for.
		 * @return {String} Translated string or the input string if it wasn't found.
		 */
		translate: I18n.translate,

		/**
		 * Pseudo sprintf implementation - simple way to replace tokens with specified values.
		 *
		 * @param {String} str String with tokens
		 * @return {String} String with replaced tokens
		 */
		sprintf: Basic.sprintf,

		/**
		 * Checks if object is empty.
		 *
		 * @method isEmptyObj
		 * @static
		 * @param {Object} obj Object to check.
		 * @return {Boolean}
		 */
		isEmptyObj: Basic.isEmptyObj,

		/**
		 * Checks if specified DOM element has specified class.
		 *
		 * @method hasClass
		 * @static
		 * @param {Object} obj DOM element like object to add handler to.
		 * @param {String} name Class name
		 */
		hasClass: Dom.hasClass,

		/**
		 * Adds specified className to specified DOM element.
		 *
		 * @method addClass
		 * @static
		 * @param {Object} obj DOM element like object to add handler to.
		 * @param {String} name Class name
		 */
		addClass: Dom.addClass,

		/**
		 * Removes specified className from specified DOM element.
		 *
		 * @method removeClass
		 * @static
		 * @param {Object} obj DOM element like object to add handler to.
		 * @param {String} name Class name
		 */
		removeClass: Dom.removeClass,

		/**
		 * Returns a given computed style of a DOM element.
		 *
		 * @method getStyle
		 * @static
		 * @param {Object} obj DOM element like object.
		 * @param {String} name Style you want to get from the DOM element
		 */
		getStyle: Dom.getStyle,

		/**
		 * Adds an event handler to the specified object and store reference to the handler
		 * in objects internal Plupload registry (@see removeEvent).
		 *
		 * @method addEvent
		 * @static
		 * @param {Object} obj DOM element like object to add handler to.
		 * @param {String} name Name to add event listener to.
		 * @param {Function} callback Function to call when event occurs.
		 * @param {String} (optional) key that might be used to add specifity to the event record.
		 */
		addEvent: Events.addEvent,

		/**
		 * Remove event handler from the specified object. If third argument (callback)
		 * is not specified remove all events with the specified name.
		 *
		 * @method removeEvent
		 * @static
		 * @param {Object} obj DOM element to remove event listener(s) from.
		 * @param {String} name Name of event listener to remove.
		 * @param {Function|String} (optional) might be a callback or unique key to match.
		 */
		removeEvent: Events.removeEvent,

		/**
		 * Remove all kind of events from the specified object
		 *
		 * @method removeAllEvents
		 * @static
		 * @param {Object} obj DOM element to remove event listeners from.
		 * @param {String} (optional) unique key to match, when removing events.
		 */
		removeAllEvents: Events.removeAllEvents,

		/**
		 * Cleans the specified name from national characters (diacritics). The result will be a name with only a-z, 0-9 and _.
		 *
		 * @method cleanName
		 * @static
		 * @param {String} s String to clean up.
		 * @return {String} Cleaned string.
		 */
		cleanName: function(name) {
			var i, lookup;

			// Replace diacritics
			lookup = [
				/[\300-\306]/g, 'A', /[\340-\346]/g, 'a',
				/\307/g, 'C', /\347/g, 'c',
				/[\310-\313]/g, 'E', /[\350-\353]/g, 'e',
				/[\314-\317]/g, 'I', /[\354-\357]/g, 'i',
				/\321/g, 'N', /\361/g, 'n',
				/[\322-\330]/g, 'O', /[\362-\370]/g, 'o',
				/[\331-\334]/g, 'U', /[\371-\374]/g, 'u'
			];

			for (i = 0; i < lookup.length; i += 2) {
				name = name.replace(lookup[i], lookup[i + 1]);
			}

			// Replace whitespace
			name = name.replace(/\s+/g, '_');

			// Remove anything else
			name = name.replace(/[^a-z0-9_\-\.]+/gi, '');

			return name;
		},

		/**
		 * Builds a full url out of a base URL and an object with items to append as query string items.
		 *
		 * @method buildUrl
		 * @static
		 * @param {String} url Base URL to append query string items to.
		 * @param {Object} items Name/value object to serialize as a querystring.
		 * @return {String} String with url + serialized query string items.
		 */
		buildUrl: function(url, items) {
			var query = '';

			Basic.each(items, function(value, name) {
				query += (query ? '&' : '') + encodeURIComponent(name) + '=' + encodeURIComponent(value);
			});

			if (query) {
				url += (url.indexOf('?') > 0 ? '&' : '?') + query;
			}

			return url;
		},

		/**
		 * Formats the specified number as a size string for example 1024 becomes 1 KB.
		 *
		 * @method formatSize
		 * @static
		 * @param {Number} size Size to format as string.
		 * @return {String} Formatted size string.
		 */
		formatSize: function(size) {
			var self = this;

			function round(num, precision) {
				return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
			}

			size = parseInt(size, 10);
			if (isNaN(size)) {
				return self.translate('N/A');
			}

			var boundary = Math.pow(1024, 4);

			// TB
			if (size > boundary) {
				return round(size / boundary, 1) + " " + self.translate('tb');
			}

			// GB
			if (size > (boundary /= 1024)) {
				return round(size / boundary, 1) + " " + self.translate('gb');
			}

			// MB
			if (size > (boundary /= 1024)) {
				return round(size / boundary, 1) + " " + self.translate('mb');
			}

			// KB
			if (size > 1024) {
				return Math.round(size / 1024) + " " + self.translate('kb');
			}

			return size + " " + self.translate('b');
		},

		/**
		 * @private
		 */
		mimes2extList: Mime.mimes2extList,

		/**
		Resolve url - among other things will turn relative url to absolute

		@method resolveUrl
		@static
		@param {String|Object} url Either absolute or relative, or a result of parseUrl call
		@return {String} Resolved, absolute url
		*/
		resolveUrl: Url.resolveUrl,

		/**
		 * Parses the specified size string into a byte value. For example 10kb becomes 10240.
		 *
		 * @method parseSize
		 * @static
		 * @param {String|Number} size String to parse or number to just pass through.
		 * @return {Number} Size in bytes.
		 */
		parseSize: Basic.parseSizeStr,

		delay: Basic.delay,

		/**
		Parent object for all event dispatching components and objects

		@class plupload.EventTarget
		@private
		@constructor
		*/
		EventTarget: EventTarget,

		FileInput: FileInput,

		FileDrop: FileDrop,

		BlobRef: BlobRef,

		FileRef: FileRef
	};

});

// Included from: src/core/Collection.js

/**
 * Collection.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
Helper collection class - in a way a mix of object and array

@contsructor
@class plupload.core.Collection
@private
*/
define('plupload/core/Collection', [
    'plupload'
], function(Basic) {

    var Collection = function() {
        var _registry = {};
        var _length = 0;
        var _last;


        plupload.extend(this, {

            count: function() {
                return _length;
            },

            hasKey: function(key) {
                return _registry.hasOwnProperty(key)
            },


            get: function(key) {
                return _registry[key];
            },


            first: function() {
                for (var key in _registry) {
                    return _registry[key];
                }
            },


            last: function() {
                return _last;
            },


            toObject: function() {
                return _registry;
            },


            add: function(key, obj) {
                var self = this;

                if (typeof(key) === 'object' && !obj) {
                    return plupload.each(key, function(obj, key) {
                        self.add(key, obj);
                    });
                }

                if (_registry.hasOwnProperty(key)) {
                    return self.update.apply(self, arguments);
                }

                _registry[key] = _last = obj;
                _length++;
            },


            remove: function(key) {
                if (this.hasKey(key)) {
                    var last = _registry[key];

                    delete _registry[key];
                    _length--;

                    // renew ref to the last added item if necessary
                    if (_last === last) {
                        _last = findLast();
                    }
                }
            },


            extract: function(key) {
                var item = this.get(key);
                this.remove(key);
                return item;
            },


            shift: function() {
                var self = this,
                    first, key;

                for (key in _registry) {
                    first = _registry[key];
                    self.remove(key);
                    return first;
                }
            },


            update: function(key, obj) {
                _registry[key] = obj;
            },


            each: function(cb) {
                plupload.each(_registry, cb);
            },


            combineWith: function() {
                var newCol = new Collection();

                newCol.add(_registry);

                plupload.each(arguments, function(col) {
                    if (col instanceof Collection) {
                        newCol.add(col.toObject());
                    }
                });
                return newCol;
            },


            clear: function() {
                _registry = {};
                _last = null;
                _length = 0;
            }
        });


        function findLast() {
            var key;
            for (key in _registry) {}
            return _registry[key];
        }

    };

    return Collection;
});

// Included from: src/core/ArrCollection.js

/**
 * ArrCollection.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload.core.ArrCollection
@private
*/
define('plupload/core/ArrCollection', [
    'plupload'
], function(plupload) {

    var ArrCollection = function() {
        var _registry = [];

        plupload.extend(this, {

            count: function() {
                return _registry.length;
            },

            hasKey: function(key) {
                return this.getIdx(key) > -1;
            },


            get: function(key) {
                var idx = this.getIdx(key);
                return idx > -1 ? _registry[idx] : null;
            },

            getIdx: function(key) {
                for (var i = 0, length = _registry.length; i < length; i++) {
                    if (_registry[i].uid === key) {
                        return i;
                    }
                }
                return -1;
            },

            getByIdx: function(idx) {
                return _registry[idx]
            },

            first: function() {
                return _registry[0];
            },

            last: function() {
                return _registry[_registry.length - 1];
            },

            add: function(obj) {
                obj = arguments[1] || obj; // make it compatible with Collection.add()

                var idx = this.getIdx(obj.uid);
                if (idx > -1) {
                    _registry[idx] = obj;
                    return idx;
                }

                _registry.push(obj);
                return _registry.length - 1;
            },

            remove: function(key) {
                return !!this.extract(key);
            },

            splice: function(start, length) {
                start = plupload.typeOf(start) === 'undefinded' ? 0 : Math.max(start, 0);
                length = plupload.typeOf(length) !== 'undefinded' && start + length < _registry.length ? length : _registry.length - start;

                return _registry.splice(start, length);
            },

            extract: function(key) {
                var idx = this.getIdx(key);
                if (idx > -1) {
                    return _registry.splice(idx, 1);
                }
                return null;
            },

            shift: function() {
                return _registry.shift();
            },

            update: function(key, obj) {
                var idx = this.getIdx(key);
                if (idx > -1) {
                    _registry[idx] = obj;
                    return true;
                }
                return false;
            },

            each: function(cb) {
                plupload.each(_registry, cb);
            },

            combineWith: function() {
                return Array.prototype.concat.apply(this.toArray(), arguments);
            },

            sort: function(cb) {
                _registry.sort(cb || function(a, b) {
                    return a.priority - b.priority;
                });
            },

            clear: function() {
                _registry = [];
            },

            toObject: function() {
                var obj = {};
                for (var i = 0, length = _registry.length; i < length; i++) {
                    obj[_registry[i].uid] = _registry[i];
                }
                return obj;
            },

            toArray: function() {
                return Array.prototype.slice.call(_registry);
            }
        });
    };

    return ArrCollection;
});

// Included from: src/core/Optionable.js

/**
 * Optionable.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload.core.Optionable
@private
@since 3.0
*/
define('plupload/core/Optionable', [
    'plupload'
], function(plupload) {
    var EventTarget = plupload.EventTarget;

    var dispatches = [
        /**
         * Dispatched when option is being changed.
         *
         * @event OptionChanged
         * @param {Object} event
         * @param {String} name Name of the option being changed
         * @param {Mixed} value
         * @param {Mixed} oldValue
         */
        'OptionChanged'
    ];

    return (function(Parent) {

        /**
         * @class Optionable
         * @constructor
         * @extends EventTarget
         */
        function Optionable() {
            Parent.apply(this, arguments);

            this._options = {};
        }

        plupload.inherit(Optionable, Parent);

        plupload.extend(Optionable.prototype, {
            /**
             * Set the value for the specified option(s).
             *
             * @method setOption
             * @since 2.1
             * @param {String|Object} option Name of the option to change or the set of key/value pairs
             * @param {Mixed} [value] Value for the option (is ignored, if first argument is object)
             * @param {Boolean} [mustBeDefined] if truthy, any option that is not in defaults will be ignored
             */
            setOption: function(option, value, mustBeDefined) {
                var self = this;
                var oldValue;

                if (typeof(option) === 'object') {
                    mustBeDefined = value;
                    plupload.each(option, function(value, option) {
                        self.setOption(option, value, mustBeDefined);
                    });
                    return;
                }

                if (mustBeDefined && !self._options.hasOwnProperty(option)) {
                    return;
                }

                oldValue = plupload.clone(self._options[option]);

                //! basically if an option is of type object extend it rather than replace
                if (plupload.typeOf(value) === 'object' && plupload.typeOf(self._options[option]) === 'object') {
                     // having some options as objects was a bad idea, prefixes is the way
                    plupload.extend(self._options[option], value);
                } else {
                    self._options[option] = value;
                }

                self.trigger('OptionChanged', option, value, oldValue);
            },

            /**
             * Get the value for the specified option or the whole configuration, if not specified.
             *
             * @method getOption
             * @since 2.1
             * @param {String} [option] Name of the option to get
             * @return {Mixed} Value for the option or the whole set
             */
            getOption: function(option) {
                if (!option) {
                    return this._options;
                }

                var value = this._options[option];
                if (plupload.inArray(plupload.typeOf(value), ['array', 'object']) > -1) {
                    return plupload.extendImmutable({}, value);
                } else {
                    return value;
                }
            },


            /**
             * Set many options as once.
             *
             * @method setOptions
             * @param {Object} options
             * @param {Boolean} [mustBeDefined] if truthy, any option that is not in defaults will be ignored
             */
            setOptions: function(options, mustBeDefined) {
                if (typeof(options) !== 'object') {
                    return;
                }
                this.setOption(options, mustBeDefined);
            },


            /**
            Gets all options.

            @method getOptions
            @return {Object}
            */
            getOptions: function() {
                return this.getOption();
            }
        });

        return Optionable;

    }(EventTarget));

});

// Included from: src/core/Queueable.js

/**
 * Queueable.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.se.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
Every queue item must have properties, implement methods and fire events defined in this class

@contsructor
@class plupload.core.Queueable
@private
@decorator
@extends EventTarget
*/
define('plupload/core/Queueable', [
    'plupload',
    'plupload/core/Optionable'
], function(plupload, Optionable) {

    var dispatches = [
        /**
         * Dispatched every time the state of queue changes
         *
         * @event statechanged
         * @param {Object} event
         * @param {Number} state New state
         * @param {Number} prevState Previous state
         */
        'statechanged',


        /**
         * Dispatched when the item is put on pending list
         *
         * @event queued
         * @param {Object} event
         */
        'queued',


        /**
         * Dispatched as soon as activity starts
         *
         * @event started
         * @param {Object} event
         */
        'started',


        'paused',


        'resumed',


        'stopped',


        /**
         * Dispatched as the activity progresses
         *
         * @event
         * @param {Object} event
         *      @param {Number} event.percent
         *      @param {Number} [event.processed]
         *      @param {Number} [event.total]
         */
        'progress',


        'failed',


        'done',


        'processed',

        'destroy'
    ];


    return (function(Parent) {

        function Queueable() {
            Parent.apply(this, arguments);

            /**
            Unique identifier
            @property uid
            @type {String}
            */
            this.uid = plupload.guid();

            this.state = Queueable.IDLE;

            this.processed = 0;

            this.total = 0;

            this.percent = 0;

            this.retries = 0;

            /**
             * Can be 0-Infinity - item with higher priority will have well... higher priority
             * @property [priority=0]
             * @type {Number}
             */
            this.priority = 0;

            this.startedTimestamp = 0;

            /**
             * Set when item becomes Queueable.DONE or Queueable.FAILED.
             * Used to calculate proper processedPerSec for the queue stats.
             * @property processedTimestamp
             * @type {Number}
             */
            this.processedTimestamp = 0;

            if (MXI_DEBUG) {
                this.bind('StateChanged', function(e, state, oldState) {
                    var self = this;

                    var stateToString = function(code) {
                        switch (code) {
                            case Queueable.IDLE:
                                return 'IDLE';

                            case Queueable.PROCESSING:
                                return 'PROCESSING';

                            case Queueable.PAUSED:
                                return 'PAUSED';

                            case Queueable.RESUMED:
                                return 'RESUMED';

                            case Queueable.DONE:
                                return 'DONE';

                            case Queueable.FAILED:
                                return 'FAILED';

                            case Queueable.DESTROYED:
                                return 'DESTROYED';
                        }
                    };

                    var indent = function() {
                        switch (self.ctorName) {
                            case 'File':
                                return "\t".repeat(2);

                            case 'QueueUpload':
                            case 'QueueResize':
                                return "\t";

                            case 'FileUploader':
                                return "\t".repeat(3);

                            case 'ChunkUploader':
                                return "\t".repeat(4);

                            default:
                                return "\t";
                        }
                    };

                    plupload.ua.log("StateChanged:" + indent() + self.ctorName + '::' + self.uid + ' (' + stateToString(oldState) + ' to ' + stateToString(state) + ')');
                }, 999);
            }
        }

        Queueable.IDLE = 1;
        Queueable.PROCESSING = 2;
        Queueable.PAUSED = 6;
        Queueable.RESUMED = 7;
        Queueable.DONE = 5;
        Queueable.FAILED = 4;
        Queueable.DESTROYED = 8;

        plupload.inherit(Queueable, Parent);

        plupload.extend(Queueable.prototype, {

            start: function() {
                var prevState = this.state;

                if (this.state === Queueable.PROCESSING) {
                    return false;
                }

                if (!this.startedTimestamp) {
                    this.startedTimestamp = +new Date();
                }

                this.state = Queueable.PROCESSING;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('started');

                return true;
            },


            pause: function() {
                var prevState = this.state;

                if (plupload.inArray(this.state, [Queueable.IDLE, Queueable.RESUMED, Queueable.PROCESSING]) === -1) {
                    return false;
                }

                this.processed = this.percent = 0; // by default reset all progress
                this.loaded = this.processed; // for backward compatibility

                this.state = Queueable.PAUSED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('paused');
                return true;
            },


            resume: function() {
                var prevState = this.state;

                if (this.state !== Queueable.PAUSED && this.state !== Queueable.RESUMED) {
                    return false;
                }

                this.state = Queueable.RESUMED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('resumed');
                return true;
            },


            stop: function() {
                var prevState = this.state;

                if (this.state === Queueable.IDLE) {
                    return false;
                }

                this.processed = this.percent = 0;
                this.loaded = this.processed; // for backward compatibility

                this.startedTimestamp = 0;

                this.state = Queueable.IDLE;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('stopped');
                return true;
            },


            done: function(result) {
                var prevState = this.state;

                if (this.state === Queueable.DONE) {
                    return false;
                }

                this.processed = this.total;
                this.loaded = this.processed; // for backward compatibility
                this.percent = 100;

                this.processedTimestamp = +new Date();

                this.state = Queueable.DONE;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('done', result);
                this.trigger('processed');
                return true;
            },


            failed: function(result) {
                var prevState = this.state;

                if (this.state === Queueable.FAILED) {
                    return false;
                }

                this.processed = this.percent = 0; // reset the progress
                this.loaded = this.processed; // for backward compatibility

                this.processedTimestamp = +new Date();

                this.state = Queueable.FAILED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('failed', result);
                this.trigger('processed');
                return true;
            },


            progress: function(processed, total) {
                if (total) {
                    this.total = total; // is this even required?
                }

                this.processed = Math.min(processed, this.total);
                this.loaded = this.processed; // for backward compatibility
                this.percent = Math.ceil(this.processed / this.total * 100);

                this.trigger({
                    type: 'progress',
                    loaded: this.processed,
                    total: this.total
                });
            },


            destroy: function() {
                var prevState = this.state;

                if (this.state === Queueable.DESTROYED) {
                    return false; // already destroyed
                }

                this.state = Queueable.DESTROYED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('destroy');
                this.unbindAll();
                return true;
            }

        });

        return Queueable;

    }(Optionable));
});

// Included from: src/core/Stats.js

/**
@class plupload.core.Stats
@constructor
@private
*/
define('plupload/core/Stats', [], function() {

	return function() {
		var self = this;

		/**
		 * Total queue file size.
		 *
		 * @property size
		 * @deprecated use total
		 * @type Number
		 */
		self.size = 0;

		/**
		 * Total size of the queue in units.
		 *
		 * @property total
		 * @since 3.0
		 * @type Number
		 */
		self.total = 0;

		/**
		 * Total bytes uploaded.
		 *
		 * @property loaded
		 * @type Number
		 */
		self.loaded = 0;


		/**
		 * Number of files uploaded successfully.
		 *
		 * @property uploaded
		 * @deprecated use done
		 * @type Number
		 */
		self.uploaded = 0;

		/**
		 * Number of items processed successfully.
		 *
		 * @property done
		 * @since 3.0
		 * @type Number
		 */
		self.done = 0;

		/**
		 * Number of failed items.
		 *
		 * @property failed
		 * @type Number
		 */
		self.failed = 0;

		/**
		 * Number of items yet to be processed.
		 *
		 * @property queued
		 * @type Number
		 */
		self.queued = 0;

		/**
		 * Number of items currently paused.
		 *
		 * @property paused
		 * @type Number
		 */
		self.paused = 0;

		/**
		 * Number of items being processed.
		 *
		 * @property processing
		 * @type Number
		 */
		self.processing = 0;


		/**
		 * Number of items being paused.
		 *
		 * @property paused
		 * @type Number
		 */
		self.paused = 0;

		/**
		 * Percent of processed units.
		 *
		 * @property percent
		 * @type Number
		 */
		self.percent = 0;

		/**
		 * Bytes processed per second.
		 *
		 * @property bytesPerSec
		 * @deprecated use processedPerSec
		 * @type Number
		 */
		self.bytesPerSec = 0;

		/**
		 * Units processed per second.
		 *
		 * @property processedPerSec
		 * @since 3.0
		 * @type Number
		 */
		self.processedPerSec = 0;

		/**
		 * Resets the progress to its initial values.
		 *
		 * @method reset
		 */
		self.reset = function() {
			self.size = // deprecated
			self.total =
			self.loaded = // deprecated
			self.processed =
			self.uploaded = // deprecated
			self.done =
			self.failed =
			self.queued =
			self.processing =
			self.paused =
			self.percent =
			self.bytesPerSec = // deprecated
			self.processedPerSec = 0;
		};
	};
});

// Included from: src/core/Queue.js

/**
 * Queue.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload.core.Queue
@private
*/
define('plupload/core/Queue', [
    'plupload',
    'plupload/core/ArrCollection',
    'plupload/core/Queueable',
    'plupload/core/Stats'
], function(plupload, ArrCollection, Queueable, Stats) {

    var dispatches = [
        /**
         * Dispatched as soon as activity starts
         *
         * @event started
         * @param {Object} event
         */
        'Started',


        /**
         * Dispatched as activity progresses
         *
         * @event progress
         * @param {Object} event
         * @param {Number} processed
         * @param {Number} total
         * @param {plupload.core.Stats} stats
         */
        'Progress',

        /**
         * Dispatched when activity is paused
         *
         * @event paused
         * @param {Object} event
         */
        'Paused',

        /**
         * Dispatched when there's no more items in processing
         *
         * @event done
         * @param {Object} event
         */
        'Done',

        /**
         * Dispatched as soon as activity ends
         *
         * @event stopped
         * @param {Object} event
         */
        'Stopped',

        /**
         * Dispatched when queue is destroyed
         *
         * @event destroy
         * @param {Object} event
         */
        'Destroy'
    ];

    /**
     * @class Queue
     * @constructor
     * @extends EventTarget
     */
    return (function(Parent) {
        plupload.inherit(Queue, Parent);


        function Queue(options) {
            Parent.apply(this, arguments);

            /**
            @property _queue
            @type {Collection}
            @private
            */
            this._queue = new ArrCollection();


            /**
            @property stats
            @type {Stats}
            @readOnly
            */
            this.stats = new Stats();


            this._options = plupload.extend({}, this._options, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false
            }, options);
        }

        plupload.extend(Queue.prototype, {

            /**
             * Returns number of items in the queue
             *
             * @method count
             * @returns {Number}
             */
            count: function() {
                return this._queue.count();
            },

            /**
             * Start the queue
             *
             * @method start
             */
            start: function() {
                if (!Queue.parent.start.call(this)) {
                    return false;
                }
                return processNext.call(this);
            },


            pause: function() {
                if (!Queue.parent.pause.call(this)) {
                    return false;
                }

                this.forEachItem(function(item) {
                    item.pause();
                });
            },

            /**
             * Stop the queue. If `finish_active=true` the queue will wait until active items are done, before
             * stopping.
             *
             * @method stop
             */
            stop: function() {
                if (!Queue.parent.stop.call(this) || this.getOption('finish_active')) {
                    return false;
                }

                if (this.isActive()) {
                    this.forEachItem(function(item) {
                        item.stop();
                    });
                }
            },


            forEachItem: function(cb) {
                this._queue.each(cb);
            },


            getItem: function(uid) {
                return this._queue.get(uid);
            },


            /**
             * Add instance of Queueable to the queue. If `auto_start=true` queue will start as well.
             *
             * @method addItem
             * @param {Queueable} item
             */
            addItem: function(item) {
                var self = this;

                item.bind('Started', function() {
                    if (self.calcStats()) {
                        plupload.delay.call(self, processNext);
                    }
                });

                item.bind('Resumed',function() {
                    self.start();
                });

                item.bind('Paused', function() {
                    if (self.calcStats()) {
                        plupload.delay.call(self, function() {
                            if (!processNext.call(self) && !self.stats.processing) {
                                self.pause();
                            }
                        });
                    }
                });

                item.bind('Processed Stopped', function() {
                    if (self.calcStats()) {
                        plupload.delay.call(self, function() {
                            if (!processNext.call(self) && !this.isStopped() && !this.isActive()) {
                                self.stop();
                            }
                        });
                    }
                });

                item.bind('Progress', function() {
                    if (self.calcStats()) {
                        self.trigger('Progress', self.stats.processed, self.stats.total, self.stats);
                    }
                });

                item.bind('Failed', function() {
                    if (self.getOption('max_retries') && this.retries < self.getOption('max_retries')) {
                        this.stop();
                        this.retries++;
                    }
                });

                this._queue.add(item.uid, item);
                this.calcStats();
                item.trigger('Queued');

                if (self.getOption('auto_start') || self.state === Queueable.PAUSED) {
                    plupload.delay.call(this, this.start);
                }
            },


            /**
             * Extracts item from the queue by its uid and returns it.
             *
             * @method extractItem
             * @param {String} uid
             * @return {Queueable} Item that was removed
             */
            extractItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    this.stopItem(item.uid);
                    this._queue.remove(uid);
                    this.calcStats();
                }
                return item;
            },

            /**
             * Removes item from the queue and destroys it
             *
             * @method removeItem
             * @param {String} uid
             * @returns {Boolean} Result of the operation
             */
            removeItem: function(uid) {
                var item = this.extractItem(uid);
                if (item) {
                    item.destroy();
                    return true;
                }
                return false;
            },


            stopItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    return item.stop();
                } else {
                    return false;
                }
            },


            pauseItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    return item.pause();
                } else {
                    return false;
                }
            },


            resumeItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    plupload.delay.call(this, function() {
                        this.start(); // start() will know if it needs to restart the queue
                    });
                    return item.resume();
                } else {
                    return false;
                }
            },


            splice: function(start, length) {
                return this._queue.splice(start, length);
            },


            isActive: function() {
                return this.stats && (this.stats.processing || this.stats.paused);
            },

            isStopped: function() {
                return this.state !== Queueable.IDLE && this.state !== Queueable.DESTROYED;
            },


            countSpareSlots: function() {
                return Math.max(this.getOption('max_slots') - this.stats.processing, 0);
            },


            toArray: function() {
                return this._queue.toArray();
            },


            clear: function() {
                var self = this;

                if (self.state !== Queueable.IDLE) {
                    // stop the active queue first
                    self.bindOnce('Stopped', function() {
                        self.clear();
                    });
                    return self.stop();
                } else {
                    self._queue.clear();
                    self.stats.reset();
                }
            },


            calcStats: function() {
                var self = this;
                var stats = self.stats;
                var processed = 0;
                var processedDuringThisSession = 0;

                if (!stats) {
                    return false; // maybe queue is destroyed
                }

                stats.reset();

                self.forEachItem(function(item) {
                    switch (item.state) {
                        case Queueable.DONE:
                            stats.done++;
                            stats.uploaded = stats.done; // for backward compatibility
                            break;

                        case Queueable.FAILED:
                            stats.failed++;
                            break;

                        case Queueable.PROCESSING:
                            stats.processing++;
                            break;

                        case Queueable.PAUSED:
                            stats.paused++;
                            break;

                        default:
                            stats.queued++;
                    }

                    processed += item.processed;

                    if (!item.processedTimestamp || item.processedTimestamp > self.startedTimestamp) {
                        processedDuringThisSession += processed;
                    }

                    stats.processedPerSec = Math.ceil(processedDuringThisSession / ((+new Date() - self.startedTimestamp || 1) / 1000.0));

                    stats.processed = processed;
                    stats.total += item.total;
                    if (stats.total) {
                        stats.percent = Math.ceil(stats.processed / stats.total * 100);
                    }
                });

                // enable properties inherited from Queueable

                /* TODO: this is good but it currently conflicts with deprecated total property in Uploader
                self.processed = stats.processed;
                self.total = stats.total;
                */
                self.percent = stats.percent;

                // for backward compatibility
                stats.loaded = stats.processed;
                stats.size = stats.total;
                stats.bytesPerSec = stats.processedPerSec;

                return true;
            },


            destroy: function() {
                var self = this;

                if (self.state === Queueable.DESTROYED) {
                    return false; // already destroyed
                }

                if (self.state !== Queueable.IDLE) {
                    // stop the active queue first
                    self.bindOnce('Stopped', function() {
                        plupload.delay.call(self, self.destroy);
                    });
                    return self.stop();
                } else {
                    self.clear();
                    Queue.parent.destroy.call(this);
                    self._queue = self.stats = null;
                }
                return true;
            }
        });


        /**
         * Returns another Queueable.IDLE or Queueable.RESUMED item, or null.
         */
        function getNextIdleItem() {
            var nextItem;
            this.forEachItem(function(item) {
                if (item.state === Queueable.IDLE || item.state === Queueable.RESUMED) {
                    nextItem = item;
                    return false;
                }
            });
            return nextItem ? nextItem : null;
        }


        function processNext() {
            var item;

            if (this.state !== Queueable.PROCESSING && this.state !== Queueable.PAUSED) {
                return false;
            }

            if (this.stats.processing < this.getOption('max_slots')) {
                item = getNextIdleItem.call(this);
                if (item) {
                    if (item.trigger('beforestart')) {
                        item.setOptions(this.getOptions());
                        return item.start();
                    } else {
                        item.pause();
                        // we need to call it sync, otherwise another thread may pick up the same file, while it is processed in beforestart handler
                        processNext.call(this);
                    }
                }
            }
            return false;
        }

        return Queue;

    }(Queueable));
});

// Included from: src/QueueUpload.js

/**
 * QueueUpload.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
 @class plupload.QueueUpload
 @extends plupload.core.Queue
 @constructor
 @private
 @final
 @since 3.0
 @param {Object} options
 */
define('plupload/QueueUpload', [
    'plupload',
    'plupload/core/Queue'
], function(plupload, Queue) {

    return (function(Parent) {
        plupload.inherit(QueueUpload, Parent);

        function QueueUpload(options) {

            Queue.call(this, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                url: false,
                chunk_size: 0,
                multipart: true,
                http_method: 'POST',
                params: {},
                headers: false,
                file_data_name: 'file',
                send_file_name: true,
                stop_on_fail: true
            });

            this.setOption = function(option, value) {
                if (typeof(option) !== 'object') {
                    if (option == 'max_upload_slots') {
                        option = 'max_slots';
                    }
                }
                QueueUpload.prototype.setOption.call(this, option, value, true);
            };

            this.setOptions(options);
        }

        return QueueUpload;
    }(Queue));
});

// Included from: src/QueueResize.js

/**
 * QueueResize.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
 @class plupload.QueueResize
 @extends plupload.core.Queue
 @constructor
 @private
 @final
 @since 3.0
 @param {Object} options
*/
define('plupload/QueueResize', [
    'plupload',
    'plupload/core/Queue'
], function(plupload, Queue) {

    return (function(Parent) {
        plupload.inherit(QueueResize, Parent);

        function QueueResize(options) {

            Queue.call(this, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                resize: {}
            });

            this.setOption = function(option, value) {
                if (typeof(option) !== 'object') {
                    if (option == 'max_resize_slots') {
                        option = 'max_slots';
                    }
                }
                QueueResize.prototype.setOption.call(this, option, value, true);
            };


            this.setOptions(options);
        }


        return QueueResize;
    }(Queue));
});

// Included from: src/ChunkUploader.js

/**
 * ChunkUploader.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 * @class plupload.ChunkUploader
 * @extends plupload.core.Queueable
 * @constructor
 * @private
 * @final
 * @constructor
 */
define('plupload/ChunkUploader', [
    'plupload',
    'plupload/core/Collection',
    'plupload/core/Queueable'
], function(plupload, Collection, Queueable) {

    function ChunkUploader(blob) {
        var _xhr;

        Queueable.call(this);

        this._options = {
			file_data_name: 'file',
			headers: false,
			http_method: 'POST',
			multipart: true,
			params: {},
			send_file_name: true,
			url: false
		};

        plupload.extend(this, {

            start: function() {
                var self = this;
                var url;
                var formData;
                var prevState = this.state;
                var options = self._options;

                if (this.state === Queueable.PROCESSING) {
                    return false;
				}

				if (!this.startedTimestamp) {
                    this.startedTimestamp = +new Date();
                }

				this.state = Queueable.PROCESSING;
				this.trigger('statechanged', this.state, prevState);

                _xhr = new XMLHttpRequest();

                if (_xhr.upload) {
                    _xhr.upload.onprogress = function(e) {
                        self.progress(e.loaded, e.total);
                    };
                }

                _xhr.onload = function() {
                    var result = {
                        response: this.responseText,
                        status: this.status,
                        responseHeaders: this.getAllResponseHeaders()
                    };

                    if (this.status < 200 || this.status >= 400) { // assume error
                        return self.failed(result);
                    }

                    self.done(result);
                };

                _xhr.onerror = function() {
                    self.failed(); // TODO: reason here
                };

                _xhr.onloadend = function() {
                    // we do not need _xhr anymore, so destroy it
                    setTimeout(function() { // we detach to sustain reference until all handlers are done
                        if (_xhr) {
                            if (typeof _xhr.destroy === 'function') {
                                _xhr.destroy();
                            }
                            _xhr = null;
                        }
                    }, 1);
                };

                try {
                    url = options.multipart ? options.url : buildUrl(options.url, options.params);
                    _xhr.open(options.http_method, url, true);


                    // headers must be set after request is already opened, otherwise INVALID_STATE_ERR exception will raise
                    if (!plupload.isEmptyObj(options.headers)) {
                        plupload.each(options.headers, function(val, key) {
                            _xhr.setRequestHeader(key, val);
                        });
                    }


                    if (options.multipart) {
                        formData = new FormData();

                        if (!plupload.isEmptyObj(options.params)) {
                            plupload.each(options.params, function(val, key) {
                                formData.append(key, val);
                            });
                        }

                        formData.append(options.file_data_name, blob.getSource());

                        _xhr.send(formData);
                    } else { // if no multipart, send as binary stream
                        if (plupload.isEmptyObj(options.headers) || !_xhr.hasRequestHeader('content-type')) {
                            _xhr.setRequestHeader('content-type', 'application/octet-stream'); // binary stream header
                        }

                        _xhr.send(blob.getSource());
                    }

                    this.trigger('started');
                } catch(ex) {
                    self.failed();
                }
            },


            stop: function() {
                if (_xhr) {
                    _xhr.abort();
                    if (typeof _xhr.destroy === 'function') {
                        _xhr.destroy();
                    }
                    _xhr = null;
                }
                ChunkUploader.prototype.stop.call(this);
            },

            setOption: function(option, value) {
				ChunkUploader.prototype.setOption.call(this, option, value, true);
			},

			setOptions: function(options) {
				ChunkUploader.prototype.setOption.call(this, options, true);
			},

            destroy: function() {
                this.stop();
                ChunkUploader.prototype.destroy.call(this);
            }
        });


        /**
         * Builds a full url out of a base URL and an object with items to append as query string items.
         *
         * @method buildUrl
         * @private
         * @param {String} url Base URL to append query string items to.
         * @param {Object} items Name/value object to serialize as a querystring.
         * @return {String} String with url + serialized query string items.
         */
        function buildUrl(url, items) {
            var query = '';

            plupload.each(items, function(value, name) {
                query += (query ? '&' : '') + encodeURIComponent(name) + '=' + encodeURIComponent(value);
            });

            if (query) {
                url += (url.indexOf('?') > 0 ? '&' : '?') + query;
            }

            return url;
        }

    }

    plupload.inherit(ChunkUploader, Queueable);

    return ChunkUploader;
});

// Included from: src/FileUploader.js

/**
 * FileUploader.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.se.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 * @class plupload.FileUploader
 * @extends plupload.core.Queueable
 * @constructor
 * @since 3.0
 * @final
 */
define('plupload/FileUploader', [
	'plupload',
	'plupload/core/Collection',
	'plupload/core/Queueable',
	'plupload/ChunkUploader'
], function(plupload, Collection, Queueable, ChunkUploader) {


	function FileUploader(file, queue) {
		var _chunks = new Collection();
		var _totalChunks = 1;

		Queueable.call(this);

		this._options = {
			chunk_size: 0,
			params: {},
			send_file_name: true,
			stop_on_fail: true
		};

		plupload.extend(this, {
			/**
			When send_file_name is set to true, will be sent with the request as `name` param.
            Can be used on server-side to override original file name.

            @property name
			@type {String}
            */
			name: file.name,


			start: function() {
				var self = this;
				var prevState = this.state;
				var up;

				if (this.state === Queueable.PROCESSING) {
                    return false;
				}

				if (!this.startedTimestamp) {
                    this.startedTimestamp = +new Date();
                }

				this.state = Queueable.PROCESSING;
				this.trigger('statechanged', this.state, prevState);

				// send additional 'name' parameter only if required or explicitly requested
				if (self._options.send_file_name) {
					self._options.params.name = self.target_name || self.name;
				}

				if (self._options.chunk_size) {
					_totalChunks = Math.ceil(file.size / self._options.chunk_size);
					self.uploadChunk(false, true);
				} else {
					up = new ChunkUploader(file);

					up.bind('progress', function(e) {
						self.progress(e.loaded, e.total);
					});

					up.bind('done', function(e, result) {
						self.done(result);
					});

					up.bind('failed', function(e, result) {
						self.failed(result);
					});

					up.setOptions(self._options);

					queue.addItem(up);
				}

				this.trigger('started');
			},


			uploadChunk: function(seq, dontStop) {
				var self = this;
				var chunkSize = this.getOption('chunk_size');
				var up;
				var chunk = {};
				var _options;

				chunk.seq = parseInt(seq, 10) || getNextChunk();
				chunk.start = chunk.seq * chunkSize;
				chunk.end = Math.min(chunk.start + chunkSize, file.size);
				chunk.total = file.size;

				// do not proceed for weird chunks
				if (chunk.start < 0 || chunk.start >= file.size) {
					return false;
				}

				_options = plupload.extendImmutable({}, this.getOptions(), {
					params: {
						chunk: chunk.seq,
						chunks: _totalChunks
					}
				});

				up = new ChunkUploader(file.slice(chunk.start, chunk.end, file.type));

				up.bind('progress', function(e) {
					self.progress(calcProcessed() + e.loaded, file.size);
				});

				up.bind('failed', function(e, result) {
					_chunks.add(chunk.seq, plupload.extend({
						state: Queueable.FAILED
					}, chunk));

					self.trigger('chunkuploadfailed', plupload.extendImmutable({}, chunk, result));

					if (_options.stop_on_fail) {
						self.failed(result);
					}
				});

				up.bind('done', function(e, result) {
					_chunks.add(chunk.seq, plupload.extend({
						state: Queueable.DONE
					}, chunk));

					self.trigger('chunkuploaded', plupload.extendImmutable({}, chunk, result));

					if (calcProcessed() >= file.size) {
						self.progress(file.size, file.size);
						self.done(result); // obviously we are done
					} else if (dontStop) {
						plupload.delay(function() {
							self.uploadChunk(getNextChunk(), dontStop);
						});
					}
				});

				up.bind('processed', function() {
					this.destroy();
				});

				up.setOptions(_options);

				_chunks.add(chunk.seq, plupload.extend({
					state: Queueable.PROCESSING
				}, chunk));

				queue.addItem(up);

				// enqueue even more chunks if slots available
				if (dontStop && queue.countSpareSlots()) {
					self.uploadChunk(getNextChunk(), dontStop);
				}

				return true;
			},

			destroy: function() {
				FileUploader.prototype.destroy.call(this);
				_chunks.clear();
			}
		});


		function calcProcessed() {
			var processed = 0;

			_chunks.each(function(item) {
				if (item.state === Queueable.DONE) {
					processed += (item.end - item.start);
				}
			});

			return processed;
		}


		function getNextChunk() {
			var i = 0;
			while (i < _totalChunks && _chunks.hasKey(i)) {
				i++;
			}
			return i;
		}

	}


	plupload.inherit(FileUploader, Queueable);

	return FileUploader;
});

// Included from: src/ImageResizer.js

/**
 * ImageResizer.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 @class plupload.ImageResizer
 @extends plupload.core.Queueable
 @constructor
 @private
 @final
 @since 3.0
 @param {plupload.File} fileRef
*/
define("plupload/ImageResizer", [
	'plupload',
	'plupload/core/Queueable'
], function(plupload, Queueable) {
	var mxiImage = plupload.Image;

	function ImageResizer(fileRef) {

		Queueable.call(this);

		this._options = {
			width: 0,
			height: 0,
			type: 'image/jpeg',
			quality: 90,
			crop: false,
			fit: true,
			preserveHeaders: true,
			resample: 'default',
			multipass: true
		};

		this.setOption = function(option, value) {
			if (typeof(option) !== 'object' && !this._options.hasOwnProperty(option)) {
				return;
			}
			ImageResizer.prototype.setOption.apply(this, arguments);
		};


		this.start = function(options) {
			var self = this;
			var img;

			if (options) {
				this.setOptions(options.resize);
			}

			img = new mxiImage();

			img.bind('load', function() {
				this.resize(self.getOptions());
			});

			img.bind('resize', function() {
				self.done(this.getAsBlob(self.getOption('type'), self.getOption('quality')));
				this.destroy();
			});

			img.bind('error', function() {
				self.failed();
				this.destroy();
			});

			img.load(fileRef, self.getOption('runtimeOptions'));
		};
	}

	plupload.inherit(ImageResizer, Queueable);

	// ImageResizer is only included for builds with Image manipulation support, so we add plupload.Image here manually
	plupload.Image = mxiImage;

	return ImageResizer;
});

// Included from: src/File.js

/**
 * File.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.se.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 * @class plupload.File
 * @extends plupload.core.Queueable
 * @constructor
 * @since 3.0
 * @final
 */
define('plupload/File', [
    'plupload',
    'plupload/core/Queueable',
    'plupload/FileUploader',
    'plupload/ImageResizer'
], function(plupload, Queueable, FileUploader, ImageResizer) {

    function File(file, queueUpload, queueResize) {
        Queueable.call(this);


        plupload.extend(this, {
            /**
             * For backward compatibility
             *
             * @property id
             * @type {String}
             * @deprecated
             */
            id: this.uid,


            /**
             When send_file_name is set to true, will be sent with the request as `name` param.
             Can be used on server-side to override original file name.

             @property name
             @type {String}
             */
            name: file.name,

            /**
             @property target_name
             @type {String}
             @deprecated use name
             */
            target_name: null,

            /**
             * File type, `e.g image/jpeg`
             *
             * @property type
             * @type String
             */
            type: file.type,

            /**
             * File size in bytes (may change after client-side manupilation).
             *
             * @property size
             * @type Number
             */
            size: file.size,

            /**
             * Original file size in bytes.
             *
             * @property origSize
             * @type Number
             */
            origSize: file.size,

            start: function() {
                var prevState = this.state;

                if (this.state === Queueable.PROCESSING) {
                    return false;
                }

                this.state = Queueable.PROCESSING;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('started');

                if (!plupload.isEmptyObj(this._options.resize) && isImage(this.type) && runtimeCan(file, 'send_binary_string')) {
                    this.resizeAndUpload();
                } else {
                    this.upload();
                }
                return true;
            },

            /**
             * Get the file for which this File is responsible
             *
             * @method getSource
             * @returns {moxie.file.File}
             */
            getSource: function() {
                return file;
            },

            /**
             * Returns file representation of the current runtime. For HTML5 runtime
             * this is going to be native browser File object
             * (for backward compatibility)
             *
             * @method getNative
             * @deprecated
             * @returns {File|Blob|Object}
             */
            getNative: function() {
                return this.getFile().getSource();
            },


            resizeAndUpload: function() {
                var self = this;
                var opts = self.getOptions();
                var rszr = new ImageResizer(file);

                rszr.bind('progress', function(e) {
                    self.progress(e.loaded, e.total);
                });

                rszr.bind('done', function(e, file) {
                    file = file;
                    self.upload();
                });

                rszr.bind('failed', function() {
                    self.upload();
                });

                rszr.setOption('runtimeOptions', {
                    runtime_order: opts.runtimes,
                    required_caps: opts.required_features,
                    preferred_caps: opts.preferred_caps,
                    swf_url: opts.flash_swf_url,
                    xap_url: opts.silverlight_xap_url
                });

                queueResize.addItem(rszr);
            },


            upload: function() {
                var self = this;
                var up = new FileUploader(file, queueUpload);

                up.bind('paused', function() {
                    self.pause();
                });

                up.bind('resumed', function() {
                    this.start();
                });

                up.bind('started', function() {
                    self.trigger('startupload');
                });

                up.bind('progress', function(e) {
                    self.progress(e.loaded, e.total);
                });

                up.bind('done', function(e, result) {
                    self.done(result);
                });

                up.bind('failed', function(e, result) {
                    self.failed(result);
                });

                up.setOptions(self.getOptions());

                up.start();
            },



            destroy: function() {
                File.prototype.destroy.call(this);
                file = null;
            }
        });
    }


    function isImage(type) {
        return plupload.inArray(type, ['image/jpeg', 'image/png']) > -1;
    }


    function runtimeCan(blob, cap) {
        if (blob.ruid) {
            var info = plupload.Runtime.getInfo(blob.ruid);
            if (info) {
                return info.can(cap);
            }
        }
        return false;
    }


    plupload.inherit(File, Queueable);

    return File;
});

// Included from: src/Uploader.js

/**
 * Uploader.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@class plupload.Uploader
@extends plupload.core.Queue
@constructor
@public
@final

@param {Object} settings For detailed information about each option check documentation.
	@param {String|DOMElement} settings.browse_button id of the DOM element or DOM element itself to use as file dialog trigger.
	@param {Number|String} [settings.chunk_size=0] Chunk size in bytes to slice the file into. Shorcuts with b, kb, mb, gb, tb suffixes also supported. `e.g. 204800 or "204800b" or "200kb"`. By default - disabled.
	@param {Boolean} [settings.send_chunk_number=true] Whether to send chunks and chunk numbers, or total and offset bytes.
	@param {String|DOMElement} [settings.container] id of the DOM element or DOM element itself that will be used to wrap uploader structures. Defaults to immediate parent of the `browse_button` element.
	@param {String|DOMElement} [settings.drop_element] id of the DOM element or DOM element itself to use as a drop zone for Drag-n-Drop.
	@param {String} [settings.file_data_name="file"] Name for the file field in Multipart formated message.
	@param {Object} [settings.filters={}] Set of file type filters.
		@param {Array} [settings.filters.mime_types=[]] List of file types to accept, each one defined by title and list of extensions. `e.g. {title : "Image files", extensions : "jpg,jpeg,gif,png"}`. Dispatches `plupload.FILE_EXTENSION_ERROR`
		@param {String|Number} [settings.filters.max_file_size=0] Maximum file size that the user can pick, in bytes. Optionally supports b, kb, mb, gb, tb suffixes. `e.g. "10mb" or "1gb"`. By default - not set. Dispatches `plupload.FILE_SIZE_ERROR`.
		@param {Boolean} [settings.filters.prevent_duplicates=false] Do not let duplicates into the queue. Dispatches `plupload.FILE_DUPLICATE_ERROR`.
	@param {Object} [settings.headers] Custom headers to send with the upload. Hash of name/value pairs.
	@param {String} [settings.http_method="POST"] HTTP method to use during upload (only PUT or POST allowed).
	@param {Number} [settings.max_retries=0] How many times to retry the chunk or file, before triggering Error event.
	@param {Boolean} [settings.multipart=true] Whether to send file and additional parameters as Multipart formated message.
	@param {Boolean} [settings.multi_selection=true] Enable ability to select multiple files at once in file dialog.
	@param {Object} [settings.params] Hash of key/value pairs to send with every file upload.
	@param {String|Object} [settings.required_features] Either comma-separated list or hash of required features that chosen runtime should absolutely possess.
	@param {Object} [settings.resize] Enable resizing of images on client-side. Applies to `image/jpeg` and `image/png` only. `e.g. {width : 200, height : 200, quality : 90, crop: true}`
		 @param {Number} settings.resize.width Resulting width
		 @param {Number} [settings.resize.height=width] Resulting height (optional, if not supplied will default to width)
		 @param {String} [settings.resize.type='image/jpeg'] MIME type of the resulting image
		 @param {Number} [settings.resize.quality=90] In the case of JPEG, controls the quality of resulting image
		 @param {Boolean} [settings.resize.crop='cc'] If not falsy, image will be cropped, by default from center
		 @param {Boolean} [settings.resize.fit=true] In case of crop whether to upscale the image to fit the exact dimensions
		 @param {Boolean} [settings.resize.preserveHeaders=true] Whether to preserve meta headers (on JPEGs after resize)
		 @param {String} [settings.resize.resample='default'] Resampling algorithm to use during resize
		 @param {Boolean} [settings.resize.multipass=true] Whether to scale the image in steps (results in better quality)
	@param {Boolean} [settings.send_file_name=true] Whether to send file name as additional argument - 'name' (required for chunked uploads and some other cases where file name cannot be sent via normal ways).
	@param {Boolean} [settings.unique_names=false] If true will generate unique filenames for uploaded files.
	@param {String} settings.url URL of the server-side upload handler.
*/

/**
Fires when the current RunTime has been initialized.

@event Init
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires after the init event incase you need to perform actions there.

@event PostInit
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires when the option is changed in via uploader.setOption().

@event OptionChanged
@since 2.1
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {String} name Name of the option that was changed
@param {Mixed} value New value for the specified option
@param {Mixed} oldValue Previous value of the option
 */

/**
Fires when the silverlight/flash or other shim needs to move.

@event Refresh
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires when the overall state is being changed for the upload queue.

@event StateChanged
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires when browse_button is clicked and browse dialog shows.

@event Browse
@since 2.1.2
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires for every filtered file before it is added to the queue.

@event FileFiltered
@since 2.1
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {plupload.File} file Another file that has to be added to the queue.
 */

/**
Fires when the file queue is changed. In other words when files are added/removed to the files array of the uploader instance.

@event QueueChanged
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires after files were filtered and added to the queue.

@event FilesAdded
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {Array} files Array of FileUploader objects that were added to the queue by user.
 */

/**
Fires when file is removed from the queue.

@event FilesRemoved
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {Array} files Array of files that got removed.
 */

/**
Fires just before a file is uploaded. Can be used to cancel upload of the current file
by returning false from the handler.

@event BeforeUpload
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {plupload.File} file File to be uploaded.
 */

/**
Fires when a file is to be uploaded by the runtime.

@event UploadFile
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {plupload.File} file File to be uploaded.
 */

/**
Fires while a file is being uploaded. Use this event to update the current file upload progress.

@event UploadProgress
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {plupload.File} file File that is currently being uploaded.
 */

/**
Fires when file chunk is uploaded.

@event ChunkUploaded
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {plupload.File} file File that the chunk was uploaded for.
@param {Object} result Object with response properties.
	@param {Number} result.offset The amount of bytes the server has received so far, including this chunk.
	@param {Number} result.total The size of the file.
	@param {String} result.response The response body sent by the server.
	@param {Number} result.status The HTTP status code sent by the server.
	@param {String} result.responseHeaders All the response headers as a single string.
 */

/**
Fires when a file is successfully uploaded.

@event FileUploaded
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {plupload.File} file File that was uploaded.
@param {Object} result Object with response properties.
	@param {String} result.response The response body sent by the server.
	@param {Number} result.status The HTTP status code sent by the server.
	@param {String} result.responseHeaders All the response headers as a single string.
 */

/**
Fires when all files in a queue are uploaded

@event UploadComplete
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */


/**
Fires whenever upload is aborted for some reason

@event CancelUpload
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */

/**
Fires when a error occurs.

@event Error
@param {plupload.Uploader} uploader Uploader instance sending the event.
@param {Object} error Contains code, message and sometimes file and other details.
	@param {Number} error.code The plupload error code.
	@param {String} error.message Description of the error (uses i18n).
 */

/**
Fires when destroy method is called.

@event Destroy
@param {plupload.Uploader} uploader Uploader instance sending the event.
 */
define('plupload/Uploader', [
	'plupload',
	'plupload/core/Collection',
	'plupload/core/Queue',
	'plupload/QueueUpload',
	'plupload/QueueResize',
	'plupload/File'
], function(plupload, Collection, Queue, QueueUpload, QueueResize, PluploadFile) {
	var FileInput = plupload.FileInput;
	var FileDrop = plupload.FileDrop;
	var BlobRef = plupload.BlobRef;
	var FileRef = plupload.FileRef;

	var fileFilters = {};
	var undef;


	function Uploader(options) {
		var _fileInputs = [];
		var _fileDrops = [];
		var _queueUpload, _queueResize;
		var _initialized = false;
		var _disabled = false;

		var _options = normalizeOptions(plupload.extend({
			backward_compatibility: true,
			chunk_size: 0,
			file_data_name: 'file',
			filters: {
				mime_types: '*',
				prevent_duplicates: false,
				max_file_size: 0
			},
			// @since 2.3
			http_method: 'POST',
			// headers: false, // Plupload had a required feature with the same name, comment it to avoid confusion
			max_resize_slots: 1,
			max_retries: 0,
			max_upload_slots: 1,
			multipart: true,
			multipart_params: {}, // deprecated, use - params,
			multi_selection: true,
			// @since 3
			params: {},
			resize: false,
			send_chunk_number: true, // whether to send chunks and chunk numbers, instead of total and offset bytes
			send_file_name: true
		}, options));

		Queue.call(this);


		// Add public methods
		plupload.extend(this, {

			_options: _options,

			/**
			 * Unique id for the Uploader instance.
			 *
			 * @property id
			 * @type String
			 */
			id: this.uid,

			/**
			 * Current state of the total uploading progress. This one can either be plupload.STARTED or plupload.STOPPED.
			 * These states are controlled by the stop/start methods. The default value is STOPPED.
			 *
			 * @property state
			 * @type Number
			 */
			state: plupload.STOPPED,

			/**
			 * Object with name/value settings.
			 *
			 * @property settings
			 * @type Object
			 * @deprecated Use `getOption()/setOption()`
			 */
			settings : _options,


			/**
			 * Current upload queue, an array of File instances
			 *
			 * @property files
			 * @deprecated use forEachItem(callback) to cycle over the items in the queue
			 * @type Array
			 */
			files: [],

			/**
			 * Total progess information. How many files has been uploaded, total percent etc.
			 *
			 * @property total
			 * @deprecated use stats
			 */
			total: this.stats,

			/**
			 * Initializes the Uploader instance and adds internal event listeners.
			 *
			 * @method init
			 */
			init: function() {
				var self = this, preinitOpt, err;

				preinitOpt = self.getOption('preinit');
				if (typeof(preinitOpt) == "function") {
					preinitOpt(self);
				} else {
					plupload.each(preinitOpt, function(func, name) {
						self.bind(name, func);
					});
				}

				bindEventListeners.call(self);

				// Check for required options
				plupload.each(['container', 'browse_button', 'drop_element'], function(el) {
					if (self.getOption(el) === null) {
						err = {
							code: plupload.INIT_ERROR,
							message: plupload.sprintf(plupload.translate("%s specified, but cannot be found."), el)
						}
						return false;
					}
				});

				if (err) {
					return self.trigger('Error', err);
				}


				if (!self.getOption('browse_button') && !self.getOption('drop_element')) {
					return self.trigger('Error', {
						code: plupload.INIT_ERROR,
						message: plupload.translate("You must specify either browse_button or drop_element.")
					});
				}


				initControls.call(self, function(initialized) {
					var initOpt = self.getOption('init');
					var queueOpts = plupload.extendImmutable({}, self.getOption(), { auto_start: true });

					if (typeof(initOpt) == "function") {
						initOpt(self);
					} else {
						plupload.each(initOpt, function(func, name) {
							self.bind(name, func);
						});
					}

					if (initialized) {
						_initialized = true;

						_queueUpload = new QueueUpload(queueOpts);
						_queueResize = new QueueResize(queueOpts);

						self.trigger('Init');
						self.trigger('PostInit');
					} else {
						self.trigger('Error', {
							code: plupload.INIT_ERROR,
							message: plupload.translate('Init error.')
						});
					}
				});
			},

			/**
			 * Set the value for the specified option(s).
			 *
			 * @method setOption
			 * @since 2.1
			 * @param {String|Object} option Name of the option to change or the set of key/value pairs
			 * @param {Mixed} [value] Value for the option (is ignored, if first argument is object)
			 */
			setOption: function(option, value) {
				if (_initialized) {
					// following options cannot be changed after initialization
					if (plupload.inArray(option, [
						'container',
						'browse_button',
						'drop_element',
						'multi_selection'
					]) > -1) {
						return this.trigger('Error', {
							code: plupload.OPTION_ERROR,
							message: plupload.sprintf(plupload.translate("%s option cannot be changed.")),
							option: option
						});
					}
				}

				if (typeof(option) !== 'object') {
					value = normalizeOption(option, value, this._options);

					// queues will take in only appropriate options
					if (_queueUpload) {
						_queueUpload.setOption(option, value);
					}
					if (_queueResize) {
						_queueResize.setOption(option, value);
					}
				}

				Uploader.prototype.setOption.call(this, option, value);
			},

			/**
			 * Refreshes the upload instance by dispatching out a refresh event to all runtimes.
			 * This would for example reposition flash/silverlight shims on the page.
			 *
			 * @method refresh
			 */
			refresh: function() {
				plupload.each(_fileInputs, function(fileInput) {
					fileInput.trigger('Refresh');
				});

				this.trigger('Refresh');
			},

			/**
			 * Stops the upload of the queued files.
			 *
			 * @method stop
			 */
			stop: function() {
				if (Uploader.prototype.stop.call(this) && this.state != plupload.STOPPED) {
					this.trigger('CancelUpload');
				}
			},


			/**
			 * Disables/enables browse button on request.
			 *
			 * @method disableBrowse
			 * @param {Boolean} disable Whether to disable or enable (default: true)
			 */
			disableBrowse: function() {
				_disabled = arguments[0] !== undef ? arguments[0] : true;

				plupload.each(_fileInputs, function(fileInput) {
					fileInput.disable(_disabled);
				});

				this.trigger('DisableBrowse', _disabled);
			},

			/**
			 * Returns the specified FileUploader object by id
			 *
			 * @method getFile
			 * @deprecated use getItem()
			 * @param {String} id FileUploader id to look for
			 * @return {plupload.FileUploader}
			 */
			getFile: function(id) {
				return this.getItem(id);
			},

			/**
			 * Adds file to the queue programmatically. Can be native file, instance of Plupload.File,
			 * instance of mOxie.File, input[type="file"] element, or array of these. Fires FilesAdded,
			 * if any files were added to the queue. Otherwise nothing happens.
			 *
			 * @method addFile
			 * @since 2.0
			 * @param {plupload.File|mOxie.File|File|Node|Array} file File or files to add to the queue.
			 * @param {String} [fileName] If specified, will be used as a name for the file
			 */
			addFile: function(file, fileName) {
				var self = this;
				var queue = [];
				var filesAdded = []; // here we track the files that got filtered and are added to the queue


				function bindListeners(fileUp) {
					fileUp.bind('beforestart', function(e) {
						return self.trigger('BeforeUpload', e.target);
					});

					fileUp.bind('startupload', function() {
						self.trigger('UploadFile', this);
					});

					fileUp.bind('progress', function() {
						self.trigger('UploadProgress', this);
					});

					fileUp.bind('done', function(e, args) {
						self.trigger('FileUploaded', this, args);
					});

					fileUp.bind('failed', function(e, err) {
						self.trigger('Error', plupload.extend({
							code: plupload.HTTP_ERROR,
							message: plupload.translate('HTTP Error.'),
							file: this
						}, err));
					});
				}


				function filterFile(file, cb) {
					var queue = [];
					plupload.each(self.getOption('filters'), function(rule, name) {
						if (fileFilters[name]) {
							queue.push(function(cb) {
								fileFilters[name].call(self, rule, file, function(res) {
									cb(!res);
								});
							});
						}
					});
					plupload.inParallel(queue, cb);
				}

				/**
				 * @method resolveFile
				 * @private
				 * @param {mxiFile|mxiBlob|FileUploader|File|Blob|input[type="file"]} file
				 */
				function resolveFile(file) {
					var type = plupload.typeOf(file);

					// mxiFile (final step for other conditional branches)
					if (file instanceof FileRef) {
						queue.push(function(cb) {
							// run through the internal and user-defined filters, if any
							filterFile(file, function(err) {
								var fileUp;

								if (!err) {
									fileUp = new PluploadFile(file, _queueUpload, _queueResize);

									if (fileName) {
										fileUp.name = fileName;
									}

									bindListeners(fileUp);

									self.addItem(fileUp); // make files available for the filters by updating the main queue directly
									filesAdded.push(fileUp);
									self.trigger("FileFiltered", fileUp);
								}

								plupload.delay(cb); // do not build up recursions or eventually we might hit the limits
							});
						});
					}
					// mxiBlob
					else if (file instanceof BlobRef) {
						resolveFile(file.getSource());
						file.destroy();
					}
					// native File or blob
					else if (plupload.inArray(type, ['file', 'blob']) !== -1) {
						resolveFile(new FileRef(null, file));
					}
					// input[type="file"]
					else if (type === 'node' && plupload.typeOf(file.files) === 'filelist') {
						// if we are dealing with input[type="file"]
						plupload.each(file.files, resolveFile);
					}
					// mixed array of any supported types (see above)
					else if (type === 'array') {
						fileName = null; // should never happen, but unset anyway to avoid funny situations
						plupload.each(file, resolveFile);
					}
				}

				resolveFile(file);

				if (queue.length) {
					plupload.inParallel(queue, function() {
						// if any files left after filtration, trigger FilesAdded
						if (filesAdded.length) {
							self.trigger("FilesAdded", filesAdded);
						}
					});
				}
			},

			/**
			 * Removes a specific item from the queue
			 *
			 * @method removeFile
			 * @param {plupload.FileUploader|String} file
			 */
			removeFile: function(file) {
				var item = this.extractItem(typeof(file) === 'string' ? file : file.uid);
				if (item) {
					this.trigger("FilesRemoved", [item]);
					item.destroy();
				}
			},

			/**
			 * Removes part of the queue and returns removed files.
			 * Triggers FilesRemoved and consequently QueueChanged events.
			 *
			 * @method splice
			 * @param {Number} [start=0] Start index to remove from
			 * @param {Number} [length] Length of items to remove
			 */
			splice: function() {
				var i = 0;
				var shouldRestart = plupload.STARTED == this.state;

				var removed = Queue.prototype.splice.apply(this, arguments);
				if (removed.length) {
					this.trigger("FilesRemoved", removed);

					if (shouldRestart) {
						this.stop();
					}

					for (i = 0; i < removed.length; i++) {
						removed[i].destroy();
					}

					if (shouldRestart) {
						this.start();
					}
				}
			},

			/**
			Dispatches the specified event name and its arguments to all listeners.

			@method trigger
			@param {String} name Event name to fire.
			@param {Object..} Multiple arguments to pass along to the listener functions.
			*/

			// override the parent method to match Plupload-like event logic
			dispatchEvent: function(type) {
				var list, args, result;

				type = type.toLowerCase();

				list = this.hasEventListener(type);

				if (list) {
					// sort event list by priority
					list.sort(function(a, b) {
						return b.priority - a.priority;
					});

					// first argument should be current plupload.Uploader instance
					args = [].slice.call(arguments);
					args.shift();
					args.unshift(this);

					for (var i = 0; i < list.length; i++) {
						// Fire event, break chain if false is returned
						if (list[i].fn.apply(list[i].scope, args) === false) {
							return false;
						}
					}
				}
				return true;
			},

			/**
			Check whether uploader has any listeners to the specified event.

			@method hasEventListener
			@param {String} name Event name to check for.
			*/


			/**
			Adds an event listener by name.

			@method bind
			@param {String} name Event name to listen for.
			@param {function} fn Function to call ones the event gets fired.
			@param {Object} [scope] Optional scope to execute the specified function in.
			@param {Number} [priority=0] Priority of the event handler - handlers with higher priorities will be called first
			*/
			bind: function(name, fn, scope, priority) {
				// adapt moxie EventTarget style to Plupload-like
				plupload.Uploader.prototype.bind.call(this, name, fn, priority, scope);
			}

			/**
			Removes the specified event listener.

			@method unbind
			@param {String} name Name of event to remove.
			@param {function} fn Function to remove from listener.
			*/

			/**
			Removes all event listeners.

			@method unbindAll
			*/
		});


		// keep alive deprecated properties
		if (_options.backward_compatibility) {
			this.bind('FilesAdded FilesRemoved', function (up) {
				up.files = up.toArray();
			}, this, 999);

			this.bind('OptionChanged', function (up, name, value) {
				up.settings[name] = typeof(value) == 'object' ? plupload.extend({}, value) : value;
			}, this, 999);
		}


		function bindEventListeners() {
			this.bind('FilesAdded FilesRemoved', function(up) {
				up.trigger('QueueChanged');
				up.refresh();
			}, this, 999);

			this.bind('BeforeUpload', onBeforeUpload);

			this.bind('Stopped', function(up) {
				up.trigger('UploadComplete');
			});

			this.bind('Error', onError);

			this.bind('Destroy', onDestroy);
		}


		function initControls(cb) {
			var self = this;
			var initialized = 0;
			var queue = [];

			// initialize file pickers - there can be many
			if (self.getOption('browse_button')) {
				plupload.each(self.getOption('browse_button'), function(el) {
					queue.push(function(cb) {
						var fileInput = new FileInput({
							accept: self.getOption('filters').mime_types,
							name: self.getOption('file_data_name'),
							multiple: self.getOption('multi_selection'),
							container: self.getOption('container'),
							browse_button: el
						});

						fileInput.onready = function() {
							initialized++;
							_fileInputs.push(this);
							cb();
						};

						fileInput.onchange = function() {
							self.addFile(this.files);
						};

						fileInput.bind('mouseenter mouseleave mousedown mouseup', function(e) {
							if (!_disabled) {
								if (self.getOption('browse_button_hover')) {
									if ('mouseenter' === e.type) {
										plupload.addClass(el, self.getOption('browse_button_hover'));
									} else if ('mouseleave' === e.type) {
										plupload.removeClass(el, self.getOption('browse_button_hover'));
									}
								}

								if (self.getOption('browse_button_active')) {
									if ('mousedown' === e.type) {
										plupload.addClass(el, self.getOption('browse_button_active'));
									} else if ('mouseup' === e.type) {
										plupload.removeClass(el, self.getOption('browse_button_active'));
									}
								}
							}
						});

						fileInput.bind('mousedown', function() {
							self.trigger('Browse');
						});

						fileInput.bind('error', function() {
							fileInput = null;
							cb();
						});

						fileInput.init();
					});
				});
			}

			// initialize drop zones
			if (self.getOption('drop_element')) {
				plupload.each(self.getOption('drop_element'), function(el) {
					queue.push(function(cb) {
						var fileDrop = new FileDrop({
							drop_zone: el
						});

						fileDrop.onready = function() {
							initialized++;
							_fileDrops.push(this);
							cb();
						};

						fileDrop.ondrop = function() {
							self.addFile(this.files);
						};

						fileDrop.bind('error', function() {
							fileDrop = null;
							cb();
						});

						fileDrop.init();
					});
				});
			}


			plupload.inParallel(queue, function() {
				if (typeof(cb) === 'function') {
					cb(initialized);
				}
			});
		}


		// Internal event handlers
		function onBeforeUpload(up, file) {
			// Generate unique target filenames
			if (up.getOption('unique_names')) {
				var matches = file.name.match(/\.([^.]+)$/),
					ext = "part";
				if (matches) {
					ext = matches[1];
				}
				file.target_name = file.id + '.' + ext;
			}
		}


		function onError(up, err) {
			if (err.code === plupload.INIT_ERROR) {
				up.destroy();
			}
			else if (err.code === plupload.HTTP_ERROR && up.state == plupload.STARTED) {
				up.trigger('CancelUpload');
			}
		}


		function onDestroy(up) {
			up.forEachItem(function(file) {
				file.destroy();
			});

			plupload.each(_fileInputs, function(fileInput) {
				fileInput.destroy();
			});

			plupload.each(_fileDrops, function(fileDrop) {
				fileDrop.destroy();
			});

			_fileInputs = [];
			_fileDrops = [];
			_initialized = false;

			if (_queueUpload) {
				_queueUpload.destroy();
			}

			if (_queueResize) {
				_queueResize.destroy();
			}

			_options = _queueUpload = _queueResize = null; // purge these exclusively

		}

	}

	function normalizeOptions(options) {
		plupload.each(options, function(value, option) {
			options[option] = normalizeOption(option, value, options);
		});
		return options;
	}

	/**
	Normalize an option.

	@method normalizeOption
	@private

	@param {String} option Name of the option to normalize
	@param {Mixed} value
	@param {Object} options The whole set of options, that might be modified during normalization (see max_file_size or unique_names)!
	*/
	function normalizeOption(option, value, options) {
		switch (option) {

			case 'chunk_size':
				if (value = plupload.parseSize(value)) {
					options.send_file_name = true;
				}
				break;

			case 'headers':
				var headers = {};
				if (typeof(value) === 'object') {
					plupload.each(value, function(value, key) {
						headers[key.toLowerCase()] = value;
					});
				}
				return headers;

			case 'http_method':
				return value.toUpperCase() === 'PUT' ? 'PUT' : 'POST';


			case 'filters':
				if (plupload.typeOf(value) === 'array') { // for backward compatibility
					value = {
						mime_types: value
					};
				}

				// if file format filters are being updated, regenerate the matching expressions
				if (value.mime_types) {
					if (plupload.typeOf(value.mime_types) === 'string') {
						value.mime_types = plupload.mimes2extList(value.mime_types);
					}

					// generate and cache regular expression for filtering file extensions
					options.re_ext_filter = (function(filters) {
						var extensionsRegExp = [];

						plupload.each(filters, function(filter) {
							plupload.each(filter.extensions.split(/,/), function(ext) {
								if (/^\s*\*\s*$/.test(ext)) {
									extensionsRegExp.push('\\.*');
								} else {
									extensionsRegExp.push('\\.' + ext.replace(new RegExp('[' + ('/^$.*+?|()[]{}\\'.replace(/./g, '\\$&')) + ']', 'g'), '\\$&'));
								}
							});
						});

						return new RegExp('(' + extensionsRegExp.join('|') + ')$', 'i');
					}(value.mime_types));
				}

				return value;

			case 'max_file_size':
				if (options && !options.filters) {
					options.filters = {};
				}
				options.filters.max_file_size = value;
				break;

			case 'multipart':
				if (!value) {
					options.send_file_name = true;
				}
				break;

			case 'multipart_params':
				options.params = options.multipart_params = value;
				break;

			case 'resize':
				if (value) {
					return plupload.extend({
						preserve_headers: true,
						crop: false
					}, value);
				}
				return false;

			case 'prevent_duplicates':
				if (options && !options.filters) {
					options.filters = {};
				}
				options.filters.prevent_duplicates = !!value;
				break;

			case 'unique_names':
				if (value) {
					options.send_file_name = true;
				}
				break;

				// options that require reinitialisation
			case 'container':
			case 'browse_button':
			case 'drop_element':
				return 'container' === option ? plupload.get(value) : plupload.getAll(value);
		}

		return value;
	}


	/**
	 * Registers a filter that will be executed for each file added to the queue.
	 * If callback returns false, file will not be added.
	 *
	 * Callback receives two arguments: a value for the filter as it was specified in settings.filters
	 * and a file to be filtered. Callback is executed in the context of uploader instance.
	 *
	 * @method addFileFilter
	 * @static
	 * @param {String} name Name of the filter by which it can be referenced in settings.filters
	 * @param {String} cb Callback - the actual routine that every added file must pass
	 */
	function addFileFilter(name, cb) {
		fileFilters[name] = cb;
	}


	addFileFilter('mime_types', function(filters, file, cb) {
		if (filters.length && !this.getOption('re_ext_filter').test(file.name)) {
			this.trigger('Error', {
				code: plupload.FILE_EXTENSION_ERROR,
				message: plupload.translate('File extension error.'),
				file: file
			});
			cb(false);
		} else {
			cb(true);
		}
	});


	addFileFilter('max_file_size', function(maxSize, file, cb) {
		var undef;

		maxSize = plupload.parseSize(maxSize);

		// Invalid file size
		if (file.size !== undef && maxSize && file.size > maxSize) {
			this.trigger('Error', {
				code: plupload.FILE_SIZE_ERROR,
				message: plupload.translate('File size error.'),
				file: file
			});
			cb(false);
		} else {
			cb(true);
		}
	});


	addFileFilter('prevent_duplicates', function(value, file, cb) {
		var self = this;
		if (value) {
			this.forEachItem(function(item) {
				// Compare by name and size (size might be 0 or undefined, but still equivalent for both)
				if (file.name === item.name && file.size === item.size) {
					self.trigger('Error', {
						code: plupload.FILE_DUPLICATE_ERROR,
						message: plupload.translate('Duplicate file error.'),
						file: file
					});
					cb(false);
					return;
				}
			});
		}
		cb(true);
	});


	addFileFilter('prevent_empty', function(value, file, cb) {
		if (value && !file.size && file.size !== undef) {
			this.trigger('Error', {
				code : plupload.FILE_SIZE_ERROR,
				message : plupload.translate('File size error.'),
				file : file
			});
			cb(false);
		} else {
			cb(true);
		}
	});


	Uploader.addFileFilter = addFileFilter;

	plupload.inherit(Uploader, Queue);

	// for backward compatibility
	plupload.addFileFilter = addFileFilter;

	return Uploader;
});

expose(["moxie/core/utils/Basic","moxie/core/utils/Env","moxie/core/utils/Dom","moxie/core/utils/Events","moxie/core/utils/Url","moxie/core/I18n","moxie/core/utils/Mime","moxie/core/Exceptions","moxie/core/EventTarget","moxie/file/BlobRef","moxie/file/FileRef","moxie/file/FileInput","moxie/file/FileDrop","plupload","plupload/FileUploader","plupload/File","plupload/Uploader"]);
})(this);
}));
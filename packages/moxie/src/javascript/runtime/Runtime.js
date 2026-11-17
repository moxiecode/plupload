/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/runtime/Runtime', [
	"moxie/core/utils/Env",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/EventTarget"
], function(Env, Basic, Dom, EventTarget) {
	var runtimeConstructors = {}, runtimes = {};

	/**
	Common set of methods and properties for every runtime instance

	@class moxie/runtime/Runtime

	@param {Object} options
	@param {String} type Sanitized name of the runtime
	@param {Object} [caps] Set of capabilities that differentiate specified runtime
	@param {Object} [modeCaps] Set of capabilities that do require specific operational mode
	@param {String} [preferredMode='browser'] Preferred operational mode to choose if no required capabilities were requested
	*/
	function Runtime(options, type, caps, modeCaps, preferredMode) {
		/**
		Dispatched when runtime is initialized and ready.
		Results in RuntimeInit on a connected component.

		@event Init
		*/

		/**
		Dispatched when runtime fails to initialize.
		Results in RuntimeError on a connected component.

		@event Error
		*/

		var self = this
		, _shim
		, _uid = Basic.guid(type + '_')
		, defaultMode = preferredMode || 'browser'
		;

		options = options || {};

		// register runtime in private hash
		runtimes[_uid] = this;

		/**
		Default set of capabilities, which can be redifined later by specific runtime

		@private
		@property caps
		@type Object
		*/
		caps = Basic.extend({
			// Runtime can: 
			// provide access to raw binary data of the file
			access_binary: false,
			// provide access to raw binary data of the image (image extension is optional) 
			access_image_binary: false,
			// display binary data as thumbs for example
			display_media: false,
			// make cross-domain requests
			do_cors: false,
			// accept files dragged and dropped from the desktop
			drag_and_drop: false,
			// filter files in selection dialog by their extensions
			filter_by_extension: true,
			// resize image (and manipulate it raw data of any file in general)
			resize_image: false,
			// periodically report how many bytes of total in the file were uploaded (loaded)
			report_upload_progress: false,
			// provide access to the headers of http response 
			return_response_headers: false,
			// support response of specific type, which should be passed as an argument
			// e.g. runtime.can('return_response_type', 'blob')
			return_response_type: false,
			// return http status code of the response
			return_status_code: true,
			// send custom http header with the request
			send_custom_headers: false,
			// pick up the files from a dialog
			select_file: false,
			// select whole folder in file browse dialog
			select_folder: false,
			// select multiple files at once in file browse dialog
			select_multiple: true,
			// send raw binary data, that is generated after image resizing or manipulation of other kind
			send_binary_string: false,
			// send cookies with http request and therefore retain session
			send_browser_cookies: true,
			// send data formatted as multipart/form-data
			send_multipart: true,
			// slice the file or blob to smaller parts
			slice_blob: false,
			// upload file without preloading it to memory, stream it out directly from disk
			stream_upload: false,
			// programmatically trigger file browse dialog
			summon_file_dialog: false,
			// upload file of specific size, size should be passed as argument
			// e.g. runtime.can('upload_filesize', '500mb')
			upload_filesize: true,
			// initiate http request with specific http method, method should be passed as argument
			// e.g. runtime.can('use_http_method', 'put')
			use_http_method: true
		}, caps);
			
	
		// default to the mode that is compatible with preferred caps
		if (options.preferred_caps) {
			defaultMode = Runtime.getMode(modeCaps, options.preferred_caps, defaultMode);
		}

		if (MXI_DEBUG && Env.debug.runtime) {
			Env.log("\tdefault mode: %s", defaultMode);	
		}
		
		// small extension factory here (is meant to be extended with actual extensions constructors)
		_shim = (function() {
			var objpool = {};
			return {
				exec: function(uid, comp, fn, args) {
					if (_shim[comp]) {
						if (!objpool[uid]) {
							objpool[uid] = {
								context: this,
								instance: new _shim[comp]()
							};
						}
						if (objpool[uid].instance[fn]) {
							return objpool[uid].instance[fn].apply(this, args);
						}
					}
				},

				removeInstance: function(uid) {
					delete objpool[uid];
				},

				removeAllInstances: function() {
					var self = this;
					Basic.each(objpool, function(obj, uid) {
						if (Basic.typeOf(obj.instance.destroy) === 'function') {
							obj.instance.destroy.call(obj.context);
						}
						self.removeInstance(uid);
					});
				}
			};
		}());


		// public methods
		Basic.extend(this, {
			/**
			Specifies whether runtime instance was initialized or not

			@property initialized
			@type {Boolean}
			@default false
			*/
			initialized: false, // shims require this flag to stop initialization retries

			/**
			Unique ID of the runtime

			@property uid
			@type {String}
			*/
			uid: _uid,

			/**
			Runtime type (e.g. flash, html5, etc)

			@property type
			@type {String}
			*/
			type: type,

			/**
			Runtime (not native one) may operate in browser or client mode.

			@property mode
			@private
			@type {String|Boolean} current mode or false, if none possible
			*/
			mode: Runtime.getMode(modeCaps, (options.required_caps), defaultMode),

			/**
			id of the DOM container for the runtime (if available)

			@property shimid
			@type {String}
			*/
			shimid: _uid + '_container',

			/**
			Number of connected clients. If equal to zero, runtime can be destroyed

			@property clients
			@type {Number}
			*/
			clients: 0,

			/**
			Runtime initialization options

			@property options
			@type {Object}
			*/
			options: options,

			/**
			Checks if the runtime has specific capability

			@method can
			@param {String} cap Name of capability to check
			@param {Mixed} [value] If passed, capability should somehow correlate to the value
			@param {Object} [refCaps] Set of capabilities to check the specified cap against (defaults to internal set)
			@return {Boolean} true if runtime has such capability and false, if - not
			*/
			can: function(cap, value) {
				var refCaps = arguments[2] || caps;

				// if cap var is a comma-separated list of caps, convert it to object (key/value)
				if (Basic.typeOf(cap) === 'string' && Basic.typeOf(value) === 'undefined') {
					cap = Runtime.parseCaps(cap);
				}

				if (Basic.typeOf(cap) === 'object') {
					for (var key in cap) {
						if (!this.can(key, cap[key], refCaps)) {
							return false;
						}
					}
					return true;
				}

				// check the individual cap
				if (Basic.typeOf(refCaps[cap]) === 'function') {
					return refCaps[cap].call(this, value);
				} else {
					return (value === refCaps[cap]);
				}
			},

			/**
			Returns container for the runtime as DOM element

			@method getShimContainer
			@return {DOMElement}
			*/
			getShimContainer: function() {
				var container, shimContainer = Dom.get(this.shimid);

				// if no container for shim, create one
				if (!shimContainer) {
					container = Dom.get(this.options.container) || document.body;

					// create shim container and insert it at an absolute position into the outer container
					shimContainer = document.createElement('div');
					shimContainer.id = this.shimid;
					shimContainer.className = 'moxie-shim moxie-shim-' + this.type;

					Basic.extend(shimContainer.style, {
						position: 'absolute',
						top: '0px',
						left: '0px',
						width: '1px',
						height: '1px',
						overflow: 'hidden'
					});

					container.appendChild(shimContainer);
					container = null;
				}

				return shimContainer;
			},

			/**
			Returns runtime as DOM element (if appropriate)

			@method getShim
			@return {DOMElement}
			*/
			getShim: function() {
				return _shim;
			},

			/**
			Invokes a method within the runtime itself (might differ across the runtimes)

			@method shimExec
			@param {Mixed} []
			@protected
			@return {Mixed} Depends on the action and component
			*/
			shimExec: function(component, action) {
				var args = [].slice.call(arguments, 2);
				return self.getShim().exec.call(this, this.uid, component, action, args);
			},

			/**
			Operaional interface that is used by components to invoke specific actions on the runtime
			(is invoked in the scope of component)

			@method exec
			@param {Mixed} []*
			@protected
			@return {Mixed} Depends on the action and component
			*/
			exec: function(component, action) { // this is called in the context of component, not runtime
				var args = [].slice.call(arguments, 2);

				if (self[component] && self[component][action]) {
					return self[component][action].apply(this, args);
				}
				return self.shimExec.apply(this, arguments);
			},

			/**
			Destroys the runtime (removes all events and deletes DOM structures)

			@method destroy
			*/
			destroy: function() {
				if (!self) {
					return; // obviously already destroyed
				}

				var shimContainer = Dom.get(this.shimid);
				if (shimContainer) {
					shimContainer.parentNode.removeChild(shimContainer);
				}

				if (_shim) {
					_shim.removeAllInstances();
				}

				this.unbindAll();
				delete runtimes[this.uid];
				this.uid = null; // mark this runtime as destroyed
				_uid = self = _shim = shimContainer = null;
			}
		});

		// once we got the mode, test against all caps
		if (this.mode && options.required_caps && !this.can(options.required_caps)) {
			this.mode = false;
		}	
	}


	/**
	Default order to try different runtime types

	@property order
	@type String
	@static
	*/
	Runtime.order = 'html5,flash,silverlight,html4';


	/**
	Retrieves runtime from private hash by it's uid

	@method getRuntime
	@private
	@static
	@param {String} uid Unique identifier of the runtime
	@return {Runtime|Boolean} Returns runtime, if it exists and false, if - not
	*/
	Runtime.getRuntime = function(uid) {
		return runtimes[uid] ? runtimes[uid] : false;
	};


	/**
	Register constructor for the Runtime of new (or perhaps modified) type

	@method addConstructor
	@static
	@param {String} type Runtime type (e.g. flash, html5, etc)
	@param {Function} construct Constructor for the Runtime type
	*/
	Runtime.addConstructor = function(type, constructor) {
		constructor.prototype = EventTarget.instance;
		runtimeConstructors[type] = constructor;
	};


	/**
	Get the constructor for the specified type.

	method getConstructor
	@static
	@param {String} type Runtime type (e.g. flash, html5, etc)
	@return {Function} Constructor for the Runtime type
	*/
	Runtime.getConstructor = function(type) {
		return runtimeConstructors[type] || null;
	};


	/**
	Get info about the runtime (uid, type, capabilities)

	@method getInfo
	@static
	@param {String} uid Unique identifier of the runtime
	@return {Mixed} Info object or null if runtime doesn't exist
	*/
	Runtime.getInfo = function(uid) {
		var runtime = Runtime.getRuntime(uid);

		if (runtime) {
			return {
				uid: runtime.uid,
				type: runtime.type,
				mode: runtime.mode,
				can: function() {
					return runtime.can.apply(runtime, arguments);
				}
			};
		}
		return null;
	};


	/**
	Convert caps represented by a comma-separated string to the object representation.

	@method parseCaps
	@static
	@param {String} capStr Comma-separated list of capabilities
	@return {Object}
	*/
	Runtime.parseCaps = function(capStr) {
		var capObj = {};

		if (Basic.typeOf(capStr) !== 'string') {
			return capStr || {};
		}

		Basic.each(capStr.split(','), function(key) {
			capObj[key] = true; // we assume it to be - true
		});

		return capObj;
	};

	/**
	Test the specified runtime for specific capabilities.

	@method can
	@static
	@param {String} type Runtime type (e.g. flash, html5, etc)
	@param {String|Object} caps Set of capabilities to check
	@return {Boolean} Result of the test
	*/
	Runtime.can = function(type, caps) {
		var runtime
		, constructor = Runtime.getConstructor(type)
		, mode
		;
		if (constructor) {
			runtime = new constructor({
				required_caps: caps
			});
			mode = runtime.mode;
			runtime.destroy();
			return !!mode;
		}
		return false;
	};


	/**
	Figure out a runtime that supports specified capabilities.

	@method thatCan
	@static
	@param {String|Object} caps Set of capabilities to check
	@param {String} [runtimeOrder] Comma-separated list of runtimes to check against
	@return {String} Usable runtime identifier or null
	*/
	Runtime.thatCan = function(caps, runtimeOrder) {
		var types = (runtimeOrder || Runtime.order).split(/\s*,\s*/);
		for (var i in types) {
			if (Runtime.can(types[i], caps)) {
				return types[i];
			}
		}
		return null;
	};


	/**
	Figure out an operational mode for the specified set of capabilities.

	@method getMode
	@static
	@param {Object} modeCaps Set of capabilities that depend on particular runtime mode
	@param {Object} [requiredCaps] Supplied set of capabilities to find operational mode for
	@param {String|Boolean} [defaultMode='browser'] Default mode to use 
	@return {String|Boolean} Compatible operational mode
	*/
	Runtime.getMode = function(modeCaps, requiredCaps, defaultMode) {
		var mode = null;

		if (Basic.typeOf(defaultMode) === 'undefined') { // only if not specified
			defaultMode = 'browser';
		}

		if (requiredCaps && !Basic.isEmptyObj(modeCaps)) {
			// loop over required caps and check if they do require the same mode
			Basic.each(requiredCaps, function(value, cap) {
				if (modeCaps.hasOwnProperty(cap)) {
					var capMode = modeCaps[cap](value);

					// make sure we always have an array
					if (typeof(capMode) === 'string') {
						capMode = [capMode];
					}
					
					if (!mode) {
						mode = capMode;						
					} else if (!(mode = Basic.arrayIntersect(mode, capMode))) {
						// if cap requires conflicting mode - runtime cannot fulfill required caps

						if (MXI_DEBUG && Env.debug.runtime) {
							Env.log("\t\t%s: %s (conflicting mode requested: %s)", cap, value, capMode);
						}

						return (mode = false);
					}					
				}

				if (MXI_DEBUG && Env.debug.runtime) {
					Env.log("\t\t%s: %s (compatible modes: %s)", cap, value, mode);
				}
			});

			if (mode) {
				return Basic.inArray(defaultMode, mode) !== -1 ? defaultMode : mode[0];
			} else if (mode === false) {
				return false;
			}
		}
		return defaultMode; 
	};


	/**
	 * Third party shims (Flash and Silverlight) require global event target against which they
	 * will fire their events. However when moxie is not loaded to global namespace, default
	 * event target is not accessible and we have to create artificial ones.
	 *
	 * @method getGlobalEventTarget
	 * @static
	 * @return {String} Name of the global event target
	 */
	Runtime.getGlobalEventTarget = function() {
		if (/^moxie\./.test(Env.global_event_dispatcher) && !Env.can('access_global_ns')) {
			var uniqueCallbackName = Basic.guid('moxie_event_target_');

			window[uniqueCallbackName] = function(e, data) {
				EventTarget.instance.dispatchEvent(e, data);
			};

			Env.global_event_dispatcher = uniqueCallbackName;
		}

		return Env.global_event_dispatcher;
	};


	/**
	Capability check that always returns true

	@private
	@static
	@return {True}
	*/
	Runtime.capTrue = function() {
		return true;
	};

	/**
	Capability check that always returns false

	@private
	@static
	@return {False}
	*/
	Runtime.capFalse = function() {
		return false;
	};

	/**
	Evaluate the expression to boolean value and create a function that always returns it.

	@private
	@static
	@param {Mixed} expr Expression to evaluate
	@return {Function} Function returning the result of evaluation
	*/
	Runtime.capTest = function(expr) {
		return function() {
			return !!expr;
		};
	};

	return Runtime;
});

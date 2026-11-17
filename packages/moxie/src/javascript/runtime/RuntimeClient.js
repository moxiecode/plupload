/**
 * RuntimeClient.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/runtime/RuntimeClient', [
	'moxie/core/utils/Env',
	'moxie/core/Exceptions',
	'moxie/core/utils/Basic',
	'moxie/runtime/Runtime'
], function(Env, x, Basic, Runtime) {
	/**
	Set of methods and properties, required by a component to acquire ability to connect to a runtime

	@class moxie/runtime/RuntimeClient
	*/
	return function RuntimeClient() {
		var runtime;

		Basic.extend(this, {
			/**
			Connects to the runtime specified by the options. Will either connect to existing runtime or create a new one.
			Increments number of clients connected to the specified runtime.

			@private
			@method connectRuntime
			@param {Mixed} options Can be a runtme uid or a set of key-value pairs defining requirements and pre-requisites
			*/
			connectRuntime: function(options) {
				var comp = this, ruid;

				function initialize(items) {
					var type, constructor;

					// if we ran out of runtimes
					if (!items.length) {
						comp.trigger('RuntimeError', new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR));
						runtime = null;
						return;
					}

					type = items.shift().toLowerCase();
					constructor = Runtime.getConstructor(type);
					if (!constructor) {
						if (MXI_DEBUG && Env.debug.runtime) {
							Env.log("Constructor for '%s' runtime is not available.", type);
						}
						initialize(items);
						return;
					}

					if (MXI_DEBUG && Env.debug.runtime) {
						Env.log("Trying runtime: %s", type);
						Env.log(options);
					}

					// try initializing the runtime
					runtime = new constructor(options);

					runtime.bind('Init', function() {
						// mark runtime as initialized
						runtime.initialized = true;

						if (MXI_DEBUG && Env.debug.runtime) {
							Env.log("Runtime '%s' initialized", runtime.type);
						}

						// jailbreak ...
						setTimeout(function() {
							runtime.clients++;
							comp.ruid = runtime.uid;
							// this will be triggered on component
							comp.trigger('RuntimeInit', runtime);
						}, 1);
					});

					runtime.bind('Error', function() {
						if (MXI_DEBUG && Env.debug.runtime) {
							Env.log("Runtime '%s' failed to initialize", runtime.type);
						}

						runtime.destroy(); // runtime cannot destroy itself from inside at a right moment, thus we do it here
						initialize(items);
					});

					runtime.bind('Exception', function(e, err) {
						var message = err.name + "(#" + err.code + ")" + (err.message ? ", from: " + err.message : '');
						
						if (MXI_DEBUG && Env.debug.runtime) {
							Env.log("Runtime '%s' has thrown an exception: %s", this.type, message);
						}
						comp.trigger('RuntimeError', new x.RuntimeError(x.RuntimeError.EXCEPTION_ERR, message));
					});

					if (MXI_DEBUG && Env.debug.runtime) {
						Env.log("\tselected mode: %s", runtime.mode);	
					}

					// check if runtime managed to pick-up operational mode
					if (!runtime.mode) {
						runtime.trigger('Error');
						return;
					}

					runtime.init();
				}

				// check if a particular runtime was requested
				if (Basic.typeOf(options) === 'string') {
					ruid = options;
				} else if (Basic.typeOf(options.ruid) === 'string') {
					ruid = options.ruid;
				}

				if (ruid) {
					runtime = Runtime.getRuntime(ruid);
					if (runtime) {
						comp.ruid = ruid;
						runtime.clients++;
						return runtime;
					} else {
						// there should be a runtime and there's none - weird case
						throw new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR);
					}
				}

				// initialize a fresh one, that fits runtime list and required features best
				initialize((options.runtime_order || Runtime.order).split(/\s*,\s*/));
			},


			/**
			Disconnects from the runtime. Decrements number of clients connected to the specified runtime.

			@private
			@method disconnectRuntime
			*/
			disconnectRuntime: function() {
				if (runtime && --runtime.clients <= 0) {
					runtime.destroy();
				}

				// once the component is disconnected, it shouldn't have access to the runtime
				runtime = null;
			},


			/**
			Returns the runtime to which the client is currently connected.

			@method getRuntime
			@return {Runtime} Runtime or null if client is not connected
			*/
			getRuntime: function() {
				if (runtime && runtime.uid) {
					return runtime;
				}
				return runtime = null; // make sure we do not leave zombies rambling around
			},


			/**
			Handy shortcut to safely invoke runtime extension methods.
			
			@private
			@method exec
			@return {Mixed} Whatever runtime extension method returns
			*/
			exec: function() {
				return runtime ? runtime.exec.apply(this, arguments) : null;
			},


			/**
			Test runtime client for specific capability
			
			@method can
			@param {String} cap
			@return {Bool}
			*/
			can: function(cap) {
				return runtime ? runtime.can(cap) : false;
			}

		});
	};


});
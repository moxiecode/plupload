/**
 * plupload.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload/license
 * Contributing: http://www.plupload/contributing
 */

(function() {
	var count = 0, runtimes = [];

	/**
	 * Plupload class with some global constants and functions.
	 *
	 * @static
	 * @class plupload
	 */
	var plupload = {
		/**
		 * Inital state of the queue and also the state ones it's finished all it's uploads.
		 *
		 * @property STOPPED
		 * @final
		 */
		STOPPED : 1,

		/**
		 * Upload process is running
		 *
		 * @property STARTED
		 * @final
		 */
		STARTED : 2,

		/**
		 * File is queued for upload
		 *
		 * @property QUEUED
		 * @final
		 */
		QUEUED : 1,

		/**
		 * File is being uploaded
		 *
		 * @property UPLOADING
		 * @final
		 */
		UPLOADING : 2,

		/**
		 * File has failed to be uploaded
		 *
		 * @property FAILED
		 * @final
		 */
		FAILED : 4,

		/**
		 * File has been uploaded successfully
		 *
		 * @property DONE
		 * @final
		 */
		DONE : 5,

		/**
		 * Extends the specified object with another object.
		 *
		 * @method extend
		 * @param {Object} target Object to extend.
		 * @param {Object..} obj Multiple objects to extend with.
		 * @return {Object} Same as target, the extended object.
		 */
		extend : function(target) {
			var key, obj, i;

			for (i = 1; i < arguments.length; i++) {
				obj = arguments[i];

				for (key in obj)
					target[key] = obj[key];
			}

			return target;
		},

		/**
		 * Cleans the specified name from national characters. The result will be a name with only a-z, 0-9 and _.
		 *
		 * @method cleanName
		 * @param {String} s String to clean up.
		 * @return {String} Cleaned string.
		 */
		cleanName : function(name) {
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

			for (i = 0; i < lookup.length; i += 2)
				name = name.replace(lookup[i], lookup[i + 1]);

			// Replace whitespace
			name = name.replace(/\s+/g, '_');

			// Remove anything else
			name = name.replace(/[^a-z0-9_\-\.]+/gi, '');

			return name;
		},

		/**
		 * Adds a specific upload runtime like for example flash or gears.
		 *
		 * @method addRuntime
		 * @param {String} name Runtime name for example flash.
		 * @param {Object} obj Object containing init/destroy method.
		 */
		addRuntime : function(name, runtime) {
			runtime.name = name;
			runtimes[name] = runtime;
			runtimes.push(runtime);

			return runtime;
		},

		/**
		 * Generates an unique ID. This is 99.99% unique since it takes the current time and 5 random numbers.
		 * The only way a user would be able to get the same ID is if the two persons at the same exact milisecond manages
		 * to get 5 the same random numbers between 0-65535 it also uses a counter so each call will be guaranteed to be page unique.
		 * It's more probable for the earth to be hit with an ansteriod.
		 *
		 * @method guid
		 * @return {String} Virtually unique id.
		 */
		guid : function() {
			var guid = new Date().getTime().toString(32), i;

			for (i = 0; i < 5; i++)
				guid += Math.floor(Math.random() * 65535 + count).toString(32);

			return guid;
		},

		/**
		 * Formats the specified number as a size string for example 1024 becomes 1 KB.
		 *
		 * @method formatSize
		 * @param {Number} size Size to format as string.
		 * @return {String} Formatted size string.
		 */
		formatSize : function(size) {
			// MB
			if (size > 1048576)
				return Math.round(size / 1048576, 1) + " MB";

			// KB
			if (size > 1024)
				return Math.round(size / 1024, 1) + " KB";

			return size + " b";
		},

		/**
		 * Returns the absolute x, y position of a node. The position will be returned in a object with x, y fields.
		 *
		 * @method getPos
		 * @param {Element/String} node HTML element or element id to get x, y position from.
		 * @param {Element} root Optional root element to stop calculations at.
		 * @return {object} Absolute position of the specified element object with x, y fields.
		 */
		 getPos : function(node, root) {
			var x = 0, y = 0, parent;

			node = node;
			root = root || document.body;

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

			return {x : x, y : y};
		},

		/**
		 * Parses the specified size string into a byte value. For example 10kb becomes 10240.
		 *
		 * @method parseSize
		 * @param {String/Number} size String to parse or number to just pass through.
		 * @return {Number} Size in bytes.
		 */
		parseSize : function(size) {
			var mul;

			if (typeof(size) == 'string') {
				size = /^([0-9]+)([mgk]+)$/.exec(size.toLowerCase().replace(/[^0-9mkg]/g, ''));
				mul = size[2];
				size = parseInt(size[1]);

				if (mul == 'g')
					size *= 1073741824;

				if (mul == 'm')
					size *= 1048576;

				if (mul == 'k')
					size *= 1024;
			}

			return size;
		},

		/**
		 * Encodes the specified string.
		 *
		 * @method xmlEncode
		 * @param {String} s String to encode.
		 * @return {String} Encoded string.
		 */
		xmlEncode : function(s) {
			var lo = {'<' : 'lt', '>' : 'gt', '&' : 'amp', '"' : 'quot', '\'' : '#39'};

			return s ? ('' + s).replace(/[<>&\"\']/g, function(c) {
				return lo[c] ? '&' + lo[c] + ';' : c;
			}) : s;
		},

		/**
		 * Forces anything into an array.
		 *
		 * @method toArray
		 * @param {Object} obj Object with length field.
		 * @return {Array} Array object containing all items.
		 */
		toArray : function(obj) {
			var i, arr = [];

			for (i = 0; i < obj.length; i++)
				arr[i] = obj[i];

			return arr;
		}
	};

	/**
	 * Uploader class, an instance of this class will be created for each upload field.
	 *
	 * @class plupload.Uploader
	 */
	plupload.Uploader = function(settings) {
		var events = {}, total, files = [], fileIndex;

		// Inital total state
		total = new plupload.QueueProgress();

		// Default settings
		settings = plupload.extend({
			chunk_size : '1mb',
			max_file_size : '1gb',
			multi_selection : true
		}, settings);

		// Private methods
		function uploadNext() {
			var file;

			if (this.state == plupload.STARTED && fileIndex < files.length) {
				file = files[fileIndex++];

				if (file.status == plupload.QUEUED)
					this.trigger("UploadFile", file);
				else
					uploadNext.call(this);
			} else
				this.stop();
		};

		function calc() {
			var i;

			// Reset stats
			total.reset();

			// Check status, size, loaded etc on all files
			for (i = 0; i < files.length; i++) {
				total.size += files[i].size;
				total.loaded += files[i].loaded;

				if (files[i].status == plupload.DONE)
					total.uploaded++;
				else if (files[i].status == plupload.FAILED)
					total.failed++;
				else
					total.queued++;
			}

			total.percent = total.size > 0 ? Math.ceil(total.loaded / total.size * 100) : 0;
		};

		// Add public methods
		plupload.extend(this, {
			state : plupload.STOPPED,

			/**
			 * Array of File instances.
			 *
			 * @property files
			 * @type Array
			 * @see plupload.File
			 */
			files : files,

			/**
			 * Object with name/value settings.
			 *
			 * @property settings
			 * @type Object
			 */
			settings : settings,

			/**
			 * Total progess information.
			 *
			 * @property total
			 * @type plupload.QueueProgress
			 */
			total : total,

			/**
			 * Unique id for the Uploader instance.
			 *
			 * @property id
			 * @type String
			 */
			id : plupload.guid(),

			/**
			 * Initializes the Uploader instance and adds internal event listeners.
			 *
			 * @method init
			 */
			init : function() {
				var i, runtimeList, a;

				settings.page_url = settings.page_url || document.location.pathname.replace(/\/[^\/]+$/g, '/');

				// If url is relative force it absolute to the current page
				if (!/^(\w+:\/\/|\/)/.test(settings.url))
					settings.url = settings.page_url + settings.url;

				// Convert settings
				settings.chunk_size = plupload.parseSize(settings.chunk_size);
				settings.max_file_size = plupload.parseSize(settings.max_file_size);

				// Find a suitable runtime
				if (settings.runtimes) {
					runtimeList = settings.runtimes.split(',');

					for (i = 0; i < runtimeList.length; i++) {
						runtime = runtimes[runtimeList[i]];

						// Look for suitable runtime
						if (runtime && runtime.isSupported() !== false) {
							this.runtime = runtime;
							this.trigger('PreInit', runtime.name);
							break;
						}
					}
				} else {
					for (i = 0; i < runtimes.length; i++) {
						runtime = runtimes[i];

						// Look for suitable runtime
						if (runtime && runtime.isSupported() !== false) {
							this.runtime = runtime;
							this.trigger('PreInit', runtime.name);
							break;
						}
					}
				}

				// Add files to queue
				this.bind('FilesSelected', function(up, selected_files) {
					var i, file;

					for (i = 0; i < selected_files.length; i++) {
						file = selected_files[i];
						file.loaded = 0;
						file.percent = 0;

						if (selected_files[i].size > settings.max_file_size)
							file.status = plupload.FAILED;
						else
							file.status = plupload.QUEUED;

						files.push(file);
					}

					this.trigger("QueueChanged");
				});

				this.bind('UploadProgress', function(up, file) {
					if (file.status == plupload.QUEUED)
						file.status = plupload.UPLOADING;

					file.percent = file.size > 0 ? Math.ceil(file.loaded / file.size * 100) : 0;
					calc();
				});

				this.bind('QueueChanged', calc);

				this.bind("FileUploaded", function(up, file) {
					file.status = plupload.DONE;
					up.trigger('UploadProgress', file);
					uploadNext.call(this);
				});

				// Initialize runtime
				if (this.runtime) {
					this.runtime.init(this);
					this.trigger('Init', this.runtime.name);
				}
			},

			/**
			 * Browse for files to upload.
			 *
			 * @method browse
			 * @param {Object} browse_settings name/value collection of settings.
			 */
			browse : function(browse_settings) {
				this.trigger("SelectFiles", plupload.extend({}, settings, browse_settings));
			},

			/**
			 * Starts uploading the queued files.
			 *
			 * @method start
			 */
			start : function() {
				if (this.state != plupload.STARTED) {
					fileIndex = 0;

					this.state = plupload.STARTED;
					this.trigger("StateChanged");

					uploadNext.call(this);
				}
			},

			/**
			 * Stops the upload of the queued files.
			 *
			 * @method stop
			 */
			stop : function() {
				if (this.state != plupload.STOPPED) {
					this.state = plupload.STOPPED;
					this.trigger("StateChanged");
				}
			},

			/**
			 * Returns the specified file object by id.
			 *
			 * @method getFile
			 * @param {String} id File id to look for.
			 * @return {plupload.File} File object or undefined if it wasn't found;
			 */
			getFile : function(id) {
				var i;

				for (i = files.length - 1; i >= 0; i--) {
					if (files[i].id === id) {
						return files[i];
					}
				}
			},

			/**
			 * Removes a specific file.
			 *
			 * @method removeFile
			 * @param {plupload.File} file File to remove from queue.
			 */
			removeFile : function(file) {
				var i;

				for (i = files.length - 1; i >= 0; i--) {
					if (files[i].id === file.id) {
						files.splice(i, 1);
						this.trigger("FileRemoved", file);
					}
				}

				this.trigger("QueueChanged");
			},

			/**
			 * Clears the upload queue. All pending, finished or failed files will be removed from queue.
			 *
			 * @method removeAll
			 */
			removeAll : function() {
				var i, file;

				for (i = files.length - 1; i >= 0; i--) {
					file = files[i];
					files.splice(i, 1);
					this.trigger("FileRemoved", file);
				}

				this.trigger("QueueChanged");
			},

			/**
			 * Dispatches the specified event name and it's arguments to all listeners.
			 *
			 *
			 * @method trigger
			 * @param {String} name Event name to fire.
			 * @param {Object..} Multiple arguments to pass along to the listener functions.
			 */
			trigger : function(name) {
				var list = events[name.toLowerCase()], i;

				// console.log(name, arguments);

				if (list) {
					// Replace name with sender
					arguments[0] = this;

					// Dispatch event to all listeners
					for (i = 0; i < list.length; i++) {
						// Fire event, break chain if false is returned
						if (list[i].func.apply(list[i].scope, arguments) === false)
							return false;
					}
				}

				return true;
			},

			/**
			 * Adds an event listener by name.
			 *
			 * @method bind
			 * @param {String} name Event name to listen for.
			 * @param {function} func Function to call ones the event gets fired.
			 * @param {Object} scope Optional scope to execute the specified function in.
			 */
			bind : function(name, func, scope) {
				var list;

				name = name.toLowerCase();
				list = events[name] || [];
				list.push({func : func, scope : scope || this});
				events[name] = list;
			},

			/**
			 * Removes the specified event listener.
			 *
			 * @method unbind
			 * @param {String} name Name of event to remove.
			 * @param {function} func Function to remove from listener.
			 */
			unbind : function(name, func) {
				var list = events[name.toLowerCase()], i;

				if (list) {
					for (i = list.length - 1; i >= 0; i--) {
						if (list[i].func === func)
							list.splice(i, 1);
					}
				}
			}

			/**
			 * Fires when a file is to be uploaded by the runtime.
			 *
			 * @event UploadFile
			 * @param {plupload.Uploader} uploader Uploader instance sending the event.
			 * @param {plupload.File} file File to be uploaded.
			 */
		});
	};

	/**
	 * File instance.
	 *
	 * @class plupload.File
	 * @param {String} name Name of the file.
	 * @param {Number} size File size.
	 */
	plupload.File = function(id, name, size) {
		var t = this;

		/**
		 * File id this is a globally unique id for the specific file.
		 *
		 * @property id
		 * @type String
		 */
		t.id = id;

		/**
		 * File name for example "myfile.gif".
		 *
		 * @property name
		 * @type String
		 */
		t.name = name;

		/**
		 * File size in bytes.
		 *
		 * @property size
		 * @type Number
		 */
		t.size = size;

		/**
		 * Number of bytes uploaded of the files total size.
		 *
		 * @property loaded
		 * @type Number
		 */
		t.loaded = 0;

		/**
		 * Number of percentage uploaded of the file.
		 *
		 * @property percent
		 * @type Number
		 */
		t.percent = 0;

		/**
		 * Status constant matching the plupload states QUEUED, UPLOADING, FAILED, DONE.
		 *
		 * @property status
		 * @type Number
		 */
		t.status = 0;
	};

	/**
	 * Runtime class gets implemented by each upload runtime.
	 *
	 * @static
	 * @class plupload.Runtime
	 */
	plupload.Runtime = function() {
		/**
		 * Checks if the runtime is supported by the browser or not.
		 *
		 * @method isSupported
		 * @return {boolean} true/false if the runtime exists.
		 */
		this.isSupported = function() {
		};

		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 */
		this.init = function(uploader) {
		};
	};

	/**
	 * Runtime class gets implemented by each upload runtime.
	 *
	 * @class plupload.QueueProgress
	 */
	 plupload.QueueProgress = function() {
		var t = this;

		/**
		 * Total queue file size.
		 *
		 * @property size
		 * @type Number
		 */
		t.size = 0;

		/**
		 * Total bytes uploaded.
		 *
		 * @property loaded
		 * @type Number
		 */
		t.loaded = 0;

		/**
		 * Number of files uploaded.
		 *
		 * @property uploaded
		 * @type Number
		 */
		t.uploaded = 0;

		/**
		 * Number of files failed to upload.
		 *
		 * @property failed
		 * @type Number
		 */
		t.failed = 0;

		/**
		 * Number of files yet to be uploaded.
		 *
		 * @property queued
		 * @type Number
		 */
		t.queued = 0;

		/**
		 * Total percent of the uploaded bytes.
		 *
		 * @property percent
		 * @type Number
		 */
		t.percent = 0;

		/**
		 * Resets the progress to it's initial values.
		 *
		 * @method reset
		 */
		t.reset = function() {
			t.size = t.loaded = t.uploaded = t.failed = t.queued = t.percent = 0;
		};
	 };

	// Expose plupload namespace
	window.plupload = plupload;
})();

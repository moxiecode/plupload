;(function(window, o, undef) {
	
var delay = window.setTimeout;

/** 
 * @module plupload	
 * @static
 */
var plupload = {
	/**
	 * Plupload version will be replaced on build.
	 *
	 * @property VERSION
	 * @for Plupload
	 * @static
	 * @final
	 */
	VERSION : '@@version@@',

	/**
	 * Inital state of the queue and also the state ones it's finished all it's uploads.
	 *
	 * @property STOPPED
	 * @static
	 * @final
	 */
	STOPPED : 1,

	/**
	 * Upload process is running
	 *
	 * @property STARTED
	 * @static
	 * @final
	 */
	STARTED : 2,

	/**
	 * File is queued for upload
	 *
	 * @property QUEUED
	 * @static
	 * @final
	 */
	QUEUED : 1,

	/**
	 * File is being uploaded
	 *
	 * @property UPLOADING
	 * @static
	 * @final
	 */
	UPLOADING : 2,

	/**
	 * File has failed to be uploaded
	 *
	 * @property FAILED
	 * @static
	 * @final
	 */
	FAILED : 4,

	/**
	 * File has been uploaded successfully
	 *
	 * @property DONE
	 * @static
	 * @final
	 */
	DONE : 5,

	// Error constants used by the Error event

	/**
	 * Generic error for example if an exception is thrown inside Silverlight.
	 *
	 * @property GENERIC_ERROR
	 * @static
	 * @final
	 */
	GENERIC_ERROR : -100,

	/**
	 * HTTP transport error. For example if the server produces a HTTP status other than 200.
	 *
	 * @property HTTP_ERROR
	 * @static
	 * @final
	 */
	HTTP_ERROR : -200,

	/**
	 * Generic I/O error. For exampe if it wasn't possible to open the file stream on local machine.
	 *
	 * @property IO_ERROR
	 * @static
	 * @final
	 */
	IO_ERROR : -300,

	/**
	 * Generic I/O error. For exampe if it wasn't possible to open the file stream on local machine.
	 *
	 * @property SECURITY_ERROR
	 * @static
	 * @final
	 */
	SECURITY_ERROR : -400,

	/**
	 * Initialization error. Will be triggered if no runtime was initialized.
	 *
	 * @property INIT_ERROR
	 * @static
	 * @final
	 */
	INIT_ERROR : -500,

	/**
	 * File size error. If the user selects a file that is too large it will be blocked and an error of this type will be triggered.
	 *
	 * @property FILE_SIZE_ERROR
	 * @static
	 * @final
	 */
	FILE_SIZE_ERROR : -600,

	/**
	 * File extension error. If the user selects a file that isn't valid according to the filters setting.
	 *
	 * @property FILE_EXTENSION_ERROR
	 * @static
	 * @final
	 */
	FILE_EXTENSION_ERROR : -601,
	
	/**
	 * Runtime will try to detect if image is proper one. Otherwise will throw this error.
	 *
	 * @property IMAGE_FORMAT_ERROR
	 * @static
	 * @final
	 */
	IMAGE_FORMAT_ERROR : -700,
	
	/**
	 * While working on the image runtime will try to detect if the operation may potentially run out of memeory and will throw this error.
	 *
	 * @property IMAGE_MEMORY_ERROR
	 * @static
	 * @final
	 */
	IMAGE_MEMORY_ERROR : -701,
	
	/**
	 * Each runtime has an upper limit on a dimension of the image it can handle. If bigger, will throw this error.
	 *
	 * @property IMAGE_DIMENSIONS_ERROR
	 * @static
	 * @final
	 */
	IMAGE_DIMENSIONS_ERROR : -702,
	

	/**
	 * Mime type lookup table.
	 *
	 * @property mimeTypes
	 * @type Object
	 * @final
	 */
	mimeTypes : o.mimes,
	
	/**
	 * In some cases sniffing is the only way around :(
	 */
	ua: o.ua,
	
	/**
	 * Gets the true type of the built-in object (better version of typeof).
	 * @credits Angus Croll (http://javascriptweblog.wordpress.com/)
	 *
	 * @param {Object} o Object to check.
	 * @return {String} Object [[Class]]
	 */
	typeOf: o.typeOf,

	/**
	 * Extends the specified object with another object.
	 *
	 * @method extend
	 * @param {Object} target Object to extend.
	 * @param {Object..} obj Multiple objects to extend with.
	 * @return {Object} Same as target, the extended object.
	 */
	extend : o.extend,
	
	/**
	 * Generates an unique ID. This is 99.99% unique since it takes the current time and 5 random numbers.
	 * The only way a user would be able to get the same ID is if the two persons at the same exact milisecond manages
	 * to get 5 the same random numbers between 0-65535 it also uses a counter so each call will be guaranteed to be page unique.
	 * It's more probable for the earth to be hit with an ansteriod. You can also if you want to be 100% sure set the plupload.guidPrefix property
	 * to an user unique key.
	 *
	 * @method guid
	 * @return {String} Virtually unique id.
	 */
	guid : o.guid,
	
	/**
	 * Executes the callback function for each item in array/object. If you return false in the
	 * callback it will break the loop.
	 *
	 * @param {Object} obj Object to iterate.
	 * @param {function} callback Callback function to execute for each item.
	 */
	each : o.each,
	
	/**
	 * Returns the absolute x, y position of an Element. The position will be returned in a object with x, y fields.
	 *
	 * @method getPos
	 * @param {Element} node HTML element or element id to get x, y position from.
	 * @param {Element} root Optional root element to stop calculations at.
	 * @return {object} Absolute position of the specified element object with x, y fields.
	 */
	 getPos : o.getPos,

	/**
	 * Returns the size of the specified node in pixels.
	 *
	 * @param {Node} node Node to get the size of.
	 * @return {Object} Object with a w and h property.
	 */
	getSize : o.getSize,

	/**
	 * Encodes the specified string.
	 *
	 * @method xmlEncode
	 * @param {String} s String to encode.
	 * @return {String} Encoded string.
	 */
	xmlEncode : o.xmlEncode,

	/**
	 * Forces anything into an array.
	 *
	 * @method toArray
	 * @param {Object} obj Object with length field.
	 * @return {Array} Array object containing all items.
	 */
	toArray : o.toArray,
	
	/**
	 * Find an element in array and return it's index if present, otherwise return -1.
	 *
	 * @method inArray
	 * @param {mixed} needle Element to find
	 * @param {Array} array
	 * @return {Int} Index of the element, or -1 if not found
	 */
	inArray : o.inArray,

	/**
	 * Extends the language pack object with new items.
	 *
	 * @param {Object} pack Language pack items to add.
	 * @return {Object} Extended language pack object.
	 */
	addI18n : o.addI18n,

	/**
	 * Translates the specified string by checking for the english string in the language pack lookup.
	 *
	 * @param {String} str String to look for.
	 * @return {String} Translated string or the input string if it wasn't found.
	 */
	translate : o.translate,
	
	/**
	 * Checks if object is empty.
	 *
	 * @param {Object} obj Object to check.
	 * @return {Boolean}
	 */
	isEmptyObj : o.isEmptyObj,
	
	/**
	 * Checks if specified DOM element has specified class.
	 *
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	hasClass : o.hasClass,
	
	/**
	 * Adds specified className to specified DOM element.
	 *
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	addClass : o.addClass,
	
	/**
	 * Removes specified className from specified DOM element.
	 *
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	removeClass : o.removeClass,

	/**
	 * Returns a given computed style of a DOM element.
	 *
	 * @param {Object} obj DOM element like object.
	 * @param {String} name Style you want to get from the DOM element
	 */
	getStyle : o.getStyle,

	/**
	 * Adds an event handler to the specified object and store reference to the handler
	 * in objects internal Plupload registry (@see removeEvent).
	 *
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Name to add event listener to.
	 * @param {Function} callback Function to call when event occurs.
	 * @param {String} (optional) key that might be used to add specifity to the event record.
	 */
	addEvent : o.addEvent,
	
	
	/**
	 * Remove event handler from the specified object. If third argument (callback)
	 * is not specified remove all events with the specified name.
	 *
	 * @param {Object} obj DOM element to remove event listener(s) from.
	 * @param {String} name Name of event listener to remove.
	 * @param {Function|String} (optional) might be a callback or unique key to match.
	 */
	removeEvent: o.removeEvent,
	
	
	/**
	 * Remove all kind of events from the specified object
	 *
	 * @param {Object} obj DOM element to remove event listeners from.
	 * @param {String} (optional) unique key to match, when removing events.
	 */
	removeAllEvents: o.removeAllEvents,
	
	/**
	 * Cleans the specified name from national characters (diacritics). The result will be a name with only a-z, 0-9 and _.
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
	 * @param {String} url Base URL to append query string items to.
	 * @param {Object} items Name/value object to serialize as a querystring.
	 * @return {String} String with url + serialized query string items.
	 */
	buildUrl : function(url, items) {
		var query = '';

		plupload.each(items, function(value, name) {
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
	 * @param {Number} size Size to format as string.
	 * @return {String} Formatted size string.
	 */
	formatSize : function(size) {
		if (size === undef || /\D/.test(size)) {
			return plupload.translate('N/A');
		}
		
		// GB
		if (size > 1073741824) {
			return Math.round(size / 1073741824, 1) + " GB";
		}

		// MB
		if (size > 1048576) {
			return Math.round(size / 1048576, 1) + " MB";
		}

		// KB
		if (size > 1024) {
			return Math.round(size / 1024, 1) + " KB";
		}

		return size + " b";
	},


	/**
	 * Parses the specified size string into a byte value. For example 10kb becomes 10240.
	 *
	 * @method parseSize
	 * @param {String/Number} size String to parse or number to just pass through.
	 * @return {Number} Size in bytes.
	 */
	parseSize : o.parseSizeStr
};


/**
@class Uploader
@constructor

@param {Object} settings For detailed information about each option check documentation.
	@param {String} settings.browse_button id of the DOM element to use as file dialog trigger.
	@param {String} settings.url URL of the server-side upload handler.
	@param {Number|String} [settings.chunk_size=0] Chunk size in bytes to slice the file into. Shorcuts with b, kb, mb, gb, tb suffixes also supported. `e.g. 204800 or "204800b" or "200kb"`. By default - disabled.
	@param {String} [settings.container] id of the DOM element to use as a container for uploader structures. Defaults to document.body.
	@param {String} [settings.drop_element] id of the DOM element to use as a drop zone for Drag-n-Drop.
	@param {String} [settings.file_data_name="file"] Name for the file field in Multipart formated message.
	@param {Array} [settings.filters=[]] Set of file type filters, each one defined by hash of title and extensions. `e.g. {title : "Image files", extensions : "jpg,jpeg,gif,png"}`
	@param {String} [settings.flash_swf_url] URL of the Flash swf.
	@param {Object} [settings.headers] Custom headers to send with the upload. Hash of name/value pairs.
	@param {Number|String} [settings.max_file_size] Maximum file size that the user can pick, in bytes. Optionally supports b, kb, mb, gb, tb suffixes. `e.g. "10mb" or "1gb"`. By default - not set.
	@param {Boolean} [settings.multipart=true] Whether to send file and additional parameters as Multipart formated message.
	@param {Object} [settings.multipart_params] Hash of key/value pairs to send with every file upload.
	@param {Boolean} [settings.multi_selection=true] Enable ability to select multiple files at once in file dialog.
	@param {String|Object} [settings.required_features] Either comma-separated list or hash of required features that chosen runtime should absolutely possess.
	@param {Object} [settings.resize] Enable resizng of images on client-side. Applies to `image/jpeg` and `image/png` only. `e.g. {width : 200, height : 200, quality : 90, crop: true}`
		@param {Number} [settings.resize.width] If image is bigger, it will be resized.
		@param {Number} [settings.resize.height] If image is bigger, it will be resized.
		@param {Number} [settings.resize.quality=90] Compression quality for jpegs (1-100).
		@param {Boolean} [settings.resize.crop=false] Whether to crop images to exact dimensions. By default they will be resized proportionally.
	@param {String} [settings.runtimes="html5,flash,silverlight,html4"] Comma separated list of runtimes, that Plupload will try in turn, moving to the next if previous fails.
	@param {String} [settings.silverlight_xap_url] URL of the Silverlight xap.
	@param {Boolean} [settings.unique_names=false] If true will generate unique filenames for uploaded files.
	@param {Boolean} [settings.urlstream_upload=false] Option specific to Flash runtime, enables URLStream upload mode.
*/
plupload.Uploader = function(settings) {
	/**
	 * Fires when the current RunTime has been initialized.
	 *
	 * @event Init
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires after the init event incase you need to perform actions there.
	 *
	 * @event PostInit
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires when the silverlight/flash or other shim needs to move.
	 *
	 * @event Refresh
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires when the overall state is being changed for the upload queue.
	 *
	 * @event StateChanged
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires when a file is to be uploaded by the runtime.
	 *
	 * @event UploadFile
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File to be uploaded.
	 */

	/**
	 * Fires when just before a file is uploaded. This event enables you to override settings
	 * on the uploader instance before the file is uploaded.
	 *
	 * @event BeforeUpload
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File to be uploaded.
	 */

	/**
	 * Fires when the file queue is changed. In other words when files are added/removed to the files array of the uploader instance.
	 *
	 * @event QueueChanged
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */

	/**
	 * Fires while a file is being uploaded. Use this event to update the current file upload progress.
	 *
	 * @event UploadProgress
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File that is currently being uploaded.
	 */

	/**
	 * Fires while a file was removed from queue.
	 *
	 * @event FilesRemoved
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Array} files Array of files that got removed.
	 */

	/**
	 * Fires while when the user selects files to upload.
	 *
	 * @event FilesAdded
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Array} files Array of file objects that was added to queue/selected by the user.
	 */

	/**
	 * Fires when a file is successfully uploaded.
	 *
	 * @event FileUploaded
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File that was uploaded.
	 * @param {Object} response Object with response properties.
	 */

	/**
	 * Fires when file chunk is uploaded.
	 *
	 * @event ChunkUploaded
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {plupload.File} file File that the chunk was uploaded for.
	 * @param {Object} response Object with response properties.
	 */

	/**
	 * Fires when all files in a queue are uploaded.
	 *
	 * @event UploadComplete
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Array} files Array of file objects that was added to queue/selected by the user.
	 */

	/**
	 * Fires when a error occurs.
	 *
	 * @event Error
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 * @param {Object} error Contains code, message and sometimes file and other details.
	 */
	 
	 /**
	 * Fires when destroy method is called.
	 *
	 * @event Destroy
	 * @param {plupload.Uploader} uploader Uploader instance sending the event.
	 */
	var files = [], events = {}, required_features = [], required_caps = {}, feature2cap = {}, 
		startTime, total, disabled = false, 
		fileInput, fileDrop, xhr;

	// Inital total state
	total = new plupload.QueueProgress();

	// Default settings
	settings = plupload.extend({
		chunk_size : 0,
		multipart : true,
		multi_selection : true,
		file_data_name : 'file',
		filters : [],
		urlstream_upload: false // forces Flash runtime into the URLStream mode
	}, settings);


	// Required features
	feature2cap = {
		chunks: 'slice_blob',
		resize: 'send_binary_string',
		jpgresize: 'send_binary_string',
		pngresize: 'send_binary_string',
		multipart: 'send_multipart',
		progress: 'report_upload_progress',
		multi_selection: 'select_multiple',
		canSendBinary: 'send_binary'

		//dragdrop: 'drag_and_drop',
		//triggerDialog: 'summon_file_dialog'
	};

	if (typeof(settings.required_features) === 'string') {
		required_features = settings.required_features.split(/\s*,\s*/);
	}

	if (required_features.length) {
		plupload.each(required_features, function(feature) {
			if (feature2cap[feature]) {
				required_caps[feature2cap[feature]] = true;
			} else {
				required_caps[feature] = true;
			}
		});
	}


	// Private methods
	function uploadNext() {
		var file, count = 0, i;

		if (this.state == plupload.STARTED) {
			// Find first QUEUED file
			for (i = 0; i < files.length; i++) {
				if (!file && files[i].status == plupload.QUEUED) {
					file = files[i];
					if (this.trigger("BeforeUpload", file)) {
						file.status = plupload.UPLOADING;
						this.trigger("UploadFile", file);
					}
				} else {
					count++;
				}
			}

			// All files are DONE or FAILED
			if (count == files.length) {
				this.stop();
				this.trigger("UploadComplete", files);
			}
		}
	}

	function calcFile(file) {
		file.percent = file.size > 0 ? Math.ceil(file.loaded / file.size * 100) : 100;
		calc();
	}

	function calc() {
		var i, file;

		// Reset stats
		total.reset();

		// Check status, size, loaded etc on all files
		for (i = 0; i < files.length; i++) {
			file = files[i];

			if (file.size !== undef) {
				// We calculate totals based on original file size
				total.size += file.origSize; 

				// Since we cannot predict file size after resize, we do opposite and
				// interpolate loaded amount to match magnitude of total
				total.loaded += file.loaded * file.origSize / file.size;
			} else {
				total.size = undef;
			}

			if (file.status == plupload.DONE) {
				total.uploaded++;
			} else if (file.status == plupload.FAILED) {
				total.failed++;
			} else {
				total.queued++;
			}
		}

		// If we couldn't calculate a total file size then use the number of files to calc percent
		if (total.size === undef) {
			total.percent = files.length > 0 ? Math.ceil(total.uploaded / files.length * 100) : 0;
		} else {
			total.bytesPerSec = Math.ceil(total.loaded / ((+new Date() - startTime || 1) / 1000.0));
			total.percent = total.size > 0 ? Math.ceil(total.loaded / total.size * 100) : 0;
		}
	}
	
	function addSelectedFiles(native_files) {
		var i, files = [];
		
		// Add the selected files to the file queue
		for (i = 0; i < native_files.length; i++) {
			files.push(new plupload.File(native_files[i])); 
		}

		// Trigger FilesAdded event if we added any
		if (files.length) {
			this.trigger("FilesAdded", files);
		}
	}


	function initControls() {
		var self = this, initialized = 0;

		o.inSeries([
			function(cb) {
				// Initialize file dialog trigger
				if (settings.browse_button) {
					try {
						fileInput = new o.FileInput({
							accept: settings.filters,
							runtime_order: settings.runtimes,
							name: settings.file_data_name,
							multiple: settings.multi_selection,
							container: settings.container,
							browse_button: settings.browse_button,
							required_caps: required_caps,
							swf_url: settings.flash_swf_url,
							xap_url: settings.silverlight_xap_url
						});

						fileInput.onready = function() {
							var info = o.Runtime.getInfo(this.ruid);

							// for backward compatibility
							o.extend(self.features, {
								chunks: info.can('slice_blob'),
								multipart: info.can('send_multipart'),
								multi_selection: info.can('select_multiple')
							});

							initialized++;
							cb();
						};

						fileInput.onerror = function() {
							cb();
						};

						fileInput.onchange = function() {
							addSelectedFiles.call(self, this.files);
						};
						
						
						fileInput.bind('mouseenter mouseleave mousedown mouseup', function(e) {
							if (!disabled) {
								var bButton = o(settings.browse_button);
								if (bButton) {
									if (settings.browse_button_hover) {
										if ('mouseenter' === e.type) {
											o.addClass(bButton, settings.browse_button_hover);
										} else if ('mouseleave' === e.type) {
											o.removeClass(bButton, settings.browse_button_hover);
										}
									}
									
									if (settings.browse_button_active) {
										if ('mousedown' === e.type) {
											o.addClass(bButton, settings.browse_button_active);
										} else if ('mouseup' === e.type) {
											o.removeClass(bButton, settings.browse_button_active);
										}
									}
									bButton = null;
								}
							}
						});

						fileInput.init();
					} catch (ex) {
						cb();
					}
				} else {
					cb();
				}
			},

			function(cb) {
				// Initialize drag/drop interface if requested
				if (settings.drop_element) {
					try {
						fileDrop = new o.FileDrop({
							drop_zone: settings.drop_element,
							accept: settings.filters,
							runtime_order: settings.runtimes,
							required_caps: required_caps,
							swf_url: settings.flash_swf_url,
							xap_url: settings.silverlight_xap_url
						});

						fileDrop.onerror = function() {
							cb();
						};

						fileDrop.onready = function() {
							var info = o.Runtime.getInfo(this.ruid);

							self.features.dragdrop = info.can('drag_and_drop');

							initialized++;
							cb();
						};

						fileDrop.ondrop = function() {
							addSelectedFiles.call(self, this.files);
						};

						fileDrop.init();
					} catch(ex) {
						cb();
					}
				} else {
					cb();
				}
			}
		], 
		function(error) {

			if (initialized) {
				self.trigger('PostInit');

				if (typeof(settings.init) == "function") {
					settings.init(self);
				} else {
					plupload.each(settings.init, function(func, name) {
						self.bind(name, func);
					});
				}
			} else {
				self.trigger('Error', {
					code : plupload.INIT_ERROR,
					message : plupload.translate('Init error.')
				});
			}
		});
	}


	function runtimeCan(file, cap) {
		if (file.ruid) {
			var info = o.Runtime.getInfo(file.ruid);
			if (info) {
				return info.can(cap);
			}
		}
		return false;
	}


	function resizeImage(blob, params, cb) {
		var img = new o.Image();

		try {
			img.onload = function() {
				img.resize(params.width, params.height, params.crop);
			};

			img.onresize = function() {
				cb(img.getAsBlob(blob.type, params.quality));
			};

			img.onerror = function() {
				cb(blob);
			};

			img.load(blob);
		} catch(ex) {
			cb(blob); 
		}
	}


	// Add public methods
	plupload.extend(this, {

		/**
		 * Unique id for the Uploader instance.
		 *
		 * @property id
		 * @type String
		 */
		id : plupload.guid(),
		
		/**
		 * Current state of the total uploading progress. This one can either be plupload.STARTED or plupload.STOPPED.
		 * These states are controlled by the stop/start methods. The default value is STOPPED.
		 *
		 * @property state
		 * @type Number
		 */
		state : plupload.STOPPED,
		

		/**
		 * Map of features that are available for the uploader runtime. Features will be filled
		 * before the init event is called, these features can then be used to alter the UI for the end user.
		 * Some of the current features that might be in this map is: dragdrop, chunks, jpgresize, pngresize.
		 *
		 * @property features
		 * @type Object
		 */
		features : {},

		/**
		 * Current upload queue, an array of File instances.
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
		 * Total progess information. How many files has been uploaded, total percent etc.
		 *
		 * @property total
		 * @type plupload.QueueProgress
		 */
		total : total,


		/**
		 * Initializes the Uploader instance and adds internal event listeners.
		 *
		 * @method init
		 */
		init : function() {
			var self = this;

			// Convert settings
			settings.chunk_size = plupload.parseSize(settings.chunk_size);
			settings.max_file_size = plupload.parseSize(settings.max_file_size);

			// Check if drop zone requested
			settings.drop_element = o(settings.drop_element);


			if (typeof(settings.preinit) == "function") {
				settings.preinit(self);
			} else {
				plupload.each(settings.preinit, function(func, name) {
					self.bind(name, func);
				});
			}

			// Add files to queue
			self.bind('FilesAdded', function(up, selected_files) {
				var i, file, count = 0, extensionsRegExp, filters = settings.filters;

				// Convert extensions to regexp
				if (filters && filters.length) {
					extensionsRegExp = [];
					
					plupload.each(filters, function(filter) {
						plupload.each(filter.extensions.split(/,/), function(ext) {
							if (/^\s*\*\s*$/.test(ext)) {
								extensionsRegExp.push('\\.*');
							} else {
								extensionsRegExp.push('\\.' + ext.replace(new RegExp('[' + ('/^$.*+?|()[]{}\\'.replace(/./g, '\\$&')) + ']', 'g'), '\\$&'));
							}
						});
					});
					
					extensionsRegExp = new RegExp(extensionsRegExp.join('|') + '$', 'i');
				}

				for (i = 0; i < selected_files.length; i++) {
					file = selected_files[i];
					file.loaded = 0;
					file.percent = 0;
					file.status = plupload.QUEUED;

					// Invalid file extension
					if (extensionsRegExp && !extensionsRegExp.test(file.name)) {
						up.trigger('Error', {
							code : plupload.FILE_EXTENSION_ERROR,
							message : plupload.translate('File extension error.'),
							file : file
						});

						continue;
					}

					// Invalid file size
					if (file.size !== undef && file.size > settings.max_file_size) {
						up.trigger('Error', {
							code : plupload.FILE_SIZE_ERROR,
							message : plupload.translate('File size error.'),
							file : file
						});

						continue;
					}

					// Add valid file to list
					files.push(file);
					count++;
				}

				// Only trigger QueueChanged event if any files where added
				if (count) {
					delay(function() {
						self.trigger("QueueChanged");
						self.refresh();
					}, 1);
				} else {
					return false; // Stop the FilesAdded event from immediate propagation
				}
			});
			
			self.bind("CancelUpload", function() {
				if (xhr) {
					xhr.abort();	
				}
			});

			// Generate unique target filenames
			if (settings.unique_names) {
				self.bind("UploadFile", function(up, file) {
					var matches = file.name.match(/\.([^.]+)$/), ext = "part";

					if (matches) {
						ext = matches[1];
					}

					file.target_name = file.id + '.' + ext;
				});
			}
			
			self.bind("UploadFile", function(up, file) {
				var blob, url = up.settings.url, features = up.features;
						
				function uploadNextChunk() {
					var chunkBlob, formData, br, chunk = 0, chunks, args, chunkSize, curChunkSize, mimeType;													

					// File upload finished
					if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
						return;
					}

					// Standard arguments
					args = {name : file.target_name || file.name};

					// Only add chunking args if needed
					if (settings.chunk_size && features.chunks && blob.size > settings.chunk_size) { // blob will be of type string if it was loaded in memory 
						chunkSize = settings.chunk_size;
						chunk = Math.floor(file.loaded / chunkSize);
						chunks = Math.ceil(blob.size / chunkSize);
						curChunkSize = Math.min(chunkSize, blob.size - (chunk * chunkSize));					
						
						chunkBlob = blob.slice(chunk * chunkSize, chunk * chunkSize + curChunkSize);

						// Setup query string arguments
						args.chunk = chunk;
						args.chunks = chunks;
					} else {
						curChunkSize = blob.size;
						chunkBlob = blob;
					}
					
							
					xhr = new o.XMLHttpRequest;
													
					// Do we have upload progress support
					if (xhr.upload) {
						xhr.upload.onprogress = function(e) {
							file.loaded = Math.min(file.size, file.loaded + e.loaded);
							up.trigger('UploadProgress', file);
						};
					}
					
					xhr.onload = function() {
						// Handle chunk response
						if (chunks) {
							if (chunkBlob.isDetached()) { // Dispose if standalone chunk
								chunkBlob.destroy(); 
							}

							chunkArgs = {
								chunk : chunk,
								chunks : chunks,
								response : xhr.responseText,
								status : xhr.status
							};

							up.trigger('ChunkUploaded', file, chunkArgs);

							file.loaded = Math.min(file.size, (chunk + 1) * chunkSize);
						} else {
							file.loaded = file.size;
						}
						
						up.trigger('UploadProgress', file);
								
						chunkBlob = formData = null; // Free memory
						
						// Check if file is uploaded
						if (!chunks || ++chunk >= chunks) {
							file.status = plupload.DONE;
																		
							up.trigger('FileUploaded', file, {
								response : xhr.responseText,
								status : xhr.status
							});										
						} else {										
							// Still chunks left
							uploadNextChunk();
						}
					};
					
					xhr.onerror = function() {
						up.trigger('Error', {
							code : plupload.HTTP_ERROR,
							message : plupload.translate('HTTP Error.'),
							file : file,
							status : xhr.status
						});
					};							

					// Build multipart request
					if (up.settings.multipart && features.multipart) {
						
						args.name = file.target_name || file.name;
						
						xhr.open("post", url, true);
						
						// Set custom headers
						plupload.each(up.settings.headers, function(value, name) {
							xhr.setRequestHeader(name, value);
						});
						
						
						formData = new o.FormData();

						// Add multipart params
						plupload.each(plupload.extend(args, up.settings.multipart_params), function(value, name) {
							formData.append(name, value);
						});

						// Add file and send it
						formData.append(up.settings.file_data_name, chunkBlob);								
						xhr.send(formData, {
							runtime_order: up.settings.runtimes,
							required_caps: required_caps,
							swf_url: up.settings.flash_swf_url,
							xap_url: up.settings.silverlight_xap_url 
						});
					} else {
						// if no multipart, send as binary stream
						url = plupload.buildUrl(up.settings.url, plupload.extend(args, up.settings.multipart_params));
						
						xhr.open("post", url, true);
						
						xhr.setRequestHeader('Content-Type', 'application/octet-stream'); // Binary stream header
							
						// Set custom headers
						plupload.each(up.settings.headers, function(value, name) {
							xhr.setRequestHeader(name, value);
						});

						xhr.send(chunkBlob, {
							runtime_order: up.settings.runtimes,
							required_caps: required_caps,
							swf_url: up.settings.flash_swf_url,
							xap_url: up.settings.silverlight_xap_url 
						}); 
					}				
				}

				blob = file.getSource();

				// Start uploading chunks
				if (!o.isEmptyObj(up.settings.resize) && runtimeCan(blob, 'send_binary_string') && !!~o.inArray(blob.type, ['image/jpeg', 'image/png'])) {
					// Resize if required
					resizeImage.call(this, blob, up.settings.resize, function(resizedBlob) {
						blob = resizedBlob;
						file.size = resizedBlob.size;
						uploadNextChunk();
					});
				} else {
					uploadNextChunk();
				}				
			});

			self.bind('UploadProgress', function(up, file) {
				calcFile(file);
			});

			self.bind('StateChanged', function(up) {
				if (up.state == plupload.STARTED) {
					// Get start time to calculate bps
					startTime = (+new Date());
					
				} else if (up.state == plupload.STOPPED) {						
					// Reset currently uploading files
					for (i = up.files.length - 1; i >= 0; i--) {
						if (up.files[i].status == plupload.UPLOADING) {
							up.files[i].status = plupload.QUEUED;
							calc();
						}
					}
				}
			});

			self.bind('QueueChanged', calc);

			self.bind("Error", function(up, err) {
				// Set failed status if an error occured on a file
				if (err.file) {
					err.file.status = plupload.FAILED;
					calc();

					// Upload next file but detach it from the error event
					// since other custom listeners might want to stop the queue
					if (up.state == plupload.STARTED) {
						delay(function() {
							uploadNext.call(self);
						}, 1);
					}
				}
			});

			self.bind("FileUploaded", function(up, file) {
				file.status = plupload.DONE;
				file.loaded = file.size;

				calcFile(file);

				// Upload next file but detach it from the error event
				// since other custom listeners might want to stop the queue
				delay(function() {
					uploadNext.call(self);
				}, 1);
			});

			// some dependent scripts hook onto Init to alter configuration options, raw UI, etc (like Queue Widget),
			// therefore we got to fire this one, before we dive into the actual initializaion
			self.trigger('Init', { 
				runtime: "Generic" // we need to pass something for backward compatibility
			}); 
			
			initControls.call(this);
		},

		/**
		 * Refreshes the upload instance by dispatching out a refresh event to all runtimes.
		 * This would for example reposition flash/silverlight shims on the page.
		 *
		 * @method refresh
		 */
		refresh : function() {
			fileInput.trigger("Refresh");
			this.trigger("Refresh");
		},

		/**
		 * Starts uploading the queued files.
		 *
		 * @method start
		 */
		start : function() {
			if (this.state != plupload.STARTED) {
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
				this.trigger("CancelUpload");				
				this.trigger("StateChanged");
			}
		},
		
		/** 
		 * Disables/enables browse button on request.
		 *
		 * @method disableBrowse
		 * @param {Boolean} disable Whether to disable or enable (default: true)
		 */
		disableBrowse : function() {
			disabled = arguments[0] !== undef ? arguments[0] : true;

			if (fileInput) {
				fileInput.disable(disabled);
			}

			this.trigger("DisableBrowse", disabled);
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
					return this.splice(i, 1)[0];
				}
			}
		},

		/**
		 * Removes part of the queue and returns the files removed. This will also trigger the FilesRemoved and QueueChanged events.
		 *
		 * @method splice
		 * @param {Number} start (Optional) Start index to remove from.
		 * @param {Number} length (Optional) Lengh of items to remove.
		 * @return {Array} Array of files that was removed.
		 */
		splice : function(start, length) {
			var removed;

			// Splice and trigger events
			removed = files.splice(start === undef ? 0 : start, length === undef ? files.length : length);

			this.trigger("FilesRemoved", removed);
			this.trigger("QueueChanged");

			return removed;
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
			var list = events[name.toLowerCase()], i, args;

			// console.log(name, arguments);

			if (list) {
				// Replace name with sender in args
				args = Array.prototype.slice.call(arguments);
				args[0] = this;

				// Dispatch event to all listeners
				for (i = 0; i < list.length; i++) {
					// Fire event, break chain if false is returned
					if (list[i].func.apply(list[i].scope, args) === false) {
						return false;
					}
				}
			}

			return true;
		},
		
		/**
		 * Check whether uploader has any listeners to the specified event.
		 *
		 * @method hasEventListener
		 * @param {String} name Event name to check for.
		 */
		hasEventListener : function(name) {
			return !!events[name.toLowerCase()];
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
		unbind : function(name) {
			name = name.toLowerCase();

			var list = events[name], i, func = arguments[1];

			if (list) {
				if (func !== undef) {
					for (i = list.length - 1; i >= 0; i--) {
						if (list[i].func === func) {
							list.splice(i, 1);
								break;
						}
					}
				} else {
					list = [];
				}

				// delete event list if it has become empty
				if (!list.length) {
					delete events[name];
				}
			}
		},

		/**
		 * Removes all event listeners.
		 *
		 * @method unbindAll
		 */
		unbindAll : function() {
			var self = this;
			
			plupload.each(events, function(list, name) {
				self.unbind(name);
			});
		},
		
		/**
		 * Destroys Plupload instance and cleans after itself.
		 *
		 * @method destroy
		 */
		destroy : function() {	
			this.stop();						
			this.trigger('Destroy');
			
			// Clean-up after uploader itself
			this.unbindAll();
		}
	});
};

/**
 * Constructs a new file instance.
 *
 * @class File
 * @constructor
 * 
 * @param {Object} file Object containing file properties
 * @param {String} file.name Name of the file.
 * @param {Number} file.size File size.
 */
plupload.File = (function() {
	var filepool = {};
	
	function PluploadFile(file) { 
			
		plupload.extend(this, {
			
			/**
			 * File id this is a globally unique id for the specific file.
			 *
			 * @property id
			 * @type String
			 */
			id: plupload.guid(),
			
			/**
			 * File name for example "myfile.gif".
			 *
			 * @property name
			 * @type String
			 */
			name: file.name || file.fileName,

			/**
			 * File type, `e.g image/jpeg`
			 *
			 * @property type
			 * @type String
			 */
			type: file.type || '',
			
			/**
			 * File size in bytes (may change after client-side manupilation).
			 *
			 * @property size
			 * @type Number
			 */
			size: file.size || file.fileSize,

			/**
			 * Original file size in bytes.
			 *
			 * @property origSize
			 * @type Number
			 */
			origSize: file.size || file.fileSize,
			
			/**
			 * Number of bytes uploaded of the files total size.
			 *
			 * @property loaded
			 * @type Number
			 */
			loaded: 0,
			
			/**
			 * Number of percentage uploaded of the file.
			 *
			 * @property percent
			 * @type Number
			 */
			percent: 0,
			
			/**
			 * Status constant matching the plupload states QUEUED, UPLOADING, FAILED, DONE.
			 *
			 * @property status
			 * @type Number
			 * @see plupload
			 */
			status: 0,
			
			getSource: function() {
				if (!filepool[this.id]) {
					return null;	
				}
				
				return filepool[this.id];
			}
		});
		
		filepool[this.id] = file;
	}
	
	return PluploadFile;
}());
		

/**
 * Constructs a queue progress.
 *
 * @class QueueProgress
 * @constructor
 */
 plupload.QueueProgress = function() {
	var self = this; // Setup alias for self to reduce code size when it's compressed

	/**
	 * Total queue file size.
	 *
	 * @property size
	 * @type Number
	 */
	self.size = 0;

	/**
	 * Total bytes uploaded.
	 *
	 * @property loaded
	 * @type Number
	 */
	self.loaded = 0;

	/**
	 * Number of files uploaded.
	 *
	 * @property uploaded
	 * @type Number
	 */
	self.uploaded = 0;

	/**
	 * Number of files failed to upload.
	 *
	 * @property failed
	 * @type Number
	 */
	self.failed = 0;

	/**
	 * Number of files yet to be uploaded.
	 *
	 * @property queued
	 * @type Number
	 */
	self.queued = 0;

	/**
	 * Total percent of the uploaded bytes.
	 *
	 * @property percent
	 * @type Number
	 */
	self.percent = 0;

	/**
	 * Bytes uploaded per second.
	 *
	 * @property bytesPerSec
	 * @type Number
	 */
	self.bytesPerSec = 0;

	/**
	 * Resets the progress to it's initial values.
	 *
	 * @method reset
	 */
	self.reset = function() {
		self.size = self.loaded = self.uploaded = self.failed = self.queued = self.percent = self.bytesPerSec = 0;
	};
};

	
window.plupload = plupload;	
	
}(window, mOxie));
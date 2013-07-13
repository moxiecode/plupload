/**
 * Plupload - multi-runtime File Uploader
 * v2.0a
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 *
 * Date: 2012-11-30
 */
/**
 * Plupload.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global mOxie:true */

;(function(window, o, undef) {

var delay = window.setTimeout;

// convert plupload features to caps acceptable by mOxie
function normalizeCaps(settings) {		
	var features = settings.required_features, caps = {};

	function resolve(feature, value, strict) {
		// Feature notation is deprecated, use caps (this thing here is required for backward compatibility)
		var map = { 
			chunks: 'slice_blob',
			resize: 'send_binary_string',
			jpgresize: 'send_binary_string',
			pngresize: 'send_binary_string',
			progress: 'report_upload_progress',
			multi_selection: 'select_multiple',
			max_file_size: 'access_binary',
			dragdrop: 'drag_and_drop',
			drop_element: 'drag_and_drop',
			headers: 'send_custom_headers',
			canSendBinary: 'send_binary',
			triggerDialog: 'summon_file_dialog'
		};

		if (map[feature]) {
			caps[map[feature]] = value;
		} else if (!strict) {
			caps[feature] = value;
		}
	}

	if (typeof(features) === 'string') {
		plupload.each(features.split(/\s*,\s*/), function(feature) {
			resolve(feature, true);
		});
	} else if (typeof(features) === 'object') {
		plupload.each(features, function(value, feature) {
			resolve(feature, value);
		});
	} else if (features === true) {
		// check settings for required features
		if (!settings.multipart) { // special care for multipart: false
			caps.send_binary_string = true;
		}

		if (settings.chunk_size > 0) {
			caps.slice_blob = true;
		}
		
		plupload.each(settings, function(value, feature) {
			resolve(feature, !!value, true); // strict check
		});
	}
	
	return caps;
}

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
	VERSION : '2.0a',

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
	
	/**
	 * File upload was SKIPPED, added for missing EXIF
	 *
	 * @property SKIPPED
	 * @static
	 * @final
	 */
	SKIPPED: 6,

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
	 * Duplicate file error. If prevent_duplicates is set to true and user selects the same file again.
	 *
	 * @property FILE_DUPLICATE_ERROR
	 * @static
	 * @final
	 */
	FILE_DUPLICATE_ERROR : -602,

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
	 * JPEG Image files may require a valid Exif tag. If missing, will throw this error.
	 *
	 * @property IMAGE_EXIF_MISSING_ERROR
	 * @static
	 * @final
	 */
	IMAGE_EXIF_MISSING_ERROR : -703,

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
	 * @method typeOf
	 * @static
	 * @param {Object} o Object to check.
	 * @return {String} Object [[Class]]
	 */
	typeOf: o.typeOf,

	/**
	 * Extends the specified object with another object.
	 *
	 * @method extend
	 * @static
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
	 * @static
	 * @return {String} Virtually unique id.
	 */
	guid : o.guid,

	/**
	 * Executes the callback function for each item in array/object. If you return false in the
	 * callback it will break the loop.
	 *
	 * @method each
	 * @static
	 * @param {Object} obj Object to iterate.
	 * @param {function} callback Callback function to execute for each item.
	 */
	each : o.each,

	/**
	 * Returns the absolute x, y position of an Element. The position will be returned in a object with x, y fields.
	 *
	 * @method getPos
	 * @static
	 * @param {Element} node HTML element or element id to get x, y position from.
	 * @param {Element} root Optional root element to stop calculations at.
	 * @return {object} Absolute position of the specified element object with x, y fields.
	 */
	getPos : o.getPos,

	/**
	 * Returns the size of the specified node in pixels.
	 *
	 * @method getSize
	 * @static
	 * @param {Node} node Node to get the size of.
	 * @return {Object} Object with a w and h property.
	 */
	getSize : o.getSize,

	/**
	 * Encodes the specified string.
	 *
	 * @method xmlEncode
	 * @static
	 * @param {String} s String to encode.
	 * @return {String} Encoded string.
	 */
	xmlEncode : function(str) {
		var xmlEncodeChars = {'<' : 'lt', '>' : 'gt', '&' : 'amp', '"' : 'quot', '\'' : '#39'}, xmlEncodeRegExp = /[<>&\"\']/g;

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
	toArray : o.toArray,

	/**
	 * Find an element in array and return it's index if present, otherwise return -1.
	 *
	 * @method inArray
	 * @static
	 * @param {mixed} needle Element to find
	 * @param {Array} array
	 * @return {Int} Index of the element, or -1 if not found
	 */
	inArray : o.inArray,

	/**
	 * Extends the language pack object with new items.
	 *
	 * @method addI18n
	 * @static
	 * @param {Object} pack Language pack items to add.
	 * @return {Object} Extended language pack object.
	 */
	addI18n : o.addI18n,

	/**
	 * Translates the specified string by checking for the english string in the language pack lookup.
	 *
	 * @method translate
	 * @static
	 * @param {String} str String to look for.
	 * @return {String} Translated string or the input string if it wasn't found.
	 */
	translate : o.translate,

	/**
	 * Checks if object is empty.
	 *
	 * @method isEmptyObj
	 * @static
	 * @param {Object} obj Object to check.
	 * @return {Boolean}
	 */
	isEmptyObj : o.isEmptyObj,

	/**
	 * Checks if specified DOM element has specified class.
	 *
	 * @method hasClass
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	hasClass : o.hasClass,

	/**
	 * Adds specified className to specified DOM element.
	 *
	 * @method addClass
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	addClass : o.addClass,

	/**
	 * Removes specified className from specified DOM element.
	 *
	 * @method removeClass
	 * @static
	 * @param {Object} obj DOM element like object to add handler to.
	 * @param {String} name Class name
	 */
	removeClass : o.removeClass,

	/**
	 * Returns a given computed style of a DOM element.
	 *
	 * @method getStyle
	 * @static
	 * @param {Object} obj DOM element like object.
	 * @param {String} name Style you want to get from the DOM element
	 */
	getStyle : o.getStyle,

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
	addEvent : o.addEvent,

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
	removeEvent: o.removeEvent,

	/**
	 * Remove all kind of events from the specified object
	 *
	 * @method removeAllEvents
	 * @static
	 * @param {Object} obj DOM element to remove event listeners from.
	 * @param {String} (optional) unique key to match, when removing events.
	 */
	removeAllEvents: o.removeAllEvents,

	/**
	 * Cleans the specified name from national characters (diacritics). The result will be a name with only a-z, 0-9 and _.
	 *
	 * @method cleanName
	 * @static
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
	 * @method buildUrl
	 * @static
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
	 * @static
	 * @param {Number} size Size to format as string.
	 * @return {String} Formatted size string.
	 */
	formatSize : function(size) {
		if (size === undef || /\D/.test(size)) {
			return plupload.translate('N/A');
		}

		// TB
		if (size > 1099511627776) {
			return Math.round(size / 1099511627776, 1) + " " + plupload.translate('tb');
		}

		// GB
		if (size > 1073741824) {
			return Math.round(size / 1073741824, 1) + " " + plupload.translate('gb');
		}

		// MB
		if (size > 1048576) {
			return Math.round(size / 1048576, 1) + " " + plupload.translate('mb');
		}

		// KB
		if (size > 1024) {
			return Math.round(size / 1024, 1) + " " + plupload.translate('kb');
		}

		return size + " " + plupload.translate('b');
	},


	/**
	 * Parses the specified size string into a byte value. For example 10kb becomes 10240.
	 *
	 * @method parseSize
	 * @static
	 * @param {String|Number} size String to parse or number to just pass through.
	 * @return {Number} Size in bytes.
	 */
	parseSize : o.parseSizeStr,


	/**
	 * A way to predict what runtime will be choosen in the current environment with the
	 * specified settings.
	 *
	 * @method predictRuntime
	 * @static
	 * @param {Object|String} config Plupload settings to check
	 * @param {String} [runtimes] Comma-separated list of runtimes to check against
	 * @return {String} Type of compatible runtime
	 */
	predictRuntime : function(config, runtimes) {
		var up, runtime; 
		if (runtimes) {
			config.runtimes = runtimes;
		}
		up = new plupload.Uploader(config);
		runtime = up.runtime;
		up.destroy();
		return runtime;
	}
};


/**
@class Uploader
@constructor

@param {Object} settings For detailed information about each option check documentation.
	@param {String|DOMElement} settings.browse_button id of the DOM element or DOM element itself to use as file dialog trigger.
	@param {String} settings.url URL of the server-side upload handler.
	@param {Number|String} [settings.chunk_size=0] Chunk size in bytes to slice the file into. Shorcuts with b, kb, mb, gb, tb suffixes also supported. `e.g. 204800 or "204800b" or "200kb"`. By default - disabled.
	@param {String} [settings.container] id of the DOM element to use as a container for uploader structures. Defaults to document.body.
	@param {String|DOMElement} [settings.drop_element] id of the DOM element or DOM element itself to use as a drop zone for Drag-n-Drop.
	@param {String} [settings.file_data_name="file"] Name for the file field in Multipart formated message.
	@param {Array} [settings.filters=[]] Set of file type filters, each one defined by hash of title and extensions. `e.g. {title : "Image files", extensions : "jpg,jpeg,gif,png"}`. Dispatches `plupload.FILE_EXTENSION_ERROR`
	@param {String} [settings.flash_swf_url] URL of the Flash swf.
	@param {Object} [settings.headers] Custom headers to send with the upload. Hash of name/value pairs.
	@param {Number|String} [settings.max_file_size] Maximum file size that the user can pick, in bytes. Optionally supports b, kb, mb, gb, tb suffixes. `e.g. "10mb" or "1gb"`. By default - not set. Dispatches `plupload.FILE_SIZE_ERROR`.
	@param {Number} [settings.max_retries=0] How many times to retry the chunk or file, before triggering Error event.
	@param {Boolean} [settings.multipart=true] Whether to send file and additional parameters as Multipart formated message.
	@param {Object} [settings.multipart_params] Hash of key/value pairs to send with every file upload.
	@param {Boolean} [settings.multi_selection=true] Enable ability to select multiple files at once in file dialog.
	@param {Boolean} [settings.prevent_duplicates=false] Do not let duplicates into the queue. Dispatches `plupload.FILE_DUPLICATE_ERROR`.
	@param {String|Object} [settings.required_features] Either comma-separated list or hash of required features that chosen runtime should absolutely possess.
	@param {Object} [settings.resize] Enable resizng of images on client-side. Applies to `image/jpeg` and `image/png` only. `e.g. {width : 200, height : 200, quality : 90, crop: true}`
		@param {Number} [settings.resize.width] If image is bigger, it will be resized.
		@param {Number} [settings.resize.height] If image is bigger, it will be resized.
		@param {Number} [settings.resize.quality=90] Compression quality for jpegs (1-100).
		@param {Boolean} [settings.resize.crop=false] Whether to crop images to exact dimensions. By default they will be resized proportionally.
	@param {String} [settings.runtimes="html5,flash,silverlight,html4"] Comma separated list of runtimes, that Plupload will try in turn, moving to the next if previous fails.
	@param {String} [settings.silverlight_xap_url] URL of the Silverlight xap.
	@param {Boolean} [settings.unique_names=false] If true will generate unique filenames for uploaded files.
	@param {Number} [settings.files_added_chunksize=false] Limit the number of files added the UI adds in each iteration

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
	var files = [], events = {}, required_caps = {},
		startTime, total, disabled = false,
		fileInput, fileDrop, xhr;


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

			// All files are DONE, FAILED, or SKIPPED
			if (count == files.length) {
				if (this.state !== plupload.STOPPED) {
					this.state = plupload.STOPPED;
					this.trigger("StateChanged");
				}
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
			} else if (file.status == plupload.FAILED || file.status == plupload.SKIPPED) {
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

	function initControls() {
		var self = this, initialized = 0;

		// common settings
		var options = {
			accept: settings.filters,
			runtime_order: settings.runtimes,
			required_caps: required_caps,
			swf_url: settings.flash_swf_url,
			xap_url: settings.silverlight_xap_url
		};

		// add runtime specific options if any
		plupload.each(settings.runtimes.split(/\s*,\s*/), function(runtime) {
			if (settings[runtime]) {
				options[runtime] = settings[runtime];
			}
		});
		
		// add chunksize to options so html5 FileDrop can access
		options.files_added_chunksize = settings.files_added_chunksize || false;

		o.inSeries([
			function(cb) {
				// Initialize file dialog trigger
				if (settings.browse_button) {
					fileInput = new o.FileInput(plupload.extend({}, options, {
						name: settings.file_data_name,
						multiple: settings.multi_selection,
						container: settings.container,
						browse_button: settings.browse_button
					}));

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

					fileInput.onchange = function() {
						self.addFile(this.files);
					};

					fileInput.bind('mouseenter mouseleave mousedown mouseup', function(e) {
						if (!disabled) {
							var bButton = o.get(settings.browse_button);
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

					fileInput.bind('error runtimeerror', function() {
						fileInput = null;
						cb();
					});

					fileInput.init();
				} else {
					cb();
				}
			},

			function(cb) {
				// Initialize drag/drop interface if requested
				if (settings.drop_element) {
					fileDrop = new o.FileDrop(plupload.extend({}, options, {
						drop_zone: settings.drop_element
					}));

					fileDrop.onready = function() {
						var info = o.Runtime.getInfo(this.ruid);

						self.features.dragdrop = info.can('drag_and_drop');

						initialized++;
						cb();
					};

					fileDrop.ondrop = function() {
						self.addFile(this.files);
					};

					fileDrop.bind('error runtimeerror', function() {
						fileDrop = null;
						cb();
					});

					fileDrop.init();
				} else {
					cb();
				}
			}
		],
		function() {
			if (typeof(settings.init) == "function") {
				settings.init(self);
			} else {
				plupload.each(settings.init, function(func, name) {
					self.bind(name, func);
				});
			}

			if (initialized) {
				self.trigger('PostInit');
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
		var img = new o.Image(),
			hasExif = null;

		try {
			img.onload = function() {
				if (this.height > params.height || this.width > params.width) {
					// but check size before actually calling downsize()
					img.downsize(params.width, params.height, params.crop, params.preserve_headers);
				} else {
					img.onresize();
				}
			};

			img.onresize = function() {
				if (this.type == "image/jpeg") hasExif = !!this.meta.exif; 
				// should we pass Boolean or the exif object?
				cb(this.getAsBlob(blob.type, params.quality), hasExif);
				this.destroy();
			};

			img.onerror = function() {
				cb(blob);
			};

			img.load(blob);
		} catch(ex) {
			cb(blob);
		}
	}


	// Inital total state
	total = new plupload.QueueProgress();

	// Default settings
	settings = plupload.extend({
		runtimes: o.Runtime.order,
		max_retries: 0,
		multipart : true,
		multi_selection : true,
		file_data_name : 'file',
		flash_swf_url : 'js/Moxie.swf',
		silverlight_xap_url : 'js/Moxie.xap',
		filters : [],
		prevent_duplicates: false,
		send_chunk_number: true // whether to send chunks and chunk numbers, or total and offset bytes
	}, settings);

	// Resize defaults
	if (settings.resize) {
		settings.resize = plupload.extend({
			preserve_headers: true,
			crop: false
		}, settings.resize);
	}

	// Convert settings
	settings.chunk_size = plupload.parseSize(settings.chunk_size) || 0;
	settings.max_file_size = plupload.parseSize(settings.max_file_size) || 0;
	
	settings.required_features = required_caps = normalizeCaps(plupload.extend({}, settings));


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
		 * Current runtime name.
		 *
		 * @property runtime
		 * @type String
		 */
		runtime : o.Runtime.thatCan(required_caps, settings.runtimes), // predict runtime

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

			settings.browse_button = o.get(settings.browse_button);
			
			// Check if drop zone requested
			settings.drop_element = o.get(settings.drop_element);


			if (typeof(settings.preinit) == "function") {
				settings.preinit(self);
			} else {
				plupload.each(settings.preinit, function(func, name) {
					self.bind(name, func);
				});
			}


			// Check for required options
			if (!settings.browse_button || !settings.url) {
				this.trigger('Error', {
					code : plupload.INIT_ERROR,
					message : plupload.translate('Init error.')
				});
				return;
			}

			// Add files to queue
			self.bind('FilesAdded', function(up, selected_files) {
console.log("plupload.js: FilesAdded, count="+selected_files.length);				
				var i, ii, file, count = 0, extensionsRegExp, filters = settings.filters;

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

					extensionsRegExp = new RegExp('(' + extensionsRegExp.join('|') + ')$', 'i');
				}

				next_file:
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
					if (file.size !== undef && settings.max_file_size && file.size > settings.max_file_size) {
						up.trigger('Error', {
							code : plupload.FILE_SIZE_ERROR,
							message : plupload.translate('File size error.'),
							file : file
						});
						continue;
					}

					// Bypass duplicates
					if (settings.prevent_duplicates) {
						ii = up.files.length;
						while (ii--) {
							// Compare by name and size (size might be 0 or undefined, but still equivalent for both)
							if (file.name === up.files[ii].name && file.size === up.files[ii].size) {
								up.trigger('Error', {
									code : plupload.FILE_DUPLICATE_ERROR,
									message : plupload.translate('Duplicate file error.'),
									file : file
								});
								continue next_file;
							}
						}
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
				self.bind("BeforeUpload", function(up, file) {
					var matches = file.name.match(/\.([^.]+)$/), ext = "part";
					if (matches) {
						ext = matches[1];
					}
					file.target_name = file.id + '.' + ext;
				});
			}

			self.bind("UploadFile", function(up, file) {
				var url = up.settings.url, features = up.features, chunkSize = settings.chunk_size,
					retries = settings.max_retries,
					blob, offset = 0;

				// make sure we start at a predictable offset
				if (file.loaded) {
					offset = file.loaded = chunkSize * Math.floor(file.loaded / chunkSize);
				}

				function handleError() {
					if (retries-- > 0) {
						delay(uploadNextChunk, 1);
					} else {
						file.loaded = offset; // reset all progress

						up.trigger('Error', {
							code : plupload.HTTP_ERROR,
							message : plupload.translate('HTTP Error.'),
							file : file,
							response : xhr.responseText,
							status : xhr.status,
							responseHeaders: xhr.getAllResponseHeaders()
						});
					}
				}

				function uploadNextChunk() {
					
					if (file.hasExif === false) {
						// file.hasExif set from settings.views.thumb=1 preload (lazy) or resizeImage() 
						// sets plupload.Uploader error in notify section 
						// self == plupload.Uploader
						file.status = plupload.SKIPPED;	
						self.trigger('Error', {
							code : plupload.IMAGE_EXIF_MISSING_ERROR,
							message : plupload.translate('The Uploader skipped JPG files with missing Exif tags.'),
							file : file
						});		
					}					
						
					
					var chunkBlob, formData, args, curChunkSize;

					// File upload finished
					if (file.status == plupload.DONE || file.status == plupload.FAILED || file.status == plupload.SKIPPED || up.state == plupload.STOPPED) {	
						return;
					}

					// Standard arguments
					args = {name : file.target_name || file.name};

					// Only add chunking args if needed
					if (chunkSize && features.chunks && blob.size > chunkSize) { // blob will be of type string if it was loaded in memory 
						curChunkSize = Math.min(chunkSize, blob.size - offset);

						chunkBlob = blob.slice(offset, offset + curChunkSize);

						// Setup query string arguments
						if (settings.send_chunk_number) {
							args.chunk = Math.ceil(offset / chunkSize);
							args.chunks = Math.ceil(blob.size / chunkSize);
						} else { // keep support for experimental chunk format, just in case
							args.offset = offset;
							args.total = blob.size;
						}
					} else {
						curChunkSize = blob.size;
						chunkBlob = blob;
					}

					xhr = new o.XMLHttpRequest();

					// Do we have upload progress support
					if (xhr.upload) {
						xhr.upload.onprogress = function(e) {
							file.loaded = Math.min(file.size, offset + e.loaded);
							up.trigger('UploadProgress', file);
						};
					}

					xhr.onload = function() {
						// check if upload made itself through
						if (xhr.status >= 400) {
							handleError();
							return;
						}

						// Handle chunk response
						if (curChunkSize < blob.size) {
							chunkBlob.destroy();

							offset += curChunkSize;
							file.loaded = Math.min(offset, blob.size);

							up.trigger('ChunkUploaded', file, {
								offset : file.loaded,
								total : blob.size,
								response : xhr.responseText,
								status : xhr.status,
								responseHeaders: xhr.getAllResponseHeaders()
							});
						} else {
							file.loaded = file.size;
						}

						chunkBlob = formData = null; // Free memory

						// Check if file is uploaded
						if (!offset || offset >= blob.size) {
							// If file was modified, destory the copy
							if (file.size != file.origSize) {
								blob.destroy();
								blob = null;
							}

							up.trigger('UploadProgress', file);

							file.status = plupload.DONE;

							up.trigger('FileUploaded', file, {
								response : xhr.responseText,
								status : xhr.status,
								responseHeaders: xhr.getAllResponseHeaders()
							});
						} else {
							// Still chunks left
							delay(uploadNextChunk, 1); // run detached, otherwise event handlers interfere
						}
					};

					xhr.onerror = function() {
						handleError();
					};

					xhr.onloadend = function() {
						this.destroy();
						xhr = null;
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
				
				if (o.isEmptyObj(up.settings.resize)) {
					// force resize to preload img and check hasExif, 
					// but don't call downsize() unless we are *really* resizing
					up.settings.resize = {width:99999, height:99999, preserve_headers: true};
				}

				// Start uploading chunks
				if (!o.isEmptyObj(up.settings.resize) && runtimeCan(blob, 'send_binary_string') && !!~o.inArray(blob.type, ['image/jpeg', 'image/png'])) {
					// Resize if required
					resizeImage.call(this, blob, up.settings.resize, function(resizedBlob, hasExif) {
						blob = resizedBlob;
						file.size = resizedBlob.size;
						file.hasExif = hasExif; 
						uploadNextChunk();
					});
				} else {
					uploadNextChunk();	// this branch will be skipped, because we are forcing a resizeImage()
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
					for (var i = up.files.length - 1; i >= 0; i--) {
						if (up.files[i].status == plupload.UPLOADING) {
							up.files[i].status = plupload.QUEUED;
							calc();
						}
					}
				}
			});

			self.bind('QueueChanged', calc);

			self.bind("Error", function(up, err) {
				// Set failed status if an error occured on a file or file upload was skipped
				if (err.file) {
					if (err.file.status == plupload.SKIPPED) {
						/*
						 * handle plupload.SKIPPED Here
						 */
						
					} else 
						err.file.status = plupload.FAILED;

					calcFile(err.file);

					// Upload next file but detach it from the error event
					// since other custom listeners might want to stop the queue
					if (up.state == plupload.STARTED) {
						delay(function() {
							uploadNext.call(self);
						}, 1);
					}
				}
			});

			self.bind("FileUploaded", function() {
				calc();

				// Upload next file but detach it from the error event
				// since other custom listeners might want to stop the queue
				delay(function() {
					uploadNext.call(self);
				}, 1);
			});

			// some dependent scripts hook onto Init to alter configuration options, raw UI, etc (like Queue Widget),
			// therefore we got to fire this one, before we dive into the actual initializaion
			self.trigger('Init', { runtime: this.runtime });

			initControls.call(this);
		},

		/**
		 * Refreshes the upload instance by dispatching out a refresh event to all runtimes.
		 * This would for example reposition flash/silverlight shims on the page.
		 *
		 * @method refresh
		 */
		refresh : function() {
			if (fileInput) {
				fileInput.trigger("Refresh");
			}
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
				this.trigger("StateChanged");
				this.trigger("CancelUpload");
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
		 * Adds file to the queue programmatically. Can be native file, instance of Plupload.File,
		 * instance of mOxie.File, input[type="file"] element, or array of these. Fires FilesAdded, 
		 * if any files were added to the queue. Otherwise nothing happens.
		 *
		 * @method addFile
		 * @param {plupload.File|mOxie.File|File|Node|Array} file File or files to add to the queue.
		 * @param {String} [fileName] If specified, will be used as a name for the file
		 */
		addFile : function(file, fileName) {
			var files = []
			, ruid
			;

			function getRUID() {
				var ctrl = fileDrop || fileInput;
				if (ctrl) {
					return ctrl.getRuntime().uid;
				}
				return false;
			}

			function resolveFile(file) {
				var type = o.typeOf(file);

				if (file instanceof o.File) { 
					if (!file.ruid) {
						if (!ruid) { // weird case
							return false;
						}
						file.ruid = ruid;
						file.connectRuntime(ruid);
					}
					resolveFile(new plupload.File(file));
				} else if (file instanceof o.Blob) {
					resolveFile(file.getSource());
					file.destroy();
				} else if (file instanceof plupload.File) { // final step for other branches
					if (fileName) {
						file.name = fileName;
					}
					files.push(file);
				} else if (o.inArray(type, ['file', 'blob']) !== -1) {
					resolveFile(new o.File(null, file));
				} else if (type === 'node' && o.typeOf(file.files) === 'filelist') {
					// if we are dealing with input[type="file"]
					o.each(file.files, resolveFile);
				} else if (type === 'array') {
					// mixed array
					fileName = null; // should never happen, but unset anyway to avoid funny situations
					o.each(file, resolveFile);
				}
			}

			ruid = getRUID();

			resolveFile(file);
			// Trigger FilesAdded event if we added any
			if (files.length) {
				this.trigger("FilesAdded", files);
			}
		},

		/**
		 * Removes a specific file.
		 *
		 * @method removeFile
		 * @param {plupload.File|String} file File to remove from queue.
		 */
		removeFile : function(file) {
			var id = typeof(file) === 'string' ? file : file.id;

			for (var i = files.length - 1; i >= 0; i--) {
				if (files[i].id === id) {
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
			// Splice and trigger events
			var removed = files.splice(start === undef ? 0 : start, length === undef ? files.length : length);

			this.trigger("FilesRemoved", removed);
			this.trigger("QueueChanged");

			// Dispose any resources allocated by those files
			plupload.each(removed, function(file) {
				file.destroy();
			});

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

			// Purge the queue
			plupload.each(files, function(file) {
				file.destroy();
			});
			files = [];

			if (fileInput) {
				fileInput.destroy();
				fileInput = null;
			}

			if (fileDrop) {
				fileDrop.destroy();
				fileDrop = null;
			}

			required_caps = {};
			startTime = total = disabled = xhr = null;

			this.trigger('Destroy');

			// Clean-up after uploader itself
			this.unbindAll();
			events = {};
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
			 * Status constant matching the plupload states QUEUED, UPLOADING, FAILED, SKIPPED, DONE.
			 *
			 * @property status
			 * @type Number
			 * @see plupload
			 */
			status: 0,

			/**
			 * Returns native window.File object, when it's available.
			 *
			 * @method getNative
			 * @return {window.File} or null, if plupload.File is of different origin
			 */
			getNative: function() {
				var file = this.getSource().getSource();
				return o.inArray(o.typeOf(file), ['blob', 'file']) !== -1 ? file : null;
			},

			/**
			 * Returns mOxie.File - unified wrapper object that can be used across runtimes.
			 *
			 * @method getSource
			 * @return {mOxie.File} or null
			 */
			getSource: function() {
				if (!filepool[this.id]) {
					return null;
				}
				return filepool[this.id];
			},

			/**
			 * Destroys plupload.File object.
			 *
			 * @method destroy
			 */
			destroy: function() {
				var src = this.getSource();
				if (src) {
					src.destroy();
					delete filepool[this.id];
				}
			},
			
			/**
			 * RelativePath from Chrome 21+ accepts folders via Drag'n'Drop,
			 * same as this.getNative().relativePath
			 * 		for some reason, this.getNative().webkitRelativePath==''
			 *
			 * @property relativePath
			 * @type String
			 * @see moxie.js, _readEntry()
			 */
			relativePath: file.getSource().relativePath || null,
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

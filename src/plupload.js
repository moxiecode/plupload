/**
 * plupload.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
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
	'moxie/core/I18n',
	'moxie/core/utils/Env',
	'moxie/core/utils/Basic',
	'moxie/core/utils/Dom',
	'moxie/core/utils/Events',
	'moxie/core/utils/Url',
	'moxie/core/EventTarget',
	'moxie/runtime/Runtime',
	'moxie/file/FileInput',
	'moxie/file/FileReader'
], function(I18n, Env, Basic, Dom, Events, Url, EventTarget, Runtime, FileInput, FileReader) {


	// redifine event dispatcher for Flash/Silverlight runtimes
	Env.global_event_dispatcher = 'plupload.EventTarget.instance.dispatchEvent';


	return {
		/**
		 * Plupload version will be replaced on build.
		 *
		 * @property VERSION
		 * @static
		 * @final
		 */
		VERSION: '@@version@@',

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
			function round(num, precision) {
				return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
			}

			size = parseInt(size, 10);
			if (isNaN(size)) {
				return I18n.translate('N/A');
			}

			var boundary = Math.pow(1024, 4);

			// TB
			if (size > boundary) {
				return round(size / boundary, 1) + " " + I18n.translate('tb');
			}

			// GB
			if (size > (boundary /= 1024)) {
				return round(size / boundary, 1) + " " + I18n.translate('gb');
			}

			// MB
			if (size > (boundary /= 1024)) {
				return round(size / boundary, 1) + " " + I18n.translate('mb');
			}

			// KB
			if (size > 1024) {
				return Math.round(size / 1024) + " " + I18n.translate('kb');
			}

			return size + " " + I18n.translate('b');
		},

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

		/**
		Common set of methods and properties for every runtime instance

		@class plupload.Runtime
		@private

		@param {Object} options
		@param {String} type Sanitized name of the runtime
		@param {Object} [caps] Set of capabilities that differentiate specified runtime
		@param {Object} [modeCaps] Set of capabilities that do require specific operational mode
		@param {String} [preferredMode='browser'] Preferred operational mode to choose if no required capabilities were requested
		*/
		Runtime: Runtime,

		/**
		Provides a convenient way to create cross-browser file-picker. Generates file selection dialog on click,
		converts selected files to _File_ objects, to be used in conjunction with _Image_, preloaded in memory
		with _FileReader_ or uploaded to a server through _XMLHttpRequest_.

		@class plupload.FileInput
		@private
		@constructor
		@extends EventTarget
		@uses RuntimeClient
		@param {Object|String|DOMElement} options If options is string or node, argument is considered as _browse\_button_.
			@param {String|DOMElement} options.browse_button DOM Element to turn into file picker.
			@param {Array} [options.accept] Array of mime types to accept. By default accepts all.
			@param {String} [options.file='file'] Name of the file field (not the filename).
			@param {Boolean} [options.multiple=false] Enable selection of multiple files.
			@param {Boolean} [options.directory=false] Turn file input into the folder input (cannot be both at the same time).
			@param {String|DOMElement} [options.container] DOM Element to use as a container for file-picker. Defaults to parentNode
			for _browse\_button_.
			@param {Object|String} [options.required_caps] Set of required capabilities, that chosen runtime must support.
		*/
		FileInput: FileInput,

		/**
		Utility for preloading o.Blob/o.File objects in memory. By design closely follows [W3C FileReader](http://www.w3.org/TR/FileAPI/#dfn-filereader)
		interface. Where possible uses native FileReader, where - not falls back to shims.

		@class plupload.FileReader
		@private
		@constructor
		@extends EventTarget
		@uses RuntimeClient
		*/
		FileReader: FileReader
	};

});

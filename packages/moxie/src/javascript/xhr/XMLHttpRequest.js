/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/xhr/XMLHttpRequest", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/core/EventTarget",
	"moxie/core/utils/Encode",
	"moxie/core/utils/Url",
	"moxie/runtime/Runtime",
	"moxie/runtime/RuntimeTarget",
	"moxie/file/Blob",
	"moxie/file/FileReaderSync",
	"moxie/xhr/FormData",
	"moxie/core/utils/Env",
	"moxie/core/utils/Mime"
], function(Basic, x, EventTarget, Encode, Url, Runtime, RuntimeTarget, Blob, FileReaderSync, FormData, Env, Mime) {

	var httpCode = {
		100: 'Continue',
		101: 'Switching Protocols',
		102: 'Processing',

		200: 'OK',
		201: 'Created',
		202: 'Accepted',
		203: 'Non-Authoritative Information',
		204: 'No Content',
		205: 'Reset Content',
		206: 'Partial Content',
		207: 'Multi-Status',
		226: 'IM Used',

		300: 'Multiple Choices',
		301: 'Moved Permanently',
		302: 'Found',
		303: 'See Other',
		304: 'Not Modified',
		305: 'Use Proxy',
		306: 'Reserved',
		307: 'Temporary Redirect',

		400: 'Bad Request',
		401: 'Unauthorized',
		402: 'Payment Required',
		403: 'Forbidden',
		404: 'Not Found',
		405: 'Method Not Allowed',
		406: 'Not Acceptable',
		407: 'Proxy Authentication Required',
		408: 'Request Timeout',
		409: 'Conflict',
		410: 'Gone',
		411: 'Length Required',
		412: 'Precondition Failed',
		413: 'Request Entity Too Large',
		414: 'Request-URI Too Long',
		415: 'Unsupported Media Type',
		416: 'Requested Range Not Satisfiable',
		417: 'Expectation Failed',
		422: 'Unprocessable Entity',
		423: 'Locked',
		424: 'Failed Dependency',
		426: 'Upgrade Required',

		500: 'Internal Server Error',
		501: 'Not Implemented',
		502: 'Bad Gateway',
		503: 'Service Unavailable',
		504: 'Gateway Timeout',
		505: 'HTTP Version Not Supported',
		506: 'Variant Also Negotiates',
		507: 'Insufficient Storage',
		510: 'Not Extended'
	};

	function XMLHttpRequestUpload() {
		this.uid = Basic.guid('uid_');
	}

	XMLHttpRequestUpload.prototype = EventTarget.instance;

	/**
	Implementation of XMLHttpRequest

	@class moxie/xhr/XMLHttpRequest
	@constructor
	@uses RuntimeClient
	@extends EventTarget
	*/
	var dispatches = [
		'loadstart',

		'progress',

		'abort',

		'error',

		'load',

		'timeout',

		'loadend'

		// readystatechange (for historical reasons)
	];

	var NATIVE = 1, RUNTIME = 2;

	function XMLHttpRequest() {
		var self = this,
			// this (together with _p() @see below) is here to gracefully upgrade to setter/getter syntax where possible
			props = {
				/**
				The amount of milliseconds a request can take before being terminated. Initially zero. Zero means there is no timeout.

				@property timeout
				@type Number
				@default 0
				*/
				timeout: 0,

				/**
				Current state, can take following values:
				UNSENT (numeric value 0)
				The object has been constructed.

				OPENED (numeric value 1)
				The open() method has been successfully invoked. During this state request headers can be set using setRequestHeader() and the request can be made using the send() method.

				HEADERS_RECEIVED (numeric value 2)
				All redirects (if any) have been followed and all HTTP headers of the final response have been received. Several response members of the object are now available.

				LOADING (numeric value 3)
				The response entity body is being received.

				DONE (numeric value 4)

				@property readyState
				@type Number
				@default 0 (UNSENT)
				*/
				readyState: XMLHttpRequest.UNSENT,

				/**
				True when user credentials are to be included in a cross-origin request. False when they are to be excluded
				in a cross-origin request and when cookies are to be ignored in its response. Initially false.

				@property withCredentials
				@type Boolean
				@default false
				*/
				withCredentials: false,

				/**
				Returns the HTTP status code.

				@property status
				@type Number
				@default 0
				*/
				status: 0,

				/**
				Returns the HTTP status text.

				@property statusText
				@type String
				*/
				statusText: "",

				/**
				Returns the response type. Can be set to change the response type. Values are:
				the empty string (default), "arraybuffer", "blob", "document", "json", and "text".

				@property responseType
				@type String
				*/
				responseType: "",

				/**
				Returns the document response entity body.

				Throws an "InvalidStateError" exception if responseType is not the empty string or "document".

				@property responseXML
				@type Document
				*/
				responseXML: null,

				/**
				Returns the text response entity body.

				Throws an "InvalidStateError" exception if responseType is not the empty string or "text".

				@property responseText
				@type String
				*/
				responseText: null,

				/**
				Returns the response entity body (http://www.w3.org/TR/XMLHttpRequest/#response-entity-body).
				Can become: ArrayBuffer, Blob, Document, JSON, Text

				@property response
				@type Mixed
				*/
				response: null
			},

			_async = true,
			_url,
			_method,
			_headers = {},
			_user,
			_password,
			_encoding = null,
			_mimeType = null,

			// flags
			_sync_flag = false,
			_send_flag = false,
			_upload_events_flag = false,
			_upload_complete_flag = false,
			_error_flag = false,
			_same_origin_flag = false,

			// times
			_start_time,
			_timeoutset_time,

			_finalMime = null,
			_finalCharset = null,

			_options = {},
			_xhr,
			_responseHeaders = '',
			_responseHeadersBag
			;


		Basic.extend(this, props, {
			/**
			Unique id of the component

			@property uid
			@type String
			*/
			uid: Basic.guid('uid_'),

			/**
			Target for Upload events

			@property upload
			@type XMLHttpRequestUpload
			*/
			upload: new XMLHttpRequestUpload(),


			/**
			Sets the request method, request URL, synchronous flag, request username, and request password.

			Throws a "SyntaxError" exception if one of the following is true:

			method is not a valid HTTP method.
			url cannot be resolved.
			url contains the "user:password" format in the userinfo production.
			Throws a "SecurityError" exception if method is a case-insensitive match for CONNECT, TRACE or TRACK.

			Throws an "InvalidAccessError" exception if one of the following is true:

			Either user or password is passed as argument and the origin of url does not match the XMLHttpRequest origin.
			There is an associated XMLHttpRequest document and either the timeout attribute is not zero,
			the withCredentials attribute is true, or the responseType attribute is not the empty string.


			@method open
			@param {String} method HTTP method to use on request
			@param {String} url URL to request
			@param {Boolean} [async=true] If false request will be done in synchronous manner. Asynchronous by default.
			@param {String} [user] Username to use in HTTP authentication process on server-side
			@param {String} [password] Password to use in HTTP authentication process on server-side
			*/
			open: function(method, url, async, user, password) {
				var urlp;

				// first two arguments are required
				if (!method || !url) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 2 - check if any code point in method is higher than U+00FF or after deflating method it does not match the method
				if (/[\u0100-\uffff]/.test(method) || Encode.utf8_encode(method) !== method) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 3
				if (!!~Basic.inArray(method.toUpperCase(), ['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'TRACE', 'TRACK'])) {
					_method = method.toUpperCase();
				}


				// 4 - allowing these methods poses a security risk
				if (!!~Basic.inArray(_method, ['CONNECT', 'TRACE', 'TRACK'])) {
					throw new x.DOMException(x.DOMException.SECURITY_ERR);
				}

				// 5
				url = Encode.utf8_encode(url);

				// 6 - Resolve url relative to the XMLHttpRequest base URL. If the algorithm returns an error, throw a "SyntaxError".
				urlp = Url.parseUrl(url);

				_same_origin_flag = Url.hasSameOrigin(urlp);

				// 7 - manually build up absolute url
				_url = Url.resolveUrl(url);

				// 9-10, 12-13
				if ((user || password) && !_same_origin_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				_user = user || urlp.user;
				_password = password || urlp.pass;

				// 11
				_async = async || true;

				if (_async === false && (_p('timeout') || _p('withCredentials') || _p('responseType') !== "")) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// 14 - terminate abort()

				// 15 - terminate send()

				// 18
				_sync_flag = !_async;
				_send_flag = false;
				_headers = {};
				_reset.call(this);

				// 19
				_p('readyState', XMLHttpRequest.OPENED);

				// 20
				this.dispatchEvent('readystatechange');
			},

			/**
			Appends an header to the list of author request headers, or if header is already
			in the list of author request headers, combines its value with value.

			Throws an "InvalidStateError" exception if the state is not OPENED or if the send() flag is set.
			Throws a "SyntaxError" exception if header is not a valid HTTP header field name or if value
			is not a valid HTTP header field value.

			@method setRequestHeader
			@param {String} header
			@param {String|Number} value
			*/
			setRequestHeader: function(header, value) {
				var uaHeaders = [ // these headers are controlled by the user agent
						"accept-charset",
						"accept-encoding",
						"access-control-request-headers",
						"access-control-request-method",
						"connection",
						"content-length",
						"cookie",
						"cookie2",
						"content-transfer-encoding",
						"date",
						"expect",
						"host",
						"keep-alive",
						"origin",
						"referer",
						"te",
						"trailer",
						"transfer-encoding",
						"upgrade",
						"user-agent",
						"via"
					];

				// 1-2
				if (_p('readyState') !== XMLHttpRequest.OPENED || _send_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 3
				if (/[\u0100-\uffff]/.test(header) || Encode.utf8_encode(header) !== header) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 4
				/* this step is seemingly bypassed in browsers, probably to allow various unicode characters in header values
				if (/[\u0100-\uffff]/.test(value) || Encode.utf8_encode(value) !== value) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}*/

				header = Basic.trim(header).toLowerCase();

				// setting of proxy-* and sec-* headers is prohibited by spec
				if (!!~Basic.inArray(header, uaHeaders) || /^(proxy\-|sec\-)/.test(header)) {
					return false;
				}

				// camelize
				// browsers lowercase header names (at least for custom ones)
				// header = header.replace(/\b\w/g, function($1) { return $1.toUpperCase(); });

				if (!_headers[header]) {
					_headers[header] = value;
				} else {
					// http://tools.ietf.org/html/rfc2616#section-4.2 (last paragraph)
					_headers[header] += ', ' + value;
				}
				return true;
			},

			/**
			 * Test if the specified header is already set on this request.
			 * Returns a header value or boolean false if it's not yet set.
			 *
			 * @method hasRequestHeader
			 * @param {String} header Name of the header to test
			 * @return {Boolean|String}
			 */
			hasRequestHeader: function(header) {
				return header && _headers[header.toLowerCase()] || false;
			},

			/**
			Returns all headers from the response, with the exception of those whose field name is Set-Cookie or Set-Cookie2.

			@method getAllResponseHeaders
			@return {String} reponse headers or empty string
			*/
			getAllResponseHeaders: function() {
				return _responseHeaders || '';
			},

			/**
			Returns the header field value from the response of which the field name matches header,
			unless the field name is Set-Cookie or Set-Cookie2.

			@method getResponseHeader
			@param {String} header
			@return {String} value(s) for the specified header or null
			*/
			getResponseHeader: function(header) {
				header = header.toLowerCase();

				if (_error_flag || !!~Basic.inArray(header, ['set-cookie', 'set-cookie2'])) {
					return null;
				}

				if (_responseHeaders && _responseHeaders !== '') {
					// if we didn't parse response headers until now, do it and keep for later
					if (!_responseHeadersBag) {
						_responseHeadersBag = {};
						Basic.each(_responseHeaders.split(/\r\n/), function(line) {
							var pair = line.split(/:\s+/);
							if (pair.length === 2) { // last line might be empty, omit
								pair[0] = Basic.trim(pair[0]); // just in case
								_responseHeadersBag[pair[0].toLowerCase()] = { // simply to retain header name in original form
									header: pair[0],
									value: Basic.trim(pair[1])
								};
							}
						});
					}
					if (_responseHeadersBag.hasOwnProperty(header)) {
						return _responseHeadersBag[header].header + ': ' + _responseHeadersBag[header].value;
					}
				}
				return null;
			},

			/**
			Sets the Content-Type header for the response to mime.
			Throws an "InvalidStateError" exception if the state is LOADING or DONE.
			Throws a "SyntaxError" exception if mime is not a valid media type.

			@method overrideMimeType
			@param String mime Mime type to set
			*/
			overrideMimeType: function(mime) {
				var matches, charset;

				// 1
				if (!!~Basic.inArray(_p('readyState'), [XMLHttpRequest.LOADING, XMLHttpRequest.DONE])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2
				mime = Basic.trim(mime.toLowerCase());

				if (/;/.test(mime) && (matches = mime.match(/^([^;]+)(?:;\scharset\=)?(.*)$/))) {
					mime = matches[1];
					if (matches[2]) {
						charset = matches[2];
					}
				}

				if (!Mime.mimes[mime]) {
					throw new x.DOMException(x.DOMException.SYNTAX_ERR);
				}

				// 3-4
				_finalMime = mime;
				_finalCharset = charset;
			},

			/**
			Initiates the request. The optional argument provides the request entity body.
			The argument is ignored if request method is GET or HEAD.

			Throws an "InvalidStateError" exception if the state is not OPENED or if the send() flag is set.

			@method send
			@param {Blob|Document|String|FormData} [data] Request entity body
			@param {Object} [options] Set of requirements and pre-requisities for runtime initialization
			*/
			send: function(data, options) {
				if (Basic.typeOf(options) === 'string') {
					_options = { ruid: options };
				} else if (!options) {
					_options = {};
				} else {
					_options = options;
				}

				// 1-2
				if (this.readyState !== XMLHttpRequest.OPENED || _send_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 3
				// sending Blob
				if (data instanceof Blob) {
					_options.ruid = data.ruid;
					_mimeType = data.type || 'application/octet-stream';
				}

				// FormData
				else if (data instanceof FormData) {
					if (data.hasBlob()) {
						var blob = data.getBlob();
						_options.ruid = blob.ruid;
						_mimeType = blob.type || 'application/octet-stream';
					}
				}

				// DOMString
				else if (typeof data === 'string') {
					_encoding = 'UTF-8';
					_mimeType = 'text/plain;charset=UTF-8';

					// data should be converted to Unicode and encoded as UTF-8
					data = Encode.utf8_encode(data);
				}

				// if withCredentials not set, but requested, set it automatically
				if (!this.withCredentials) {
					this.withCredentials = (_options.required_caps && _options.required_caps.send_browser_cookies) && !_same_origin_flag;
				}

				// 4 - storage mutex
				// 5
				_upload_events_flag = (!_sync_flag && this.upload.hasEventListener()); // DSAP
				// 6
				_error_flag = false;
				// 7
				_upload_complete_flag = !data;
				// 8 - Asynchronous steps
				if (!_sync_flag) {
					// 8.1
					_send_flag = true;
					// 8.2
					// this.dispatchEvent('loadstart'); // will be dispatched either by native or runtime xhr
					// 8.3
					//if (!_upload_complete_flag) {
						// this.upload.dispatchEvent('loadstart');	// will be dispatched either by native or runtime xhr
					//}
				}
				// 8.5 - Return the send() method call, but continue running the steps in this algorithm.
				_doXHR.call(this, data);
			},

			/**
			Cancels any network activity.

			@method abort
			*/
			abort: function() {
				_error_flag = true;
				_sync_flag = false;

				if (!~Basic.inArray(_p('readyState'), [XMLHttpRequest.UNSENT, XMLHttpRequest.OPENED, XMLHttpRequest.DONE])) {
					_p('readyState', XMLHttpRequest.DONE);
					_send_flag = false;

					if (_xhr) {
						_xhr.getRuntime().exec.call(_xhr, 'XMLHttpRequest', 'abort', _upload_complete_flag);
					} else {
						throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
					}

					_upload_complete_flag = true;
				} else {
					_p('readyState', XMLHttpRequest.UNSENT);
				}
			},

			destroy: function() {
				if (_xhr) {
					if (Basic.typeOf(_xhr.destroy) === 'function') {
						_xhr.destroy();
					}
					_xhr = null;
				}

				this.unbindAll();

				if (this.upload) {
					this.upload.unbindAll();
					this.upload = null;
				}
			}
		});

		this.handleEventProps(dispatches.concat(['readystatechange'])); // for historical reasons
		this.upload.handleEventProps(dispatches);

		/* this is nice, but maybe too lengthy

		// if supported by JS version, set getters/setters for specific properties
		o.defineProperty(this, 'readyState', {
			configurable: false,

			get: function() {
				return _p('readyState');
			}
		});

		o.defineProperty(this, 'timeout', {
			configurable: false,

			get: function() {
				return _p('timeout');
			},

			set: function(value) {

				if (_sync_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// timeout still should be measured relative to the start time of request
				_timeoutset_time = (new Date).getTime();

				_p('timeout', value);
			}
		});

		// the withCredentials attribute has no effect when fetching same-origin resources
		o.defineProperty(this, 'withCredentials', {
			configurable: false,

			get: function() {
				return _p('withCredentials');
			},

			set: function(value) {
				// 1-2
				if (!~o.inArray(_p('readyState'), [XMLHttpRequest.UNSENT, XMLHttpRequest.OPENED]) || _send_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 3-4
				if (_anonymous_flag || _sync_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// 5
				_p('withCredentials', value);
			}
		});

		o.defineProperty(this, 'status', {
			configurable: false,

			get: function() {
				return _p('status');
			}
		});

		o.defineProperty(this, 'statusText', {
			configurable: false,

			get: function() {
				return _p('statusText');
			}
		});

		o.defineProperty(this, 'responseType', {
			configurable: false,

			get: function() {
				return _p('responseType');
			},

			set: function(value) {
				// 1
				if (!!~o.inArray(_p('readyState'), [XMLHttpRequest.LOADING, XMLHttpRequest.DONE])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2
				if (_sync_flag) {
					throw new x.DOMException(x.DOMException.INVALID_ACCESS_ERR);
				}

				// 3
				_p('responseType', value.toLowerCase());
			}
		});

		o.defineProperty(this, 'responseText', {
			configurable: false,

			get: function() {
				// 1
				if (!~o.inArray(_p('responseType'), ['', 'text'])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2-3
				if (_p('readyState') !== XMLHttpRequest.DONE && _p('readyState') !== XMLHttpRequest.LOADING || _error_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				return _p('responseText');
			}
		});

		o.defineProperty(this, 'responseXML', {
			configurable: false,

			get: function() {
				// 1
				if (!~o.inArray(_p('responseType'), ['', 'document'])) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				// 2-3
				if (_p('readyState') !== XMLHttpRequest.DONE || _error_flag) {
					throw new x.DOMException(x.DOMException.INVALID_STATE_ERR);
				}

				return _p('responseXML');
			}
		});

		o.defineProperty(this, 'response', {
			configurable: false,

			get: function() {
				if (!!~o.inArray(_p('responseType'), ['', 'text'])) {
					if (_p('readyState') !== XMLHttpRequest.DONE && _p('readyState') !== XMLHttpRequest.LOADING || _error_flag) {
						return '';
					}
				}

				if (_p('readyState') !== XMLHttpRequest.DONE || _error_flag) {
					return null;
				}

				return _p('response');
			}
		});

		*/

		function _p(prop, value) {
			if (!props.hasOwnProperty(prop)) {
				return;
			}
			if (arguments.length === 1) { // get
				return Env.can('define_property') ? props[prop] : self[prop];
			} else { // set
				if (Env.can('define_property')) {
					props[prop] = value;
				} else {
					self[prop] = value;
				}
			}
		}

		/*
		function _toASCII(str, AllowUnassigned, UseSTD3ASCIIRules) {
			// TODO: http://tools.ietf.org/html/rfc3490#section-4.1
			return str.toLowerCase();
		}
		*/


		function _doXHR(data) {
			var self = this;

			_start_time = new Date().getTime();

			_xhr = new RuntimeTarget();

			function loadEnd() {
				if (_xhr) { // it could have been destroyed by now
					_xhr.destroy();
					_xhr = null;
				}
				self.dispatchEvent('loadend');
				self = null;
			}

			function exec(runtime) {
				_xhr.bind('LoadStart', function(e) {
					_p('readyState', XMLHttpRequest.LOADING);
					self.dispatchEvent('readystatechange');

					self.dispatchEvent(e);

					if (_upload_events_flag) {
						self.upload.dispatchEvent(e);
					}
				});

				_xhr.bind('Progress', function(e) {
					if (_p('readyState') !== XMLHttpRequest.LOADING) {
						_p('readyState', XMLHttpRequest.LOADING); // LoadStart unreliable (in Flash for example)
						self.dispatchEvent('readystatechange');
					}
					self.dispatchEvent(e);
				});

				_xhr.bind('UploadProgress', function(e) {
					if (_upload_events_flag) {
						self.upload.dispatchEvent({
							type: 'progress',
							lengthComputable: false,
							total: e.total,
							loaded: e.loaded
						});
					}
				});

				_xhr.bind('Load', function(e) {
					_p('readyState', XMLHttpRequest.DONE);
					_p('status', Number(runtime.exec.call(_xhr, 'XMLHttpRequest', 'getStatus') || 0));
					_p('statusText', httpCode[_p('status')] || "");

					_p('response', runtime.exec.call(_xhr, 'XMLHttpRequest', 'getResponse', _p('responseType')));

					if (!!~Basic.inArray(_p('responseType'), ['text', ''])) {
						_p('responseText', _p('response'));
					} else if (_p('responseType') === 'document') {
						_p('responseXML', _p('response'));
					}

					_responseHeaders = runtime.exec.call(_xhr, 'XMLHttpRequest', 'getAllResponseHeaders');

					self.dispatchEvent('readystatechange');

					if (_p('status') > 0) { // status 0 usually means that server is unreachable
						if (_upload_events_flag) {
							self.upload.dispatchEvent(e);
						}
						self.dispatchEvent(e);
					} else {
						_error_flag = true;
						self.dispatchEvent('error');
					}
					loadEnd();
				});

				_xhr.bind('Abort', function(e) {
					self.dispatchEvent(e);
					loadEnd();
				});

				_xhr.bind('Error', function(e) {
					_error_flag = true;
					_p('readyState', XMLHttpRequest.DONE);
					self.dispatchEvent('readystatechange');
					_upload_complete_flag = true;
					self.dispatchEvent(e);
					loadEnd();
				});

				runtime.exec.call(_xhr, 'XMLHttpRequest', 'send', {
					url: _url,
					method: _method,
					async: _async,
					user: _user,
					password: _password,
					headers: _headers,
					mimeType: _mimeType,
					encoding: _encoding,
					responseType: self.responseType,
					withCredentials: self.withCredentials,
					options: _options
				}, data);
			}

			// clarify our requirements
			if (typeof(_options.required_caps) === 'string') {
				_options.required_caps = Runtime.parseCaps(_options.required_caps);
			}

			_options.required_caps = Basic.extend({}, _options.required_caps, {
				return_response_type: self.responseType
			});

			if (data instanceof FormData) {
				_options.required_caps.send_multipart = true;
			}

			if (!Basic.isEmptyObj(_headers)) {
				_options.required_caps.send_custom_headers = true;
			}

			if (!_same_origin_flag) {
				_options.required_caps.do_cors = true;
			}


			if (_options.ruid) { // we do not need to wait if we can connect directly
				exec(_xhr.connectRuntime(_options));
			} else {
				_xhr.bind('RuntimeInit', function(e, runtime) {
					exec(runtime);
				});
				_xhr.bind('RuntimeError', function(e, err) {
					self.dispatchEvent('RuntimeError', err);
				});
				_xhr.connectRuntime(_options);
			}
		}


		function _reset() {
			_p('responseText', "");
			_p('responseXML', null);
			_p('response', null);
			_p('status', 0);
			_p('statusText', "");
			_start_time = _timeoutset_time = null;
		}
	}

	XMLHttpRequest.UNSENT = 0;
	XMLHttpRequest.OPENED = 1;
	XMLHttpRequest.HEADERS_RECEIVED = 2;
	XMLHttpRequest.LOADING = 3;
	XMLHttpRequest.DONE = 4;

	XMLHttpRequest.prototype = EventTarget.instance;

	return XMLHttpRequest;
});

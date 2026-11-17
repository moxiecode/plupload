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
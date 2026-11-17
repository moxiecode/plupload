/**
 * Blob.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/flash/file/Blob
@private
*/
define("moxie/runtime/flash/file/Blob", [
	"moxie/runtime/flash/Runtime",
	"moxie/file/Blob"
], function(extensions, Blob) {

	var FlashBlob = {
		slice: function(blob, start, end, type) {
			var self = this.getRuntime();

			if (start < 0) {
				start = Math.max(blob.size + start, 0);
			} else if (start > 0) {
				start = Math.min(start, blob.size);
			}

			if (end < 0) {
				end = Math.max(blob.size + end, 0);
			} else if (end > 0) {
				end = Math.min(end, blob.size);
			}

			blob = self.shimExec.call(this, 'Blob', 'slice', start, end, type || '');

			if (blob) {
				blob = new Blob(self.uid, blob);
			}
			return blob;
		}
	};

	return (extensions.Blob = FlashBlob);
});
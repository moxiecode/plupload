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
@class moxie/runtime/dropbox/file/Blob
@private
*/
define("moxie/runtime/dropbox/file/Blob", [
	"moxie/runtime/dropbox/Runtime",
	"moxie/file/Blob"
], function(extensions, Blob) {

	function DropboxBlob() {

		this.slice = function(blob, start, end) {
			return new Blob(this.getRuntime().uid, {
				type: blob.type,
				size: end - start,
				downloadUrl: blob.downloadUrl,
				range: [start, end]
			});
		};

		this.destroy = function() {
			this.getRuntime().getShim().removeInstance(this.uid);
		};
	}

	return (extensions.Blob = DropboxBlob);
});

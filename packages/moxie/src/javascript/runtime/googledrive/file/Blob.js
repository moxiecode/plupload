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
@class moxie/runtime/googledrive/file/Blob
@private
*/
define("moxie/runtime/googledrive/file/Blob", [
	"moxie/runtime/googledrive/Runtime",
	"moxie/file/Blob"
], function(extensions, Blob) {

	function GoogleDriveBlob() {

		this.slice = function(blob, start, end) {
			return new Blob(this.getRuntime().uid, {
				type: blob.type,
				size: end - start,
				gdid: blob.gdid,
				downloadUrl: blob.downloadUrl,
				range: [start, end]
			});
		};

		this.destroy = function() {
			this.getRuntime().getShim().removeInstance(this.uid);
		};
	}

	return (extensions.Blob = GoogleDriveBlob);
});

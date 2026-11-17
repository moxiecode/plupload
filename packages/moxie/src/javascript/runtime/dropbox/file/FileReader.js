/**
 * FileReader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/dropbox/file/FileReader
@private
*/
define("moxie/runtime/dropbox/file/FileReader", [
	"moxie/runtime/dropbox/Runtime",
	"moxie/runtime/googledrive/file/FileReader"
], function(extensions, FileReader) {
	return (extensions.FileReader = FileReader);
});

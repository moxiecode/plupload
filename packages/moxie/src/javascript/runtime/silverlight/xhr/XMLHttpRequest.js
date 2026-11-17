/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/silverlight/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/silverlight/xhr/XMLHttpRequest", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/flash/xhr/XMLHttpRequest",
	"moxie/runtime/silverlight/file/FileReaderSync",
	"moxie/runtime/silverlight/runtime/Transporter"
], function(extensions, Basic, XMLHttpRequest, FileReaderSyncSilverlight, TransporterSilverlight) {
	return (extensions.XMLHttpRequest = Basic.extend({}, XMLHttpRequest));
});
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
@class moxie/runtime/dropbox/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/dropbox/xhr/XMLHttpRequest", [
	"moxie/runtime/dropbox/Runtime",
	"moxie/core/utils/Basic",
	"moxie/runtime/googledrive/xhr/XMLHttpRequest"
], function(extensions, Basic, XMLHttpRequest) {
	return (extensions.XMLHttpRequest = XMLHttpRequest);
});

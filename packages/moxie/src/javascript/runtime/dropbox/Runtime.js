/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global window:true */

/**
Defines constructor for Dropbox runtime.

@class moxie/runtime/dropbox/Runtime
@private
*/
define("moxie/runtime/dropbox/Runtime", [
	"moxie/runtime/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/core/utils/Env",
	"moxie/core/utils/Loader"
], function(Runtime, Basic, x, Env, Loader) {
	
	var type = "dropbox", extensions = {};


	function DropboxRuntime(options) {
		var I = this
		, Test = Runtime.capTest
		, True = Runtime.capTrue
		, script
		;

		var caps = Basic.extend({
				access_binary: Test(window.FileReader || window.File && window.File.getAsDataURL),
				access_image_binary: function() {
					return I.can('access_binary') && !!extensions.Image;
				},
				display_media: Test(
					(Env.can('create_canvas') || Env.can('use_data_uri_over32kb')) && 
					defined('moxie/image/Image')
				),
				do_cors: Test(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()),
				drag_and_drop: false,
				filter_by_extension: True,
				return_response_headers: True,
				return_response_type: function(responseType) {
					if (responseType === 'json' && !!window.JSON) { // we can fake this one even if it's not supported
						return true;
					} 
					return Env.can('return_response_type', responseType);
				},
				return_status_code: True,
				report_upload_progress: Test(window.XMLHttpRequest && new XMLHttpRequest().upload),
				resize_image: function() {
					return I.can('access_binary') && Env.can('create_canvas');
				},
				select_file: true,
				select_folder: false,
				select_multiple: True,
				send_binary_string: Test(window.XMLHttpRequest && (new XMLHttpRequest().sendAsBinary || (window.Uint8Array && window.ArrayBuffer))),
				send_custom_headers: Test(window.XMLHttpRequest),
				send_multipart: function() {
					return !!(window.XMLHttpRequest && new XMLHttpRequest().upload && window.FormData) || I.can('send_binary_string');
				},
				slice_blob: Test(window.File && (File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice)),
				stream_upload: function(){
					return I.can('slice_blob') && I.can('send_multipart');
				},
				summon_file_dialog: True,
				upload_filesize: True
			}
		);

		Runtime.call(this, options, (arguments[1] || type), caps);

		Basic.extend(this, {
			init : function() {
				script = Loader.loadScript("https://www.dropbox.com/static/api/1/dropins.js", function() {
					if (Dropbox.isBrowserSupported()) {
						I.trigger("Init");
					} else {
						I.trigger("Error", new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR));
					}
				}, {
					"id": 'dropboxjs',
					"data-app-key": options.dropbox.appKey
				});					
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					script.parentNode.removeChild(script); // remove script
					destroy = I = null;
				};
			}(this.destroy))
		});

		Basic.extend(this.getShim(), extensions);
	}

	Runtime.addConstructor(type, DropboxRuntime);

	return extensions;
});
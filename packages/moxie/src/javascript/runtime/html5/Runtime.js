/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global File:true */

/**
Defines constructor for HTML5 runtime.

@class moxie/runtime/html5/Runtime
@private
*/
define("moxie/runtime/html5/Runtime", [
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/runtime/Runtime",
	"moxie/core/utils/Env"
], function(Basic, x, Runtime, Env) {
	
	var type = "html5", extensions = {};
	
	function Html5Runtime(options) {
		var I = this
		, Test = Runtime.capTest
		, True = Runtime.capTrue
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
				drag_and_drop: Test(function() {
					// this comes directly from Modernizr: http://www.modernizr.com/
					var div = document.createElement('div');
					// IE has support for drag and drop since version 5, but doesn't support dropping files from desktop
					return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 
						(Env.browser !== 'IE' || Env.verComp(Env.version, 9, '>'));
				}()),
				filter_by_extension: Test(function() { // if you know how to feature-detect this, please suggest
					return !(
						(Env.browser === 'Chrome' && Env.verComp(Env.version, 28, '<')) || 
						(Env.browser === 'IE' && Env.verComp(Env.version, 10, '<')) || 
						(Env.browser === 'Safari' && Env.verComp(Env.version, 7, '<')) ||
						(Env.browser === 'Firefox' && Env.verComp(Env.version, 37, '<'))
					);
				}()),
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
				select_file: function() {
					return Env.can('use_fileinput') && window.File;
				},
				select_folder: function() {
					return I.can('select_file') && (
						Env.browser === 'Chrome' && Env.verComp(Env.version, 21, '>=') ||
						Env.browser === 'Firefox' && Env.verComp(Env.version, 42, '>=') // https://developer.mozilla.org/en-US/Firefox/Releases/42
					);
				},
				select_multiple: function() {
					// it is buggy on Safari Windows and iOS
					return I.can('select_file') &&
						!(Env.browser === 'Safari' && Env.os === 'Windows') &&
						!(Env.os === 'iOS' && Env.verComp(Env.osVersion, "7.0.0", '>') && Env.verComp(Env.osVersion, "8.0.0", '<'));
				},
				send_binary_string: Test(window.XMLHttpRequest && (new XMLHttpRequest().sendAsBinary || (window.Uint8Array && window.ArrayBuffer))),
				send_custom_headers: Test(window.XMLHttpRequest),
				send_multipart: function() {
					return !!(window.XMLHttpRequest && new XMLHttpRequest().upload && window.FormData) || I.can('send_binary_string');
				},
				slice_blob: Test(window.File && (File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice)),
				stream_upload: function(){
					return I.can('slice_blob') && I.can('send_multipart');
				},
				summon_file_dialog: function() { // yeah... some dirty sniffing here...
					return I.can('select_file') && !(
						(Env.browser === 'Firefox' && Env.verComp(Env.version, 4, '<')) ||
						(Env.browser === 'Opera' && Env.verComp(Env.version, 12, '<')) ||
						(Env.browser === 'IE' && Env.verComp(Env.version, 10, '<'))
					);
				},
				upload_filesize: True,
				use_http_method: True
			}, 
			arguments[2]
		);

		Runtime.call(this, options, (arguments[1] || type), caps);


		Basic.extend(this, {

			init : function() {
				this.trigger("Init");
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					destroy = I = null;
				};
			}(this.destroy))
		});

		Basic.extend(this.getShim(), extensions);
	}

	Runtime.addConstructor(type, Html5Runtime);

	return extensions;
});

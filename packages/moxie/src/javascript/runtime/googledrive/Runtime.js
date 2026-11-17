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
Defines constructor for GoogleDrive runtime.

@class moxie/runtime/googledrive/Runtime
@private
*/
define("moxie/runtime/googledrive/Runtime", [
	"moxie/runtime/Runtime",
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/core/utils/Loader"
], function(Runtime, html5Extensions, Basic, x, Loader) {
	
	var type = "googledrive", extensions = {}, Html5Runtime = Runtime.getConstructor('html5');


	function GoogleDriveRuntime(options) {
		var I = this, gapiEls = [];

		Html5Runtime.call(this, options, type);

		Basic.extend(this, {
			init : function() {
				Basic.inSeries([
					function(cb) {
						gapiEls.push(Loader.loadScript("https://apis.google.com/js/api.js", cb));
					},

					function(cb) {
						gapiEls.push(Loader.loadScript("https://apis.google.com/js/client.js", cb));
					},

					function(cb) {
						gapi.load('auth', { callback: cb });
					},

					function(cb) {
						gapi.client.load('drive', 'v2', cb);
					} 
				], function(err) {
					if (err) {
						this.mode = false;
					}

					I.trigger("Init");
				});
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					Basic.each(gapiEls, function(gapiEl) {
						gapiEl.parentNode.removeChild(gapiEl); // remove script
					});
					gapiEls = [];
					destroy = I = null;
				};
			}(this.destroy))
		});

		Basic.extend(this.getShim(), extensions);
	}

	Runtime.addConstructor(type, GoogleDriveRuntime);

	return extensions;
});
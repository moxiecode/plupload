/**
 * Runtime.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/*global ActiveXObject:true */

/**
Defines constructor for Flash runtime.

@class moxie/runtime/flash/Runtime
@private
*/
define("moxie/runtime/flash/Runtime", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Env",
	"moxie/core/utils/Dom",
	"moxie/core/Exceptions",
	"moxie/runtime/Runtime"
], function(Basic, Env, Dom, x, Runtime) {
	
	var type = 'flash', extensions = {};

	/**
	Get the version of the Flash Player

	@method getShimVersion
	@private
	@return {Number} Flash Player version
	*/
	function getShimVersion() {
		var version;

		try {
			version = navigator.plugins['Shockwave Flash'];
			version = version.description;
		} catch (e1) {
			try {
				version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
			} catch (e2) {
				version = '0.0';
			}
		}
		version = version.match(/\d+/g);
		return parseFloat(version[0] + '.' + version[1]);
	}


	/**
	Cross-browser SWF removal
    	- Especially needed to safely and completely remove a SWF in Internet Explorer

   	Originated from SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	*/
	function removeSWF(id) {
        var obj = Dom.get(id);
        if (obj && obj.nodeName == "OBJECT") {
            if (Env.browser === 'IE') {
                obj.style.display = "none";
                (function onInit(){
                	// http://msdn.microsoft.com/en-us/library/ie/ms534360(v=vs.85).aspx
                    if (obj.readyState == 4) {
                        removeObjectInIE(id);
                    }
                    else {
                        setTimeout(onInit, 10);
                    }
                })();
            }
            else {
                obj.parentNode.removeChild(obj);
            }
        }
    }


	function removeObjectInIE(id) {
        var obj = Dom.get(id);
        if (obj) {
            for (var i in obj) {
                if (typeof obj[i] == "function") {
                    obj[i] = null;
                }
            }
            obj.parentNode.removeChild(obj);
        }
    }

	/**
	Constructor for the Flash Runtime
	*/
	function FlashRuntime(options) {
		var I = this, initTimer;

		options = Basic.extend({ swf_url: Env.swf_url }, options);

		Runtime.call(this, options, type, {
			access_binary: function(value) {
				return value && I.mode === 'browser';
			},
			access_image_binary: function(value) {
				return value && I.mode === 'browser';
			},
			display_media: Runtime.capTest(defined('moxie/image/Image')),
			do_cors: Runtime.capTrue,
			drag_and_drop: false,
			report_upload_progress: function() {
				return I.mode === 'client';
			},
			resize_image: Runtime.capTrue,
			return_response_headers: false,
			return_response_type: function(responseType) {
				if (responseType === 'json' && !!window.JSON) {
					return true;
				} 
				return !Basic.arrayDiff(responseType, ['', 'text', 'document']) || I.mode === 'browser';
			},
			return_status_code: function(code) {
				return I.mode === 'browser' || !Basic.arrayDiff(code, [200, 404]);
			},
			select_file: Runtime.capTrue,
			select_multiple: Runtime.capTrue,
			send_binary_string: function(value) {
				return value && I.mode === 'browser';
			},
			send_browser_cookies: function(value) {
				return value && I.mode === 'browser';
			},
			send_custom_headers: function(value) {
				return value && I.mode === 'browser';
			},
			send_multipart: Runtime.capTrue,
			slice_blob: function(value) {
				return value && I.mode === 'browser';
			},
			stream_upload: function(value) {
				return value && I.mode === 'browser';
			},
			summon_file_dialog: false,
			upload_filesize: function(size) {
				return Basic.parseSizeStr(size) <= 2097152 || I.mode === 'client';
			},
			use_http_method: function(methods) {
				return !Basic.arrayDiff(methods, ['GET', 'POST']);
			}
		}, { 
			// capabilities that require specific mode
			access_binary: function(value) {
				return value ? 'browser' : 'client';
			},
			access_image_binary: function(value) {
				return value ? 'browser' : 'client';
			},
			report_upload_progress: function(value) {
				return value ? 'browser' : 'client';
			},
			return_response_type: function(responseType) {
				return Basic.arrayDiff(responseType, ['', 'text', 'json', 'document']) ? 'browser' : ['client', 'browser'];
			},
			return_status_code: function(code) {
				return Basic.arrayDiff(code, [200, 404]) ? 'browser' : ['client', 'browser'];
			},
			send_binary_string: function(value) {
				return value ? 'browser' : 'client';
			},
			send_browser_cookies: function(value) {
				return value ? 'browser' : 'client';
			},
			send_custom_headers: function(value) {
				return value ? 'browser' : 'client';
			},
			slice_blob: function(value) {
				return value ? 'browser' : 'client';
			},
			stream_upload: function(value) {
				return value ? 'client' : 'browser';
			},
			upload_filesize: function(size) {
				return Basic.parseSizeStr(size) >= 2097152 ? 'client' : 'browser';
			}
		}, 'client');


		// minimal requirement for Flash Player version
		if (getShimVersion() < 11.3) {
			if (MXI_DEBUG && Env.debug.runtime) {
				Env.log("\tFlash didn't meet minimal version requirement (11.3).");	
			}

			this.mode = false; // with falsy mode, runtime won't operable, no matter what the mode was before
		}


		Basic.extend(this, {

			getShim: function() {
				return Dom.get(this.uid);
			},

			shimExec: function(component, action) {
				var args = [].slice.call(arguments, 2);
				return I.getShim().exec(this.uid, component, action, args);
			},

			init: function() {
				var html, el, container;

				container = this.getShimContainer();

				// if not the minimal height, shims are not initialized in older browsers (e.g FF3.6, IE6,7,8, Safari 4.0,5.0, etc)
				Basic.extend(container.style, {
					position: 'absolute',
					top: '-8px',
					left: '-8px',
					width: '9px',
					height: '9px',
					overflow: 'hidden'
				});

				// insert flash object
				html = '<object id="' + this.uid + '" type="application/x-shockwave-flash" data="' +  options.swf_url + '" ';

				if (Env.browser === 'IE') {
					html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
				}

				html += 'width="100%" height="100%" style="outline:0">'  +
					'<param name="movie" value="' + options.swf_url + '" />' +
					'<param name="flashvars" value="uid=' + escape(this.uid) + '&target=' + Runtime.getGlobalEventTarget() + '" />' +
					'<param name="wmode" value="transparent" />' +
					'<param name="allowscriptaccess" value="always" />' +
				'</object>';

				if (Env.browser === 'IE') {
					el = document.createElement('div');
					container.appendChild(el);
					el.outerHTML = html;
					el = container = null; // just in case
				} else {
					container.innerHTML = html;
				}

				// Init is dispatched by the shim
				initTimer = setTimeout(function() {
					if (I && !I.initialized) { // runtime might be already destroyed by this moment
						I.trigger("Error", new x.RuntimeError(x.RuntimeError.NOT_INIT_ERR));

						if (MXI_DEBUG && Env.debug.runtime) {
							Env.log("\tFlash failed to initialize within a specified period of time (typically 5s).");	
						}
					}
				}, 5000);
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					removeSWF(I.uid); // SWF removal requires special care in IE

					destroy.call(I);
					clearTimeout(initTimer); // initialization check might be still onwait
					options = initTimer = destroy = I = null;
				};
			}(this.destroy))

		}, extensions);
	}

	Runtime.addConstructor(type, FlashRuntime);

	return extensions;
});

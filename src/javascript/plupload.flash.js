/**
 * plupload.flash.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

// JSLint defined globals
/*global window:false, document:false, plupload:false, ActiveXObject:false, escape:false */

(function(window, document, plupload, undef) {
	var uploadInstances = {}, initialized = {};

	function getFlashVersion() {
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

	plupload.flash = {
		/**
		 * Will be executed by the Flash runtime when it sends out events.
		 *
		 * @param {String} id If for the upload instance.
		 * @param {String} name Event name to trigger.
		 * @param {Object} obj Parameters to be passed with event.
		 */
		trigger : function(id, name, obj) {
								
			// Detach the call so that error handling in the browser is presented correctly
			setTimeout(function() {
				var uploader = uploadInstances[id], i, args;
				
				if (uploader) {				
					uploader.trigger('Flash:' + name, obj);
				}
			}, 0);
		}
	};

	/**
	 * FlashRuntime implementation. This runtime supports these features: jpgresize, pngresize, chunks.
	 *
	 * @static
	 * @class plupload.runtimes.Flash
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Flash = plupload.addRuntime("flash", {
		
		/**
		 * Returns a list of supported features for the runtime.
		 *
		 * @return {Object} Name/value object with supported features.
		 */
		getFeatures : function() {
			return {
				jpgresize: true,
				pngresize: true,
				maxWidth: 8091,
				maxHeight: 8091,
				chunks: true,
				progress: true,
				multipart: true,
				multi_selection: true
			};
		},

		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			var browseButton, flashContainer, waitCount = 0, container = document.body;

			if (getFlashVersion() < 10) {
				callback({success : false});
				return;
			}

			initialized[uploader.id] = false;
			uploadInstances[uploader.id] = uploader;

			// Find browse button and set to to be relative
			browseButton = document.getElementById(uploader.settings.browse_button);

			// Create flash container and insert it at an absolute position within the browse button
			flashContainer = document.createElement('div');
			flashContainer.id = uploader.id + '_flash_container';

			plupload.extend(flashContainer.style, {
				position : 'absolute',
				top : '0px',
				background : uploader.settings.shim_bgcolor || 'transparent',
				zIndex : 99999,
				width : '100%',
				height : '100%'
			});

			flashContainer.className = 'plupload flash';

			if (uploader.settings.container) {
				container = document.getElementById(uploader.settings.container);
				if (plupload.getStyle(container, 'position') === 'static') {
					container.style.position = 'relative';
				}
			}

			container.appendChild(flashContainer);
			
			// insert flash object
			(function() {
				var html, el;
				
				html = '<object id="' + uploader.id + '_flash" type="application/x-shockwave-flash" data="' + uploader.settings.flash_swf_url + '" ';
				
				if (plupload.ua.ie) {
					html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
				}

				html += 'width="100%" height="100%" style="outline:0">'  +
					'<param name="movie" value="' + uploader.settings.flash_swf_url + '" />' +
					'<param name="flashvars" value="id=' + escape(uploader.id) + '" />' +
					'<param name="wmode" value="transparent" />' +
					'<param name="allowscriptaccess" value="always" />' +
				'</object>';
					
				if (plupload.ua.ie) {
					el = document.createElement('div');
					flashContainer.appendChild(el);
					el.outerHTML = html;
					el = null; // just in case
				} else {
					flashContainer.innerHTML = html;
				}
			}());

			function getFlashObj() {
				return document.getElementById(uploader.id + '_flash');
			}

			function waitLoad() {
								
				// Wait for 5 sec
				if (waitCount++ > 5000) {
					callback({success : false});
					return;
				}

				if (initialized[uploader.id] === false) { // might also be undefined, if uploader was destroyed by that moment
					setTimeout(waitLoad, 1);
				}
			}

			waitLoad();

			// Fix IE memory leaks
			browseButton = flashContainer = null;
			
			// destroy should always be available, after Flash:Init or before (#516)
			uploader.bind("Destroy", function(up) {
				var flashContainer;
				
				plupload.removeAllEvents(document.body, up.id);
				
				delete initialized[up.id];
				delete uploadInstances[up.id];
				
				flashContainer = document.getElementById(up.id + '_flash_container');
				if (flashContainer) {
					container.removeChild(flashContainer);
				}
			});

			// Wait for Flash to send init event
			uploader.bind("Flash:Init", function() {	
				var lookup = {}, i;

				getFlashObj().setFileFilters(uploader.settings.filters, uploader.settings.multi_selection);

				// Prevent eventual reinitialization of the instance
				if (initialized[uploader.id]) {
					return;
				}
				initialized[uploader.id] = true;

				uploader.bind("UploadFile", function(up, file) {
					var settings = up.settings, resize = uploader.settings.resize || {};

					getFlashObj().uploadFile(lookup[file.id], settings.url, {
						name : file.target_name || file.name,
						mime : plupload.mimeTypes[file.name.replace(/^.+\.([^.]+)/, '$1').toLowerCase()] || 'application/octet-stream',
						chunk_size : settings.chunk_size,
						width : resize.width,
						height : resize.height,
						quality : resize.quality,
						multipart : settings.multipart,
						multipart_params : settings.multipart_params || {},
						file_data_name : settings.file_data_name,
						format : /\.(jpg|jpeg)$/i.test(file.name) ? 'jpg' : 'png',
						headers : settings.headers,
						urlstream_upload : settings.urlstream_upload
					});
				});
				
				uploader.bind("CancelUpload", function() {
					getFlashObj().cancelUpload();
				});


				uploader.bind("Flash:UploadProcess", function(up, flash_file) {
					var file = up.getFile(lookup[flash_file.id]);

					if (file.status != plupload.FAILED) {
						file.loaded = flash_file.loaded;
						file.size = flash_file.size;

						up.trigger('UploadProgress', file);
					}
				});

				uploader.bind("Flash:UploadChunkComplete", function(up, info) {
					var chunkArgs, file = up.getFile(lookup[info.id]);

					chunkArgs = {
						chunk : info.chunk,
						chunks : info.chunks,
						response : info.text
					};

					up.trigger('ChunkUploaded', file, chunkArgs);

					// Stop upload if file is maked as failed
					if (file.status !== plupload.FAILED && up.state !== plupload.STOPPED) {
						getFlashObj().uploadNextChunk();
					}

					// Last chunk then dispatch FileUploaded event
					if (info.chunk == info.chunks - 1) {
						file.status = plupload.DONE;

						up.trigger('FileUploaded', file, {
							response : info.text
						});
					}
				});

				uploader.bind("Flash:SelectFiles", function(up, selected_files) {
					var file, i, files = [], id;

					// Add the selected files to the file queue
					for (i = 0; i < selected_files.length; i++) {
						file = selected_files[i];

						// Store away flash ref internally
						id = plupload.guid();
						lookup[id] = file.id;
						lookup[file.id] = id;

						files.push(new plupload.File(id, file.name, file.size));
					}

					// Trigger FilesAdded event if we added any
					if (files.length) {
						uploader.trigger("FilesAdded", files);
					}
				});

				uploader.bind("Flash:SecurityError", function(up, err) {
					uploader.trigger('Error', {
						code : plupload.SECURITY_ERROR,
						message : plupload.translate('Security error.'),
						details : err.message,
						file : uploader.getFile(lookup[err.id])
					});
				});

				uploader.bind("Flash:GenericError", function(up, err) {
					uploader.trigger('Error', {
						code : plupload.GENERIC_ERROR,
						message : plupload.translate('Generic error.'),
						details : err.message,
						file : uploader.getFile(lookup[err.id])
					});
				});

				uploader.bind("Flash:IOError", function(up, err) {
					uploader.trigger('Error', {
						code : plupload.IO_ERROR,
						message : plupload.translate('IO error.'),
						details : err.message,
						file : uploader.getFile(lookup[err.id])
					});
				});
				
				uploader.bind("Flash:ImageError", function(up, err) {
					uploader.trigger('Error', {
						code : parseInt(err.code, 10),
						message : plupload.translate('Image error.'),
						file : uploader.getFile(lookup[err.id])
					});
				});
				
				uploader.bind('Flash:StageEvent:rollOver', function(up) {
					var browseButton, hoverClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					hoverClass = up.settings.browse_button_hover;
					
					if (browseButton && hoverClass) {
						plupload.addClass(browseButton, hoverClass);
					}
				});
				
				uploader.bind('Flash:StageEvent:rollOut', function(up) {
					var browseButton, hoverClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					hoverClass = up.settings.browse_button_hover;
					
					if (browseButton && hoverClass) {
						plupload.removeClass(browseButton, hoverClass);
					}
				});
				
				uploader.bind('Flash:StageEvent:mouseDown', function(up) {
					var browseButton, activeClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					activeClass = up.settings.browse_button_active;
					
					if (browseButton && activeClass) {
						plupload.addClass(browseButton, activeClass);
						
						// Make sure that browse_button has active state removed from it
						plupload.addEvent(document.body, 'mouseup', function() {
							plupload.removeClass(browseButton, activeClass);	
						}, up.id);
					}
				});
				
				uploader.bind('Flash:StageEvent:mouseUp', function(up) {
					var browseButton, activeClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					activeClass = up.settings.browse_button_active;
					
					if (browseButton && activeClass) {
						plupload.removeClass(browseButton, activeClass);
					}
				});
				
				
				uploader.bind('Flash:ExifData', function(up, obj) {
					uploader.trigger('ExifData', uploader.getFile(lookup[obj.id]), obj.data);
				});
				
				
				uploader.bind('Flash:GpsData', function(up, obj) {
					uploader.trigger('GpsData', uploader.getFile(lookup[obj.id]), obj.data);
				});
				

				uploader.bind("QueueChanged", function(up) {
					uploader.refresh();
				});

				uploader.bind("FilesRemoved", function(up, files) {
					var i;

					for (i = 0; i < files.length; i++) {
						getFlashObj().removeFile(lookup[files[i].id]);
					}
				});

				uploader.bind("StateChanged", function(up) {
					uploader.refresh();
				});

				uploader.bind("Refresh", function(up) {
					var browseButton, browsePos, browseSize;

					// Set file filters incase it has been changed dynamically
					getFlashObj().setFileFilters(uploader.settings.filters, uploader.settings.multi_selection);

					browseButton = document.getElementById(up.settings.browse_button);
					if (browseButton) {
						browsePos = plupload.getPos(browseButton, document.getElementById(up.settings.container));
						browseSize = plupload.getSize(browseButton);
	
						plupload.extend(document.getElementById(up.id + '_flash_container').style, {
							top : browsePos.y + 'px',
							left : browsePos.x + 'px',
							width : browseSize.w + 'px',
							height : browseSize.h + 'px'
						});
					}
				});
				
				uploader.bind("DisableBrowse", function(up, disabled) {
					getFlashObj().disableBrowse(disabled);
				});
							
				callback({success : true});
			});
		}
	});
})(window, document, plupload);

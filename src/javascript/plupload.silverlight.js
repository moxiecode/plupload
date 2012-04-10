/**
 * plupload.silverlight.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

// JSLint defined globals
/*global window:false, document:false, plupload:false, ActiveXObject:false */

(function(window, document, plupload, undef) {
	var uploadInstances = {}, initialized = {};

	function jsonSerialize(obj) {
		var value, type = typeof obj, isArray, i, key;

		// Treat undefined as null
		if (obj === undef || obj === null) {
			return 'null';
		}

		// Encode strings
		if (type === 'string') {
			value = '\bb\tt\nn\ff\rr\""\'\'\\\\';

			return '"' + obj.replace(/([\u0080-\uFFFF\x00-\x1f\"])/g, function(a, b) {
				var idx = value.indexOf(b);

				if (idx + 1) {
					return '\\' + value.charAt(idx + 1);
				}

				a = b.charCodeAt().toString(16);

				return '\\u' + '0000'.substring(a.length) + a;
			}) + '"';
		}

		// Loop objects/arrays
		if (type == 'object') {
			isArray = obj.length !== undef;
			value = '';

			if (isArray) {
				for (i = 0; i < obj.length; i++) {
					if (value) {
						value += ',';
					}

					value += jsonSerialize(obj[i]);
				}

				value = '[' + value + ']';
			} else {
				for (key in obj) {
					if (obj.hasOwnProperty(key)) {
						if (value) {
							value += ',';
						}

						value += jsonSerialize(key) + ':' + jsonSerialize(obj[key]);
					}
				}

				value = '{' + value + '}';
			}

			return value;
		}

		// Convert all other types to string
		return '' + obj;
	}

	function isInstalled(version) {
		var isVersionSupported = false, container = null, control = null, actualVer,
			actualVerArray, reqVerArray, requiredVersionPart, actualVersionPart, index = 0;

		try {
			try {
				control = new ActiveXObject('AgControl.AgControl');

				if (control.IsVersionSupported(version)) {
					isVersionSupported = true;
				}

				control = null;
			} catch (e) {
				var plugin = navigator.plugins["Silverlight Plug-In"];

				if (plugin) {
					actualVer = plugin.description;

					if (actualVer === "1.0.30226.2") {
						actualVer = "2.0.30226.2";
					}

					actualVerArray = actualVer.split(".");

					while (actualVerArray.length > 3) {
						actualVerArray.pop();
					}

					while ( actualVerArray.length < 4) {
						actualVerArray.push(0);
					}

					reqVerArray = version.split(".");

					while (reqVerArray.length > 4) {
						reqVerArray.pop();
					}

					do {
						requiredVersionPart = parseInt(reqVerArray[index], 10);
						actualVersionPart = parseInt(actualVerArray[index], 10);
						index++;
					} while (index < reqVerArray.length && requiredVersionPart === actualVersionPart);

					if (requiredVersionPart <= actualVersionPart && !isNaN(requiredVersionPart)) {
						isVersionSupported = true;
					}
				}
			}
		} catch (e2) {
			isVersionSupported = false;
		}

		return isVersionSupported;
	}

	plupload.silverlight = {
		trigger : function(id, name) {
			var uploader = uploadInstances[id], i, args;
			
			if (uploader) {
				args = plupload.toArray(arguments).slice(1);
				args[0] = 'Silverlight:' + name;

				// Detach the call so that error handling in the browser is presented correctly
				setTimeout(function() {
					uploader.trigger.apply(uploader, args);
				}, 0);
			}
		}
	};

	/**
	 * Silverlight implementation. This runtime supports these features: jpgresize, pngresize, chunks.
	 *
	 * @static
	 * @class plupload.runtimes.Silverlight
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Silverlight = plupload.addRuntime("silverlight", {
		/**
		 * Returns a list of supported features for the runtime.
		 *
		 * @return {Object} Name/value object with supported features.
		 */
		getFeatures : function() {
			return {
				jpgresize: true,
				pngresize: true,
				chunks: true,
				progress: true,
				multipart: true,
				multi_selection: true
			};
		},

		/**
		 * Initializes the upload runtime. This runtime supports these features: jpgresize, pngresize, chunks.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			var silverlightContainer, filter = '', filters = uploader.settings.filters, i, container = document.body;

			// Check if Silverlight is installed, Silverlight windowless parameter doesn't work correctly on Opera so we disable it for now
			if (!isInstalled('2.0.31005.0') || (window.opera && window.opera.buildNumber)) {
				callback({success : false});
				return;
			}
			
			initialized[uploader.id] = false;
			uploadInstances[uploader.id] = uploader;

			// Create silverlight container and insert it at an absolute position within the browse button
			silverlightContainer = document.createElement('div');
			silverlightContainer.id = uploader.id + '_silverlight_container';

			plupload.extend(silverlightContainer.style, {
				position : 'absolute',
				top : '0px',
				background : uploader.settings.shim_bgcolor || 'transparent',
				zIndex : 99999,
				width : '100px',
				height : '100px',
				overflow : 'hidden',
				opacity : uploader.settings.shim_bgcolor || document.documentMode > 8 ? '' : 0.01 // Force transparent if bgcolor is undefined
			});

			silverlightContainer.className = 'plupload silverlight';

			if (uploader.settings.container) {
				container = document.getElementById(uploader.settings.container);
				if (plupload.getStyle(container, 'position') === 'static') {
					container.style.position = 'relative';
				}
			}

			container.appendChild(silverlightContainer);

			for (i = 0; i < filters.length; i++) {
				filter += (filter != '' ? '|' : '') + filters[i].title + " | *." + filters[i].extensions.replace(/,/g, ';*.');
			}

			// Insert the Silverlight object inide the Silverlight container
			silverlightContainer.innerHTML = '<object id="' + uploader.id + '_silverlight" data="data:application/x-silverlight," type="application/x-silverlight-2" style="outline:none;" width="1024" height="1024">' +
				'<param name="source" value="' + uploader.settings.silverlight_xap_url + '"/>' +
				'<param name="background" value="Transparent"/>' +
				'<param name="windowless" value="true"/>' +
				'<param name="enablehtmlaccess" value="true"/>' +
				'<param name="initParams" value="id=' + uploader.id + ',filter=' + filter + ',multiselect=' + uploader.settings.multi_selection + '"/>' +
				'</object>';

			function getSilverlightObj() {
				return document.getElementById(uploader.id + '_silverlight').content.Upload;
			}

			uploader.bind("Silverlight:Init", function() {
				var selectedFiles, lookup = {};
				
				// Prevent eventual reinitialization of the instance
				if (initialized[uploader.id]) {
					return;
				}
					
				initialized[uploader.id] = true;

				uploader.bind("Silverlight:StartSelectFiles", function(up) {
					selectedFiles = [];
				});

				uploader.bind("Silverlight:SelectFile", function(up, sl_id, name, size) {
					var id;

					// Store away silverlight ids
					id = plupload.guid();
					lookup[id] = sl_id;
					lookup[sl_id] = id;

					// Expose id, name and size
					selectedFiles.push(new plupload.File(id, name, size));
				});

				uploader.bind("Silverlight:SelectSuccessful", function() {
					// Trigger FilesAdded event if we added any
					if (selectedFiles.length) {
						uploader.trigger("FilesAdded", selectedFiles);
					}
				});

				uploader.bind("Silverlight:UploadChunkError", function(up, file_id, chunk, chunks, message) {
					uploader.trigger("Error", {
						code : plupload.IO_ERROR,
						message : 'IO Error.',
						details : message,
						file : up.getFile(lookup[file_id])
					});
				});

				uploader.bind("Silverlight:UploadFileProgress", function(up, sl_id, loaded, total) {
					var file = up.getFile(lookup[sl_id]);

					if (file.status != plupload.FAILED) {
						file.size = total;
						file.loaded = loaded;

						up.trigger('UploadProgress', file);
					}
				});

				uploader.bind("Refresh", function(up) {
					var browseButton, browsePos, browseSize;

					browseButton = document.getElementById(up.settings.browse_button);
					if (browseButton) {
						browsePos = plupload.getPos(browseButton, document.getElementById(up.settings.container));
						browseSize = plupload.getSize(browseButton);
	
						plupload.extend(document.getElementById(up.id + '_silverlight_container').style, {
							top : browsePos.y + 'px',
							left : browsePos.x + 'px',
							width : browseSize.w + 'px',
							height : browseSize.h + 'px'
						});
					}
				});

				uploader.bind("Silverlight:UploadChunkSuccessful", function(up, sl_id, chunk, chunks, text) {
					var chunkArgs, file = up.getFile(lookup[sl_id]);

					chunkArgs = {
						chunk : chunk,
						chunks : chunks,
						response : text
					};

					up.trigger('ChunkUploaded', file, chunkArgs);

					// Stop upload if file is maked as failed
					if (file.status != plupload.FAILED && up.state !== plupload.STOPPED) {
						getSilverlightObj().UploadNextChunk();
					}

					// Last chunk then dispatch FileUploaded event
					if (chunk == chunks - 1) {
						file.status = plupload.DONE;

						up.trigger('FileUploaded', file, {
							response : text
						});
					}
				});

				uploader.bind("Silverlight:UploadSuccessful", function(up, sl_id, response) {
					var file = up.getFile(lookup[sl_id]);

					file.status = plupload.DONE;

					up.trigger('FileUploaded', file, {
						response : response
					});
				});

				uploader.bind("FilesRemoved", function(up, files) {
					var i;

					for (i = 0; i < files.length; i++) {
						getSilverlightObj().RemoveFile(lookup[files[i].id]);
					}
				});

				uploader.bind("UploadFile", function(up, file) {
					var settings = up.settings, resize = settings.resize || {};

					getSilverlightObj().UploadFile(
						lookup[file.id],
						up.settings.url,
						jsonSerialize({
							name : file.target_name || file.name,
							mime : plupload.mimeTypes[file.name.replace(/^.+\.([^.]+)/, '$1').toLowerCase()] || 'application/octet-stream',
							chunk_size : settings.chunk_size,
							image_width : resize.width,
							image_height : resize.height,
							image_quality : resize.quality || 90,
							multipart : !!settings.multipart,
							multipart_params : settings.multipart_params || {},
							file_data_name : settings.file_data_name,
							headers : settings.headers
						})
					);
				});
				
				uploader.bind("CancelUpload", function() {
					getSilverlightObj().CancelUpload();
				});

				uploader.bind('Silverlight:MouseEnter', function(up) {
					var browseButton, hoverClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					hoverClass = up.settings.browse_button_hover;
					
					if (browseButton && hoverClass) {
						plupload.addClass(browseButton, hoverClass);
					}
				});
				
				uploader.bind('Silverlight:MouseLeave', function(up) {
					var browseButton, hoverClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					hoverClass = up.settings.browse_button_hover;
					
					if (browseButton && hoverClass) {
						plupload.removeClass(browseButton, hoverClass);
					}
				});
				
				uploader.bind('Silverlight:MouseLeftButtonDown', function(up) {
					var browseButton, activeClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					activeClass = up.settings.browse_button_active;
					
					if (browseButton && activeClass) {
						plupload.addClass(browseButton, activeClass);
						
						// Make sure that browse_button has active state removed from it
						plupload.addEvent(document.body, 'mouseup', function() {
							plupload.removeClass(browseButton, activeClass);	
						});
					}
				});
				
				uploader.bind('Sliverlight:StartSelectFiles', function(up) {
					var browseButton, activeClass;
						
					browseButton = document.getElementById(uploader.settings.browse_button);
					activeClass = up.settings.browse_button_active;
					
					if (browseButton && activeClass) {
						plupload.removeClass(browseButton, activeClass);
					}
				});
				
				uploader.bind("DisableBrowse", function(up, disabled) {
					getSilverlightObj().DisableBrowse(disabled);
				});
		
				uploader.bind("Destroy", function(up) {
					var silverlightContainer;
					
					plupload.removeAllEvents(document.body, up.id);
					
					delete initialized[up.id];
					delete uploadInstances[up.id];
					
					silverlightContainer = document.getElementById(up.id + '_silverlight_container');
					if (silverlightContainer) {
						container.removeChild(silverlightContainer);
					}
				});

				callback({success : true});
			});
		}
	});
})(window, document, plupload);

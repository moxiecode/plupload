/**
 * plupload.silverlight.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

(function(plupload) {
	var uploadInstances = {};

	function isInstalled(version) {
		var isVersionSupported = false;
		var container = null;

		try {
			var control = null;

			try {
				control = new ActiveXObject('AgControl.AgControl');

				if (version == null)
					isVersionSupported = true;
				else if (control.IsVersionSupported(version))
					isVersionSupported = true;

				control = null;
			} catch (e) {
				var plugin = navigator.plugins["Silverlight Plug-In"];

				if (plugin) {
					if (version === null) {
						isVersionSupported = true;
					} else {
						var actualVer = plugin.description;

						if (actualVer === "1.0.30226.2")
							actualVer = "2.0.30226.2";

						var actualVerArray = actualVer.split(".");

						while (actualVerArray.length > 3)
							actualVerArray.pop();

						while ( actualVerArray.length < 4)
							actualVerArray.push(0);

						var reqVerArray = version.split(".");

						while (reqVerArray.length > 4)
							reqVerArray.pop();

						var requiredVersionPart, actualVersionPart, index = 0;

						do {
							requiredVersionPart = parseInt(reqVerArray[index]);
							actualVersionPart = parseInt(actualVerArray[index]);
							index++;
						} while (index < reqVerArray.length && requiredVersionPart === actualVersionPart);

						if (requiredVersionPart <= actualVersionPart && !isNaN(requiredVersionPart))
							isVersionSupported = true;
					}
				}
			}
		} catch (e) {
			isVersionSupported = false;
		}

		return isVersionSupported;
	};

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
	 * Silverlight implementation.
	 *
	 * @static
	 * @class plupload.SilverlightRuntime
	 * @extends plupload.Runtime
	 */
	plupload.SilverlightRuntime = plupload.addRuntime("silverlight", {
		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize.
		 */
		init : function(uploader, callback) {
			var silverlightContainer;

			// Check if Silverlight is installed
			if (!isInstalled('2.0.31005.0')) {
				callback({success : false});
				return;
			}

			uploadInstances[uploader.id] = uploader;

			// Create silverlight container and insert it at an absolute position within the browse button
			silverlightContainer = document.createElement('div');
			silverlightContainer.id = uploader.id + '_silverlight_container';

			plupload.extend(silverlightContainer.style, {
				position : 'absolute',
				top : '-1000px',
				background : uploader.settings.silverlight_bgcolor || 'transparent',
				width : '1px',
				height : '1px'
			});

			silverlightContainer.className = 'plupload_silverlight';
			document.body.appendChild(silverlightContainer);

			// Insert the Silverlight object inide the Silverlight container
			silverlightContainer.innerHTML = '<object id="' + uploader.id + '_silverlight" data="data:application/x-silverlight," type="application/x-silverlight-2" width="1" height="1">' +
				'<param name="source" value="' + uploader.settings.silverlight_xap_url + '"/>' +
				'<param name="initParams" value="id=' + uploader.id + '"/>' +
				'<param name="onerror" value="onSilverlightError" /></object>';

			function getSilverlightObj() {
				return document.getElementById(uploader.id + '_silverlight').content.Upload;
			};

			uploader.bind("Silverlight:Init", function() {
				var selectedFiles, lookup = {};

				uploader.bind("SelectFiles", function(up) {
					var i, filter = '', filters = up.settings.filters;

					for (i = 0; i < filters.length; i++) 
						filter += (filter != '' ? '|' : '') + filters[i].title + " | *." + filters[i].extensions.replace(/,/g, ';*.');

					selectedFiles = [];
					getSilverlightObj().SelectFiles(filter, up.settings.multi_selection);
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
					uploader.trigger("FilesSelected", selectedFiles);
				});

				uploader.bind("Silverlight:UploadFileProgress", function(up, sl_id, loaded, total) {
					var file = up.getFile(lookup[sl_id]);

					file.loaded = loaded;

					up.trigger('UploadProgress', file);
				});

				uploader.bind("Silverlight:UploadChunkSuccessful", function(up, sl_id, chunk, chunks, text) {
					var chunkArgs, file = up.getFile(lookup[sl_id]);

					chunkArgs = {
						file : file,
						chunk : chunk,
						chunks : chunks,
						response : text
					};

					up.trigger('ChunkUploaded', chunkArgs);

					// Stop upload
					if (chunkArgs.cancelled) {
						getSilverlightObj().CancelUpload();
						file.status = plupload.FAILED;
						up.trigger('FileUploaded', file);
						return;
					}
				});

				uploader.bind("Silverlight:UploadSuccessful", function(up, sl_id) {
					var file = up.getFile(lookup[sl_id]);

					file.status = plupload.DONE;

					up.trigger('FileUploaded', file);
				});

				uploader.bind("FileRemoved", function(up, file) {
					getSilverlightObj().RemoveFile(lookup[file.id]);
				});

				uploader.bind("UploadFile", function(up, file) {
					var url = up.settings.url;

					url += (url.indexOf('?') == -1 ? '?' : '&') + 'name=' + escape(file.target_name || file.name);

					getSilverlightObj().UploadFile(lookup[file.id], url, up.settings.chunk_size);
				});
			});

			callback({success : true});
		}
	});
})(plupload);

/**
 * plupload.flash.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload/license
 * Contributing: http://www.plupload/contributing
 */

(function(plupload) {
	var uploadInstances = {};

	function getFlashVersion() {
		var version;

		try {
			version = navigator.plugins['Shockwave Flash'];
			version = version.description;
		} catch (ex) {
			try {
				version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
			} catch (ex) {
				version = '0.0';
			}
		}

		version = version.match(/\d+/g);

		return parseFloat(version[0] + '.' + version[1]);
	};

	plupload.flash = {
		trigger : function(id, name, obj) {
			// Detach the call so that error handling in the browser is presented correctly
			setTimeout(function() {
				var uploader = uploadInstances[id], i, args;

				if (uploader)
					uploader.trigger('Flash:' + name, obj);
			}, 0);
		}
	};

	/**
	 * FlashRuntime implementation.
	 *
	 * @static
	 * @class plupload.FlashRuntime
	 * @extends plupload.Runtime
	 */
	plupload.FlashRuntime = plupload.addRuntime("flash", {
		/**
		 * Checks if the Flash is installed or not.
		 *
		 * @method isSupported
		 * @return {boolean} true/false if the runtime exists.
		 */
		isSupported : function() {
			return getFlashVersion() >= 10;
		},

		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 */
		init : function(uploader) {
			var browseButton, flashContainer, flashVars;

			uploadInstances[uploader.id] = uploader;

			// Find browse button and set to to be relative
			browseButton = document.getElementById(uploader.settings.browse_button);

			// Create flash container and insert it at an absolute position within the browse button
			flashContainer = document.createElement('div');
			flashContainer.id = uploader.id + '_flash_container';

			plupload.extend(flashContainer.style, {
				position : 'absolute',
				background : uploader.settings.flash_bgcolor || 'transparent',
				width : '100px',
				height : '100px'
			});

			flashContainer.className = 'plupload_flash';
			document.body.appendChild(flashContainer);

			flashVars = 'id=' + escape(uploader.id);

			// Insert the Flash inide the flash container
			flashContainer.innerHTML = '<object id="' + uploader.id + '_flash" width="100%" height="100%" style="outline:0" type="application/x-shockwave-flash" data="' + uploader.settings.flash_swf_url + '">' +
				'<param name="movie" value="' + uploader.settings.flash_swf_url + '" />' +
				'<param name="flashvars" value="' + flashVars + '" />' +
				'<param name="wmode" value="transparent" />' +
				'<param name="allowscriptaccess" value="always" /></object>';

			function getFlashObj() {
				return document.getElementById(uploader.id + '_flash');
			};

			// Fix IE memory leaks
			browseButton = flashContainer = null;

			// Wait for Flash to send init event
			uploader.bind("Flash:Init", function() {
				var lookup = {};

				getFlashObj().setFileFilters(uploader.settings.filters, uploader.settings.multi_selection);

				uploader.bind("UploadFile", function(up, file) {
					var url = up.settings.url;

					url += (url.indexOf('?') == -1 ? '?' : '&') + 'name=' + escape(file.target_name || file.name);

					getFlashObj().uploadFile(lookup[file.id], url, up.settings.chunk_size);
				});

				uploader.bind("Flash:UploadProcess", function(up, flash_file) {
					var file = up.getFile(lookup[flash_file.id]);

					file.loaded = flash_file.loaded;

					up.trigger('UploadProgress', file);
				});

				uploader.bind("Flash:UploadChunkComplete", function(up, info) {
					var chunkArgs, file = up.getFile(lookup[info.id]);

					chunkArgs = {
						file : file,
						chunk : info.chunk,
						chunks : info.chunks,
						response : info.text
					};

					up.trigger('ChunkUploaded', chunkArgs);

					// Stop upload
					if (chunkArgs.cancelled) {
						getFlashObj().cancelUpload();
						file.status = plupload.FAILED;
						up.trigger('FileUploaded', file);
						return;
					}
				});

				uploader.bind("Flash:UploadComplete", function(up, flash_file) {
					var file = up.getFile(lookup[flash_file.id]);

					file.status = plupload.DONE;

					up.trigger('FileUploaded', file);
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

					// trigger FilesSelected event
					uploader.trigger("FilesSelected", files);
				});

				uploader.bind("QueueChanged", function(up) {
					uploader.trigger("Flash:PositionAtBrowseButton");
				});

				uploader.bind("FileRemoved", function(up, file) {
					getFlashObj().removeFile(lookup[file.id]);
				});

				uploader.bind("StateChanged", function(up) {
					uploader.trigger("Flash:PositionAtBrowseButton");
				});
			});

			uploader.bind("Flash:PositionAtBrowseButton", function(up) {
				var browseButton, browsePos;

				browseButton = document.getElementById(up.settings.browse_button);
				browsePos = plupload.getPos(browseButton);

				plupload.extend(document.getElementById(up.id + '_flash_container').style, {
					top : browsePos.y + 'px',
					left : browsePos.x + 'px',
					width : browseButton.clientWidth + 'px',
					height : browseButton.clientHeight + 'px'
				});
			});

			uploader.trigger("Flash:PositionAtBrowseButton");
		}
	});
})(plupload);

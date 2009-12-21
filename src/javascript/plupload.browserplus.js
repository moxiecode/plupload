/**
 * plupload.browserplus.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

(function(plupload) {
	/**
	 * Yahoo BrowserPlus implementation.
	 *
	 * @static
	 * @class plupload.Html5Runtime
	 * @extends plupload.Runtime
	 */
	plupload.BrowserPlusRuntime = plupload.addRuntime("browserplus", {
		/**
		 * Initializes the browserplus runtime.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize.
		 */
		init : function(uploader, callback) {
			var browserPlus = window.BrowserPlus, browserPlusFiles = {}, imageWidth, imageHeight;

			imageWidth = uploader.settings.image_width;
			imageHeight = uploader.settings.image_height;

			// Check for browserplus object
			if (browserPlus) {
				browserPlus.init(function(res) {
					var services = [
						{service: "Uploader", version: "3"},
						{service: "DragAndDrop", version: "1"},
						{service: "FileBrowse", version: "1"}
					];

					if (imageWidth || imageHeight)
						services.push({service : 'ImageAlter', version : "4"});

					if (res.success) {
						browserPlus.require({
							services : services
						}, function() {
							if (res.success)
								setup();
							else
								callback();
						});
					} else
						callback();
				});
			} else
				callback();

			// Setup event listeners if browserplus was initialized
			function setup() {
				uploader.bind("SelectFiles", function(up) {
					var mimeTypes = [], i, a, filters = up.settings.filters, ext;

					// Convert extensions to mimetypes
					for (i = 0; i < filters.length; i++) {
						ext = filters[i].extensions.split(',');

						for (a = 0; a < ext.length; a++)
							mimeTypes.push(plupload.mimeTypes[ext[a]]);
					}

					browserPlus.FileBrowse.OpenBrowseDialog({
						mimeTypes : mimeTypes
					}, function(res) {
						var files, i, selectedFiles = [], file, id;

						if (res.success) {
							files = res.value;

							for (i = 0; i < files.length; i++) {
								file = files[i];
								id = plupload.guid();
								browserPlusFiles[id] = file;

								selectedFiles.push(new plupload.File(id, file.name, file.size));
							}

							uploader.trigger("FilesSelected", selectedFiles);
						}
					});
				});

				uploader.bind("UploadFile", function(up, file) {
					var url = up.settings.url, nativeFile = browserPlusFiles[file.id];

					function uploadFile(native_file) {
						file.size = native_file.size;

						browserPlus.Uploader.upload({
							url : url + (url.indexOf('?') == -1 ? '?' : '&') + '&multipart=true&name=' + escape(file.target_name || file.name),
							files : {file : native_file},
							cookies : document.cookies,
							progressCallback : function(res) {
								file.loaded = res.fileSent;
								up.trigger('UploadProgress', file);
							}
						}, function(res) {
							if (res.success) {
								file.status = plupload.DONE;
								up.trigger('FileUploaded', file);
							}
						});
					};

					if (/\.(png|jpg|jpeg)$/i.test(file.name) && (imageWidth || imageHeight)) {
						BrowserPlus.ImageAlter.transform({
							file : nativeFile,
							quality : up.settings.image_quality,
							actions : [{
								scale : {
									maxwidth : imageWidth,
									maxheight : imageHeight
								}
							}]
						}, function(res) {
							if (res.success)
								uploadFile(res.value.file);
						});
					} else
						uploadFile(nativeFile);
				});

				callback({success : true});
			};
		}
	});
})(plupload);

/**
 * plupload.gears.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload/license
 * Contributing: http://www.plupload/contributing
 */

(function(plupload) {
	var blobs = {};

	/**
	 * Gears implementation.
	 *
	 * @static
	 * @class plupload.GearsRuntime
	 * @extends plupload.Runtime
	 */
	plupload.GearsRuntime = plupload.addRuntime("gears", {
		/**
		 * Checks if the Google Gears is installed or not.
		 *
		 * @method isSupported
		 * @return {boolean} true/false if the runtime exists.
		 */
		isSupported : function() {
			return !!(window.google && google.gears);
		},

		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 */
		init : function(uploader) {
			uploader.bind("UploadFile", function(up, file) {
				var chunk = 0, chunks, chunkSize, loaded = 0;

				chunkSize = up.settings.chunk_size;
				chunks = Math.ceil(file.size / chunkSize);

				// Start uploading chunks
				uploadNextChunk();

				function uploadNextChunk() {
					var url = up.settings.url, req, curChunkSize;

					// File upload finished
					if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED)
						return;

					curChunkSize = Math.min(chunkSize, file.size - (chunk  * chunkSize));

					req = google.gears.factory.create('beta.httprequest');
					req.open('POST', url + (url.indexOf('?') == -1 ? '?' : '&') + 'name=' + escape(file.target_name || file.name) + '&chunk=' + chunk + '&chunks=' + chunks);

					req.setRequestHeader('Content-Disposition', 'attachment; filename="' + file.name + '"');
					req.setRequestHeader('Content-Type', 'application/octet-stream');

					req.upload.onprogress = function(progress) {
						file.loaded = loaded + progress.loaded;
						up.trigger('UploadProgress', file);
					};

					req.onreadystatechange = function() {
						var chunkArgs;

						if (req.readyState == 4) {
							if (req.status == 200) {
								chunkArgs = {
									file : file,
									chunk : chunk,
									chunks : chunks,
									response : req.responseText
								};

								up.trigger('ChunkUploaded', chunkArgs);

								// Stop upload
								if (chunkArgs.cancelled) {
									file.status = plupload.FAILED;
									up.trigger('FileUploaded', file);
									return;
								}

								loaded += curChunkSize;

								if (++chunk >= chunks) {
									file.status = plupload.DONE;
									up.trigger('FileUploaded', file);
								} else
									uploadNextChunk();
							} else
								up.trigger('UploadChunkError', {file : file, chunk : chunk, chunks : chunks, error : 'Status: ' + req.status});
						}
					};

					if (chunk < chunks)
						req.send(blobs[file.id].slice(chunk * chunkSize, curChunkSize));
				};
			});

			uploader.bind("SelectFiles", function(up) {
				var desk = google.gears.factory.create('beta.desktop'), filters = [], i, a;

				for (i = 0; i < up.settings.filters.length; i++) {
					ext = up.settings.filters[i].extensions.split(';');

					for (a = 0; a < ext.length; a++)
						filters.push(ext[a].replace(/^[^.]+\./, '.'));
				}

				desk.openFiles(function(selected_files) {
					var file, i, files = [], id;

					// Add the selected files to the file queue
					for (i = 0; i < selected_files.length; i++) {
						file = selected_files[i];

						// Store away gears blob internally
						id = plupload.guid();
						blobs[id] = file.blob;

						files.push(new plupload.File(id, file.name, file.blob.length));
					}

					// Fire FilesSelected event
					uploader.trigger("FilesSelected", files);
				}, {singleFile : !up.settings.multi_selection, filter : filters});
			});
		}
	});
})(plupload);

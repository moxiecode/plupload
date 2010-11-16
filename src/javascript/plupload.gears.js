/**
 * plupload.gears.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

// JSLint defined globals
/*global plupload:false, google:false, window:false */

(function(plupload) {
	var blobs = {};

	function scaleImage(image_blob, width, height, quality, mime) {
		var percentage, canvas, context, scale;

		// Setup canvas and scale
		canvas = google.gears.factory.create('beta.canvas');
		try {
			canvas.decode(image_blob);
			scale = Math.min(width / canvas.width, height / canvas.height);

			if (scale < 1) {
				canvas.resize(Math.round(canvas.width * scale), Math.round(canvas.height * scale));

				return canvas.encode(mime, {quality : quality / 100});
			}
		} catch (e) {
			// Ignore for example when a user uploads a file that can't be decoded
		}

		return image_blob;
	}

	/**
	 * Gears implementation. This runtime supports these features: dragdrop, jpgresize, pngresize, chunks.
	 *
	 * @static
	 * @class plupload.runtimes.Gears
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Gears = plupload.addRuntime("gears", {
		/**
		 * Returns a list of supported features for the runtime.
		 *
		 * @return {Object} Name/value object with supported features.
		 */
		getFeatures : function() {
			return {
				dragdrop: true,
				jpgresize: true,
				pngresize: true,
				chunks: true,
				progress: true,
				multipart: true
			};
		},

		/**
		 * Initializes the upload runtime.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			var desktop;

			// Check for gears support
			if (!window.google || !google.gears) {
				return callback({success : false});
			}

			try {
				desktop = google.gears.factory.create('beta.desktop');
			} catch (e) {
				// Might fail on the latest Gecko build for some odd reason
				return callback({success : false});
			}

			function addSelectedFiles(selected_files) {
				var file, i, files = [], id;

				// Add the selected files to the file queue
				for (i = 0; i < selected_files.length; i++) {
					file = selected_files[i];

					// Store away gears blob internally
					id = plupload.guid();
					blobs[id] = file.blob;

					files.push(new plupload.File(id, file.name, file.blob.length));
				}

				// Fire FilesAdded event
				uploader.trigger("FilesAdded", files);
			}

			// Add drop handler
			uploader.bind("PostInit", function() {
				var settings = uploader.settings, dropElm = document.getElementById(settings.drop_element);

				if (dropElm) {
					// Block browser default drag over
					plupload.addEvent(dropElm, 'dragover', function(e) {
						desktop.setDropEffect(e, 'copy');
						e.preventDefault();
					});

					// Attach drop handler and grab files from Gears
					plupload.addEvent(dropElm, 'drop', function(e) {
						var dragData = desktop.getDragData(e, 'application/x-gears-files');

						if (dragData) {
							addSelectedFiles(dragData.files);
						}

						e.preventDefault();
					});

					// Prevent IE leak
					dropElm = 0;
				}

				// Add browse button
				plupload.addEvent(document.getElementById(settings.browse_button), 'click', function(e) {
					var filters = [], i, a, ext;

					e.preventDefault();

					for (i = 0; i < settings.filters.length; i++) {
						ext = settings.filters[i].extensions.split(',');

						for (a = 0; a < ext.length; a++) {
							filters.push('.' + ext[a]);
						}
					}

					desktop.openFiles(addSelectedFiles, {singleFile : !settings.multi_selection, filter : filters});
				});
			});

			uploader.bind("UploadFile", function(up, file) {
				var chunk = 0, chunks, chunkSize, loaded = 0, resize = up.settings.resize, chunking;

				// If file is png or jpeg and resize is configured then resize it
				if (resize && /\.(png|jpg|jpeg)$/i.test(file.name)) {
					blobs[file.id] = scaleImage(blobs[file.id], resize.width, resize.height, resize.quality || 90, /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg');
				}

				file.size = blobs[file.id].length;

				chunkSize = up.settings.chunk_size;
				chunking = chunkSize > 0;
				chunks = Math.ceil(file.size / chunkSize);

				// If chunking is disabled then upload the whole file in one huge chunk
				if (!chunking) {
					chunkSize = file.size;
					chunks = 1;
				}

				function uploadNextChunk() {
					var req, curChunkSize, multipart = up.settings.multipart, multipartLength = 0, reqArgs = {name : file.target_name || file.name}, url = up.settings.url;

					// Sends the binary blob multipart encoded or raw depending on config
					function sendBinaryBlob(blob) {
						var builder, boundary = '----pluploadboundary' + plupload.guid(), dashdash = '--', crlf = '\r\n', multipartBlob, mimeType;

						// Build multipart request
						if (multipart) {
							req.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
							builder = google.gears.factory.create('beta.blobbuilder');

							// Append mutlipart parameters
							plupload.each(plupload.extend(reqArgs, up.settings.multipart_params), function(value, name) {
								builder.append(
									dashdash + boundary + crlf +
									'Content-Disposition: form-data; name="' + name + '"' + crlf + crlf
								);

								builder.append(value + crlf);
							});

							mimeType = plupload.mimeTypes[file.name.replace(/^.+\.([^.]+)/, '$1')] || 'application/octet-stream';

							// Add file header
							builder.append(
								dashdash + boundary + crlf +
								'Content-Disposition: form-data; name="' + up.settings.file_data_name + '"; filename="' + file.name + '"' + crlf +
								'Content-Type: ' + mimeType + crlf + crlf
							);

							// Add file data
							builder.append(blob);

							// Add footer
							builder.append(crlf + dashdash + boundary + dashdash + crlf);
							multipartBlob = builder.getAsBlob();
							multipartLength = multipartBlob.length - blob.length;
							blob = multipartBlob;
						}

						// Send blob or multipart blob depending on config
						req.send(blob);
					}

					// File upload finished
					if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
						return;
					}

					// Only add chunking args if needed
					if (chunking) {
						reqArgs.chunk = chunk;
						reqArgs.chunks = chunks;
					}

					// Setup current chunk size
					curChunkSize = Math.min(chunkSize, file.size - (chunk  * chunkSize));

					if (!multipart) {
						url = plupload.buildUrl(up.settings.url, reqArgs);
					}

					req = google.gears.factory.create('beta.httprequest');
					req.open('POST', url);

					// Add disposition and type if multipart is disabled
					if (!multipart) {
						req.setRequestHeader('Content-Disposition', 'attachment; filename="' + file.name + '"');
						req.setRequestHeader('Content-Type', 'application/octet-stream');
					}

					// Set custom headers
					plupload.each(up.settings.headers, function(value, name) {
						req.setRequestHeader(name, value);
					});

					req.upload.onprogress = function(progress) {
						file.loaded = loaded + progress.loaded - multipartLength;
						up.trigger('UploadProgress', file);
					};

					req.onreadystatechange = function() {
						var chunkArgs;

						if (req.readyState == 4) {
							if (req.status == 200) {
								chunkArgs = {
									chunk : chunk,
									chunks : chunks,
									response : req.responseText,
									status : req.status
								};

								up.trigger('ChunkUploaded', file, chunkArgs);

								// Stop upload
								if (chunkArgs.cancelled) {
									file.status = plupload.FAILED;
									return;
								}

								loaded += curChunkSize;

								if (++chunk >= chunks) {
									file.status = plupload.DONE;
									up.trigger('FileUploaded', file, {
										response : req.responseText,
										status : req.status
									});
								} else {
									uploadNextChunk();
								}
							} else {
								up.trigger('Error', {
									code : plupload.HTTP_ERROR,
									message : 'HTTP Error.',
									file : file,
									chunk : chunk,
									chunks : chunks,
									status : req.status
								});
							}
						}
					};

					if (chunk < chunks) {
						sendBinaryBlob(blobs[file.id].slice(chunk * chunkSize, curChunkSize));
					}
				}

				// Start uploading chunks
				uploadNextChunk();
			});

			callback({success : true});
		}
	});
})(plupload);

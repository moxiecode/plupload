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
/*global window:false, document:false, plupload:false, google:false, GearsFactory:false, ActiveXObject:false */

// Copyright 2007, Google Inc.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  1. Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation
//     and/or other materials provided with the distribution.
//  3. Neither the name of Google Inc. nor the names of its contributors may be
//     used to endorse or promote products derived from this software without
//     specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
// EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
// OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
// OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Sets up google.gears.*, which is *the only* supported way to access Gears.
//
// Circumvent this file at your own risk!
//
// In the future, Gears may automatically define google.gears.* without this
// file. Gears may use these objects to transparently fix bugs and compatibility
// issues. Applications that use the code below will continue to work seamlessly
// when that happens.

(function() {
  // We are already defined. Hooray!
  if (window.google && google.gears) {
    return;
  }

  var factory = null;

  // Firefox
  if (typeof GearsFactory != 'undefined') {
    factory = new GearsFactory();
  } else {
    // IE
    try {
      factory = new ActiveXObject('Gears.Factory');
      // privateSetGlobalObject is only required and supported on WinCE.
      if (factory.getBuildInfo().indexOf('ie_mobile') != -1) {
        factory.privateSetGlobalObject(this);
      }
    } catch (e) {
      // Safari
      if ((typeof navigator.mimeTypes != 'undefined') && navigator.mimeTypes["application/x-googlegears"]) {
        factory = document.createElement("object");
        factory.style.display = "none";
        factory.width = 0;
        factory.height = 0;
        factory.type = "application/x-googlegears";
        document.documentElement.appendChild(factory);
      }
    }
  }

  // *Do not* define any objects if Gears is not installed. This mimics the
  // behavior of Gears defining the objects in the future.
  if (!factory) {
    return;
  }

  // Now set up the objects, being careful not to overwrite anything.
  //
  // Note: In Internet Explorer for Windows Mobile, you can't add properties to
  // the window object. However, global objects are automatically added as
  // properties of the window object in all browsers.
  if (!window.google) {
    window.google = {};
  }

  if (!google.gears) {
    google.gears = {factory: factory};
  }
})();

(function(window, document, plupload, undef) {
	var blobs = {};

	function scaleImage(image_blob, resize, mime) {
		var percentage, canvas, context, scale;

		// Setup canvas and scale
		canvas = google.gears.factory.create('beta.canvas');
		try {
			canvas.decode(image_blob);
			
			if (!resize['width']) {
				resize['width'] = canvas.width;
			}
			
			if (!resize['height']) {
				resize['height'] = canvas.height;	
			}
			
			scale = Math.min(width / canvas.width, height / canvas.height);

			if (scale < 1 || (scale === 1 && mime === 'image/jpeg')) {
				canvas.resize(Math.round(canvas.width * scale), Math.round(canvas.height * scale));
				
				if (resize['quality']) {
					return canvas.encode(mime, {quality : resize.quality / 100});
				}

				return canvas.encode(mime);
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
				multipart: true,
				multi_selection: true
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
			var desktop, req, disabled = false;

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
					}, uploader.id);

					// Attach drop handler and grab files from Gears
					plupload.addEvent(dropElm, 'drop', function(e) {
						var dragData = desktop.getDragData(e, 'application/x-gears-files');

						if (dragData) {
							addSelectedFiles(dragData.files);
						}

						e.preventDefault();
					}, uploader.id);

					// Prevent IE leak
					dropElm = 0;
				}

				// Add browse button
				plupload.addEvent(document.getElementById(settings.browse_button), 'click', function(e) {
					var filters = [], i, a, ext;

					e.preventDefault();
					
					if (disabled) {
						return;	
					}
					
					no_type_restriction:
					for (i = 0; i < settings.filters.length; i++) {
						ext = settings.filters[i].extensions.split(',');

						for (a = 0; a < ext.length; a++) {
							if (ext[a] === '*') {
								filters = [];
								break no_type_restriction;
							}
							
							filters.push('.' + ext[a]);
						}
					}

					desktop.openFiles(addSelectedFiles, {singleFile : !settings.multi_selection, filter : filters});
				}, uploader.id);
			});
			
			
			uploader.bind("CancelUpload", function() {
				if (req.abort) {
					req.abort();	
				}
			});
			

			uploader.bind("UploadFile", function(up, file) {
				var chunk = 0, chunks, chunkSize, loaded = 0, resize = up.settings.resize, chunking;

				// If file is png or jpeg and resize is configured then resize it
				if (resize && /\.(png|jpg|jpeg)$/i.test(file.name)) {
					blobs[file.id] = scaleImage(blobs[file.id], resize, /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg');
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
					var curChunkSize, multipart = up.settings.multipart, multipartLength = 0, reqArgs = {name : file.target_name || file.name}, url = up.settings.url;

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

							mimeType = plupload.mimeTypes[file.name.replace(/^.+\.([^.]+)/, '$1').toLowerCase()] || 'application/octet-stream';

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

						if (req.readyState == 4 && up.state !== plupload.STOPPED) {
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
									message : plupload.translate('HTTP Error.'),
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
			
			uploader.bind("DisableBrowse", function(up, state) {
				disabled = state;
			});
			
			
			uploader.bind("Destroy", function(up) {
				var name, element,
					elements = {		
						browseButton:	up.settings.browse_button, 
						dropElm:		up.settings.drop_element	
					};
				
				// Unbind event handlers
				for (name in elements) {
					element = document.getElementById(elements[name]);
					if (element) {
						plupload.removeAllEvents(element, up.id);
					}
				}
			});
			

			callback({success : true});
		}
	});
})(window, document, plupload);

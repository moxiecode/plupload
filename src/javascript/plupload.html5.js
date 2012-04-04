/**
 * plupload.html5.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

// JSLint defined globals
/*global plupload:false, File:false, window:false, atob:false, FormData:false, FileReader:false, ArrayBuffer:false, Uint8Array:false, BlobBuilder:false, unescape:false */

(function(window, document, plupload, undef) {
	var html5files = {}, // queue of original File objects
		fakeSafariDragDrop;

	function readFileAsDataURL(file, callback) {
		var reader;

		// Use FileReader if it's available
		if ("FileReader" in window) {
			reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = function() {
				callback(reader.result);
			};
		} else {
			return callback(file.getAsDataURL());
		}
	}

	function readFileAsBinary(file, callback) {
		var reader;

		// Use FileReader if it's available
		if ("FileReader" in window) {
			reader = new FileReader();
			reader.readAsBinaryString(file);
			reader.onload = function() {
				callback(reader.result);
			};
		} else {
			return callback(file.getAsBinary());
		}
	}

	function scaleImage(file, resize, mime, callback) {
		var canvas, context, img, scale,
			up = this;
			
		readFileAsDataURL(html5files[file.id], function(data) {
			// Setup canvas and context
			canvas = document.createElement("canvas");
			canvas.style.display = 'none';
			document.body.appendChild(canvas);
			context = canvas.getContext('2d');

			// Load image
			img = new Image();
			img.onerror = img.onabort = function() {
				// Failed to load, the image may be invalid
				callback({success : false});
			};
			img.onload = function() {
				var width, height, percentage, jpegHeaders, exifParser;
				
				if (!resize['width']) {
					resize['width'] = img.width;
				}
				
				if (!resize['height']) {
					resize['height'] = img.height;	
				}
				
				scale = Math.min(resize.width / img.width, resize.height / img.height);

				if (scale < 1 || (scale === 1 && mime === 'image/jpeg')) {
					width = Math.round(img.width * scale);
					height = Math.round(img.height * scale);

					// Scale image and canvas
					canvas.width = width;
					canvas.height = height;
					context.drawImage(img, 0, 0, width, height);
					
					// Preserve JPEG headers
					if (mime === 'image/jpeg') {
						jpegHeaders = new JPEG_Headers(atob(data.substring(data.indexOf('base64,') + 7)));
						if (jpegHeaders['headers'] && jpegHeaders['headers'].length) {
							exifParser = new ExifParser();			
											
							if (exifParser.init(jpegHeaders.get('exif')[0])) {
								// Set new width and height
								exifParser.setExif('PixelXDimension', width);
								exifParser.setExif('PixelYDimension', height);
																							
								// Update EXIF header
								jpegHeaders.set('exif', exifParser.getBinary());
								
								// trigger Exif events only if someone listens to them
								if (up.hasEventListener('ExifData')) {
									up.trigger('ExifData', file, exifParser.EXIF());
								}
								
								if (up.hasEventListener('GpsData')) {
									up.trigger('GpsData', file, exifParser.GPS());
								}
							}
						}
						
						if (resize['quality']) {							
							// Try quality property first
							try {
								data = canvas.toDataURL(mime, resize['quality'] / 100);	
							} catch (e) {
								data = canvas.toDataURL(mime);	
							}
						}
					} else {
						data = canvas.toDataURL(mime);
					}

					// Remove data prefix information and grab the base64 encoded data and decode it
					data = data.substring(data.indexOf('base64,') + 7);
					data = atob(data);

					// Restore JPEG headers if applicable
					if (jpegHeaders && jpegHeaders['headers'] && jpegHeaders['headers'].length) {
						data = jpegHeaders.restore(data);
						jpegHeaders.purge(); // free memory
					}

					// Remove canvas and execute callback with decoded image data
					canvas.parentNode.removeChild(canvas);
					callback({success : true, data : data});
				} else {
					// Image does not need to be resized
					callback({success : false});
				}
			};

			img.src = data;
		});
	}

	/**
	 * HMTL5 implementation. This runtime supports these features: dragdrop, jpgresize, pngresize.
	 *
	 * @static
	 * @class plupload.runtimes.Html5
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Html5 = plupload.addRuntime("html5", {
		/**
		 * Returns a list of supported features for the runtime.
		 *
		 * @return {Object} Name/value object with supported features.
		 */
		getFeatures : function() {
			var xhr, hasXhrSupport, hasProgress, canSendBinary, dataAccessSupport, sliceSupport;

			hasXhrSupport = hasProgress = dataAccessSupport = sliceSupport = false;
			
			if (window.XMLHttpRequest) {
				xhr = new XMLHttpRequest();
				hasProgress = !!xhr.upload;
				hasXhrSupport = !!(xhr.sendAsBinary || xhr.upload);
			}

			// Check for support for various features
			if (hasXhrSupport) {
				canSendBinary = !!(xhr.sendAsBinary || (window.Uint8Array && window.ArrayBuffer));
				
				// Set dataAccessSupport only for Gecko since BlobBuilder and XHR doesn't handle binary data correctly				
				dataAccessSupport = !!(File && (File.prototype.getAsDataURL || window.FileReader) && canSendBinary);
				sliceSupport = !!(File && (File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice)); 
			}

			// sniff out Safari for Windows and fake drag/drop
			fakeSafariDragDrop = plupload.ua.safari && plupload.ua.windows;

			return {
				html5: hasXhrSupport, // This is a special one that we check inside the init call
				dragdrop: (function() {
					// this comes directly from Modernizr: http://www.modernizr.com/
					var div = document.createElement('div');
					return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
				}()),
				jpgresize: dataAccessSupport,
				pngresize: dataAccessSupport,
				multipart: dataAccessSupport || !!window.FileReader || !!window.FormData,
				canSendBinary: canSendBinary,
				// gecko 2/5/6 can't send blob with FormData: https://bugzilla.mozilla.org/show_bug.cgi?id=649150 
				cantSendBlobInFormData: !!(plupload.ua.gecko && window.FormData && window.FileReader && !FileReader.prototype.readAsArrayBuffer),
				progress: hasProgress,
				chunks: sliceSupport,
				// Safari on Windows has problems when selecting multiple files
				multi_selection: !(plupload.ua.safari && plupload.ua.windows),
				// WebKit and Gecko 2+ can trigger file dialog progrmmatically
				triggerDialog: (plupload.ua.gecko && window.FormData || plupload.ua.webkit) 
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
			var features, xhr;

			function addSelectedFiles(native_files) {
				var file, i, files = [], id, fileNames = {};

				// Add the selected files to the file queue
				for (i = 0; i < native_files.length; i++) {
					file = native_files[i];
										
					// Safari on Windows will add first file from dragged set multiple times
					// @see: https://bugs.webkit.org/show_bug.cgi?id=37957
					if (fileNames[file.name]) {
						continue;
					}
					fileNames[file.name] = true;

					// Store away gears blob internally
					id = plupload.guid();
					html5files[id] = file;

					// Expose id, name and size
					files.push(new plupload.File(id, file.fileName || file.name, file.fileSize || file.size)); // fileName / fileSize depricated
				}

				// Trigger FilesAdded event if we added any
				if (files.length) {
					uploader.trigger("FilesAdded", files);
				}
			}

			// No HTML5 upload support
			features = this.getFeatures();
			if (!features.html5) {
				callback({success : false});
				return;
			}

			uploader.bind("Init", function(up) {
				var inputContainer, browseButton, mimes = [], i, y, filters = up.settings.filters, ext, type, container = document.body, inputFile;

				// Create input container and insert it at an absolute position within the browse button
				inputContainer = document.createElement('div');
				inputContainer.id = up.id + '_html5_container';

				plupload.extend(inputContainer.style, {
					position : 'absolute',
					background : uploader.settings.shim_bgcolor || 'transparent',
					width : '100px',
					height : '100px',
					overflow : 'hidden',
					zIndex : 99999,
					opacity : uploader.settings.shim_bgcolor ? '' : 0 // Force transparent if bgcolor is undefined
				});
				inputContainer.className = 'plupload html5';

				if (uploader.settings.container) {
					container = document.getElementById(uploader.settings.container);
					if (plupload.getStyle(container, 'position') === 'static') {
						container.style.position = 'relative';
					}
				}

				container.appendChild(inputContainer);
				
				// Convert extensions to mime types list
				no_type_restriction:
				for (i = 0; i < filters.length; i++) {
					ext = filters[i].extensions.split(/,/);

					for (y = 0; y < ext.length; y++) {
						
						// If there's an asterisk in the list, then accept attribute is not required
						if (ext[y] === '*') {
							mimes = [];
							break no_type_restriction;
						}
						
						type = plupload.mimeTypes[ext[y]];

						if (type && plupload.inArray(type, mimes) === -1) {
							mimes.push(type);
						}
					}
				}


				// Insert the input inside the input container
				inputContainer.innerHTML = '<input id="' + uploader.id + '_html5" ' + ' style="font-size:999px"' +
											' type="file" accept="' + mimes.join(',') + '" ' +
											(uploader.settings.multi_selection && uploader.features.multi_selection ? 'multiple="multiple"' : '') + ' />';

				inputContainer.scrollTop = 100;
				inputFile = document.getElementById(uploader.id + '_html5');
				
				if (up.features.triggerDialog) {
					plupload.extend(inputFile.style, {
						position: 'absolute',
						width: '100%',
						height: '100%'
					});
				} else {
					// shows arrow cursor instead of the text one, bit more logical
					plupload.extend(inputFile.style, {
						cssFloat: 'right', 
						styleFloat: 'right'
					});
				}
				
				inputFile.onchange = function() {
					// Add the selected files from file input
					addSelectedFiles(this.files);
					
					// Clearing the value enables the user to select the same file again if they want to
					this.value = '';
				};
				
				/* Since we have to place input[type=file] on top of the browse_button for some browsers (FF, Opera),
				browse_button loses interactivity, here we try to neutralize this issue highlighting browse_button
				with a special classes
				TODO: needs to be revised as things will change */
				browseButton = document.getElementById(up.settings.browse_button);
				if (browseButton) {				
					var hoverClass = up.settings.browse_button_hover,
						activeClass = up.settings.browse_button_active,
						topElement = up.features.triggerDialog ? browseButton : inputContainer;
					
					if (hoverClass) {
						plupload.addEvent(topElement, 'mouseover', function() {
							plupload.addClass(browseButton, hoverClass);	
						}, up.id);
						plupload.addEvent(topElement, 'mouseout', function() {
							plupload.removeClass(browseButton, hoverClass);	
						}, up.id);
					}
					
					if (activeClass) {
						plupload.addEvent(topElement, 'mousedown', function() {
							plupload.addClass(browseButton, activeClass);	
						}, up.id);
						plupload.addEvent(document.body, 'mouseup', function() {
							plupload.removeClass(browseButton, activeClass);	
						}, up.id);
					}

					// Route click event to the input[type=file] element for supporting browsers
					if (up.features.triggerDialog) {
						plupload.addEvent(browseButton, 'click', function(e) {
							var input = document.getElementById(up.id + '_html5');
							if (input && !input.disabled) { // for some reason FF (up to 8.0.1 so far) lets to click disabled input[type=file]
								input.click();
							}
							e.preventDefault();
						}, up.id); 
					}
				}
			});

			// Add drop handler
			uploader.bind("PostInit", function() {
				var dropElm = document.getElementById(uploader.settings.drop_element);

				if (dropElm) {
					// Lets fake drag/drop on Safari by moving a input type file in front of the mouse pointer when we drag into the drop zone
					// TODO: Remove this logic once Safari has official drag/drop support
					if (fakeSafariDragDrop) {
						plupload.addEvent(dropElm, 'dragenter', function(e) {
							var dropInputElm, dropPos, dropSize;

							// Get or create drop zone
							dropInputElm = document.getElementById(uploader.id + "_drop");
							if (!dropInputElm) {
								dropInputElm = document.createElement("input");
								dropInputElm.setAttribute('type', "file");
								dropInputElm.setAttribute('id', uploader.id + "_drop");
								dropInputElm.setAttribute('multiple', 'multiple');

								plupload.addEvent(dropInputElm, 'change', function() {
									// Add the selected files from file input
									addSelectedFiles(this.files);
																		
									// Remove input element
									plupload.removeEvent(dropInputElm, 'change', uploader.id);
									dropInputElm.parentNode.removeChild(dropInputElm);									
								}, uploader.id);
								
								dropElm.appendChild(dropInputElm);
							}

							dropPos = plupload.getPos(dropElm, document.getElementById(uploader.settings.container));
							dropSize = plupload.getSize(dropElm);
							
							if (plupload.getStyle(dropElm, 'position') === 'static') {
								plupload.extend(dropElm.style, {
									position : 'relative'
								});
							}
              
							plupload.extend(dropInputElm.style, {
								position : 'absolute',
								display : 'block',
								top : 0,
								left : 0,
								width : dropSize.w + 'px',
								height : dropSize.h + 'px',
								opacity : 0
							});							
						}, uploader.id);

						return;
					}

					// Block browser default drag over
					plupload.addEvent(dropElm, 'dragover', function(e) {
						e.preventDefault();
					}, uploader.id);

					// Attach drop handler and grab files
					plupload.addEvent(dropElm, 'drop', function(e) {
						var dataTransfer = e.dataTransfer;

						// Add dropped files
						if (dataTransfer && dataTransfer.files) {
							addSelectedFiles(dataTransfer.files);
						}

						e.preventDefault();
					}, uploader.id);
				}
			});

			uploader.bind("Refresh", function(up) {
				var browseButton, browsePos, browseSize, inputContainer, zIndex;
					
				browseButton = document.getElementById(uploader.settings.browse_button);
				if (browseButton) {
					browsePos = plupload.getPos(browseButton, document.getElementById(up.settings.container));
					browseSize = plupload.getSize(browseButton);
					inputContainer = document.getElementById(uploader.id + '_html5_container');
	
					plupload.extend(inputContainer.style, {
						top : browsePos.y + 'px',
						left : browsePos.x + 'px',
						width : browseSize.w + 'px',
						height : browseSize.h + 'px'
					});
					
					// for WebKit place input element underneath the browse button and route onclick event 
					// TODO: revise when browser support for this feature will change
					if (uploader.features.triggerDialog) {
						if (plupload.getStyle(browseButton, 'position') === 'static') {
							plupload.extend(browseButton.style, {
								position : 'relative'
							});
						}
						
						zIndex = parseInt(plupload.getStyle(browseButton, 'z-index'), 10);
						if (isNaN(zIndex)) {
							zIndex = 0;
						}						
							
						plupload.extend(browseButton.style, {
							zIndex : zIndex
						});						
											
						plupload.extend(inputContainer.style, {
							zIndex : zIndex - 1
						});
					}				
				}
			});
			
			uploader.bind("DisableBrowse", function(up, disabled) {
				var input = document.getElementById(up.id + '_html5');
				if (input) {
					input.disabled = disabled;	
				}
			});
			
			uploader.bind("CancelUpload", function() {
				if (xhr && xhr.abort) {
					xhr.abort();	
				}
			});

			uploader.bind("UploadFile", function(up, file) {
				var settings = up.settings, nativeFile, resize;
					
				function w3cBlobSlice(blob, start, end) {
					var blobSlice;
					
					if (File.prototype.slice) {
						try {
							blob.slice();	// depricated version will throw WRONG_ARGUMENTS_ERR exception
							return blob.slice(start, end);
						} catch (e) {
							// depricated slice method
							return blob.slice(start, end - start); 
						}
					// slice method got prefixed: https://bugzilla.mozilla.org/show_bug.cgi?id=649672	
					} else if (blobSlice = File.prototype.webkitSlice || File.prototype.mozSlice) {
						return blobSlice.call(blob, start, end);	
					} else {
						return null; // or throw some exception	
					}
				}	

				function sendBinaryBlob(blob) {
					var chunk = 0, loaded = 0,
						fr = ("FileReader" in window) ? new FileReader : null;
						

					function uploadNextChunk() {
						var chunkBlob, br, chunks, args, chunkSize, curChunkSize, mimeType, url = up.settings.url;													

						
						function prepareAndSend(bin) {
							var multipartDeltaSize = 0,
								boundary = '----pluploadboundary' + plupload.guid(), formData, dashdash = '--', crlf = '\r\n', multipartBlob = '';
								
							xhr = new XMLHttpRequest;
															
							// Do we have upload progress support
							if (xhr.upload) {
								xhr.upload.onprogress = function(e) {
									file.loaded = Math.min(file.size, loaded + e.loaded - multipartDeltaSize); // Loaded can be larger than file size due to multipart encoding
									up.trigger('UploadProgress', file);
								};
							}
	
							xhr.onreadystatechange = function() {
								var httpStatus, chunkArgs;
																	
								if (xhr.readyState == 4 && up.state !== plupload.STOPPED) {
									// Getting the HTTP status might fail on some Gecko versions
									try {
										httpStatus = xhr.status;
									} catch (ex) {
										httpStatus = 0;
									}
	
									// Is error status
									if (httpStatus >= 400) {
										up.trigger('Error', {
											code : plupload.HTTP_ERROR,
											message : plupload.translate('HTTP Error.'),
											file : file,
											status : httpStatus
										});
									} else {
										// Handle chunk response
										if (chunks) {
											chunkArgs = {
												chunk : chunk,
												chunks : chunks,
												response : xhr.responseText,
												status : httpStatus
											};
	
											up.trigger('ChunkUploaded', file, chunkArgs);
											loaded += curChunkSize;
	
											// Stop upload
											if (chunkArgs.cancelled) {
												file.status = plupload.FAILED;
												return;
											}
	
											file.loaded = Math.min(file.size, (chunk + 1) * chunkSize);
										} else {
											file.loaded = file.size;
										}
	
										up.trigger('UploadProgress', file);
										
										bin = chunkBlob = formData = multipartBlob = null; // Free memory
										
										// Check if file is uploaded
										if (!chunks || ++chunk >= chunks) {
											file.status = plupload.DONE;
																						
											up.trigger('FileUploaded', file, {
												response : xhr.responseText,
												status : httpStatus
											});										
										} else {										
											// Still chunks left
											uploadNextChunk();
										}
									}																	
								}
							};
							
	
							// Build multipart request
							if (up.settings.multipart && features.multipart) {
								
								args.name = file.target_name || file.name;
								
								xhr.open("post", url, true);
								
								// Set custom headers
								plupload.each(up.settings.headers, function(value, name) {
									xhr.setRequestHeader(name, value);
								});
								
								
								// if has FormData support like Chrome 6+, Safari 5+, Firefox 4, use it
								if (typeof(bin) !== 'string' && !!window.FormData) {
									formData = new FormData();
	
									// Add multipart params
									plupload.each(plupload.extend(args, up.settings.multipart_params), function(value, name) {
										formData.append(name, value);
									});
	
									// Add file and send it
									formData.append(up.settings.file_data_name, bin);								
									xhr.send(formData);
	
									return;
								}  // if no FormData we can still try to send it directly as last resort (see below)
								
								
								if (typeof(bin) === 'string') {
									// Trying to send the whole thing as binary...
		
									// multipart request
									xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
		
									// append multipart parameters
									plupload.each(plupload.extend(args, up.settings.multipart_params), function(value, name) {
										multipartBlob += dashdash + boundary + crlf +
											'Content-Disposition: form-data; name="' + name + '"' + crlf + crlf;
		
										multipartBlob += unescape(encodeURIComponent(value)) + crlf;
									});
		
									mimeType = plupload.mimeTypes[file.name.replace(/^.+\.([^.]+)/, '$1').toLowerCase()] || 'application/octet-stream';
		
									// Build RFC2388 blob
									multipartBlob += dashdash + boundary + crlf +
										'Content-Disposition: form-data; name="' + up.settings.file_data_name + '"; filename="' + unescape(encodeURIComponent(file.name)) + '"' + crlf +
										'Content-Type: ' + mimeType + crlf + crlf +
										bin + crlf +
										dashdash + boundary + dashdash + crlf;
		
									multipartDeltaSize = multipartBlob.length - bin.length;
									bin = multipartBlob;
								
							
									if (xhr.sendAsBinary) { // Gecko
										xhr.sendAsBinary(bin);
									} else if (features.canSendBinary) { // WebKit with typed arrays support
										var ui8a = new Uint8Array(bin.length);
										for (var i = 0; i < bin.length; i++) {
											ui8a[i] = (bin.charCodeAt(i) & 0xff);
										}
										xhr.send(ui8a.buffer);
									}
									return; // will return from here only if shouldn't send binary
								} 							
							}
							
							// if no multipart, or last resort, send as binary stream
							url = plupload.buildUrl(up.settings.url, plupload.extend(args, up.settings.multipart_params));
							
							xhr.open("post", url, true);
							
							xhr.setRequestHeader('Content-Type', 'application/octet-stream'); // Binary stream header
								
							// Set custom headers
							plupload.each(up.settings.headers, function(value, name) {
								xhr.setRequestHeader(name, value);
							});
												
							xhr.send(bin); 
						} // prepareAndSend


						// File upload finished
						if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
							return;
						}

						// Standard arguments
						args = {name : file.target_name || file.name};

						// Only add chunking args if needed
						if (settings.chunk_size && file.size > settings.chunk_size && (features.chunks || typeof(blob) == 'string')) { // blob will be of type string if it was loaded in memory 
							chunkSize = settings.chunk_size;
							chunks = Math.ceil(file.size / chunkSize);
							curChunkSize = Math.min(chunkSize, file.size - (chunk * chunkSize));

							// Blob is string so we need to fake chunking, this is not
							// ideal since the whole file is loaded into memory
							if (typeof(blob) == 'string') {
								chunkBlob = blob.substring(chunk * chunkSize, chunk * chunkSize + curChunkSize);
							} else {
								// Slice the chunk
								chunkBlob = w3cBlobSlice(blob, chunk * chunkSize, chunk * chunkSize + curChunkSize);
							}

							// Setup query string arguments
							args.chunk = chunk;
							args.chunks = chunks;
						} else {
							curChunkSize = file.size;
							chunkBlob = blob;
						}
						
						// workaround Gecko 2,5,6 FormData+Blob bug: https://bugzilla.mozilla.org/show_bug.cgi?id=649150
						if (up.settings.multipart && features.multipart && typeof(chunkBlob) !== 'string' && fr && features.cantSendBlobInFormData && features.chunks && up.settings.chunk_size) { // Gecko 2,5,6
							fr.onload = function() {
								prepareAndSend(fr.result);
							}
							fr.readAsBinaryString(chunkBlob);
						} else {
							prepareAndSend(chunkBlob);
						}
							
					}

					// Start uploading chunks
					uploadNextChunk();
				}

				nativeFile = html5files[file.id];
								
				// Resize image if it's a supported format and resize is enabled
				if (features.jpgresize && up.settings.resize && /\.(png|jpg|jpeg)$/i.test(file.name)) {
					scaleImage.call(up, file, up.settings.resize, /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg', function(res) {
						// If it was scaled send the scaled image if it failed then
						// send the raw image and let the server do the scaling
						if (res.success) {
							file.size = res.data.length;
							sendBinaryBlob(res.data);
						} else if (features.chunks) {
							sendBinaryBlob(nativeFile); 
						} else {
							readFileAsBinary(nativeFile, sendBinaryBlob); // for browsers not supporting File.slice (e.g. FF3.6)
						}
					});
				// if there's no way to slice file without preloading it in memory, preload it
				} else if (!features.chunks && features.jpgresize) { 
					readFileAsBinary(nativeFile, sendBinaryBlob); 
				} else {
					sendBinaryBlob(nativeFile); 
				}
			});
			
			
			uploader.bind('Destroy', function(up) {
				var name, element, container = document.body,
					elements = {
						inputContainer: up.id + '_html5_container',
						inputFile: up.id + '_html5',
						browseButton: up.settings.browse_button,
						dropElm: up.settings.drop_element
					};

				// Unbind event handlers
				for (name in elements) {
					element = document.getElementById(elements[name]);
					if (element) {
						plupload.removeAllEvents(element, up.id);
					}
				}
				plupload.removeAllEvents(document.body, up.id);
				
				if (up.settings.container) {
					container = document.getElementById(up.settings.container);
				}
				
				// Remove mark-up
				container.removeChild(document.getElementById(elements.inputContainer));
			});

			callback({success : true});
		}
	});
	
	function BinaryReader() {
		var II = false, bin;

		// Private functions
		function read(idx, size) {
			var mv = II ? 0 : -8 * (size - 1), sum = 0, i;

			for (i = 0; i < size; i++) {
				sum |= (bin.charCodeAt(idx + i) << Math.abs(mv + i*8));
			}

			return sum;
		}

		function putstr(segment, idx, length) {
			var length = arguments.length === 3 ? length : bin.length - idx - 1;
			
			bin = bin.substr(0, idx) + segment + bin.substr(length + idx);
		}

		function write(idx, num, size) {
			var str = '', mv = II ? 0 : -8 * (size - 1), i;

			for (i = 0; i < size; i++) {
				str += String.fromCharCode((num >> Math.abs(mv + i*8)) & 255);
			}

			putstr(str, idx, size);
		}

		// Public functions
		return {
			II: function(order) {
				if (order === undef) {
					return II;
				} else {
					II = order;
				}
			},

			init: function(binData) {
				II = false;
				bin = binData;
			},

			SEGMENT: function(idx, length, segment) {				
				switch (arguments.length) {
					case 1: 
						return bin.substr(idx, bin.length - idx - 1);
					case 2: 
						return bin.substr(idx, length);
					case 3: 
						putstr(segment, idx, length);
						break;
					default: return bin;	
				}
			},

			BYTE: function(idx) {
				return read(idx, 1);
			},

			SHORT: function(idx) {
				return read(idx, 2);
			},

			LONG: function(idx, num) {
				if (num === undef) {
					return read(idx, 4);
				} else {
					write(idx, num, 4);
				}
			},

			SLONG: function(idx) { // 2's complement notation
				var num = read(idx, 4);

				return (num > 2147483647 ? num - 4294967296 : num);
			},

			STRING: function(idx, size) {
				var str = '';

				for (size += idx; idx < size; idx++) {
					str += String.fromCharCode(read(idx, 1));
				}

				return str;
			}
		};
	}
	
	function JPEG_Headers(data) {
		
		var markers = {
				0xFFE1: {
					app: 'EXIF',
					name: 'APP1',
					signature: "Exif\0" 
				},
				0xFFE2: {
					app: 'ICC',
					name: 'APP2',
					signature: "ICC_PROFILE\0" 
				},
				0xFFED: {
					app: 'IPTC',
					name: 'APP13',
					signature: "Photoshop 3.0\0" 
				}
			},
			headers = [], read, idx, marker = undef, length = 0, limit;
			
		
		read = new BinaryReader();
		read.init(data);
				
		// Check if data is jpeg
		if (read.SHORT(0) !== 0xFFD8) {
			return;
		}
		
		idx = 2;
		limit = Math.min(1048576, data.length);	
			
		while (idx <= limit) {
			marker = read.SHORT(idx);
			
			// omit RST (restart) markers
			if (marker >= 0xFFD0 && marker <= 0xFFD7) {
				idx += 2;
				continue;
			}
			
			// no headers allowed after SOS marker
			if (marker === 0xFFDA || marker === 0xFFD9) {
				break;	
			}	
			
			length = read.SHORT(idx + 2) + 2;	
			
			if (markers[marker] && 
				read.STRING(idx + 4, markers[marker].signature.length) === markers[marker].signature) {
				headers.push({ 
					hex: marker,
					app: markers[marker].app.toUpperCase(),
					name: markers[marker].name.toUpperCase(),
					start: idx,
					length: length,
					segment: read.SEGMENT(idx, length)
				});
			}
			idx += length;			
		}
					
		read.init(null); // free memory
						
		return {
			
			headers: headers,
			
			restore: function(data) {
				read.init(data);
				
				// Check if data is jpeg
				var jpegHeaders = new JPEG_Headers(data);
				
				if (!jpegHeaders['headers']) {
					return false;
				}	
				
				// Delete any existing headers that need to be replaced
				for (var i = jpegHeaders['headers'].length; i > 0; i--) {
					var hdr = jpegHeaders['headers'][i - 1];
					read.SEGMENT(hdr.start, hdr.length, '')
				}
				jpegHeaders.purge();
				
				idx = read.SHORT(2) == 0xFFE0 ? 4 + read.SHORT(4) : 2;
								
				for (var i = 0, max = headers.length; i < max; i++) {
					read.SEGMENT(idx, 0, headers[i].segment);						
					idx += headers[i].length;
				}
				
				return read.SEGMENT();
			},
			
			get: function(app) {
				var array = [];
								
				for (var i = 0, max = headers.length; i < max; i++) {
					if (headers[i].app === app.toUpperCase()) {
						array.push(headers[i].segment);
					}
				}
				return array;
			},
			
			set: function(app, segment) {
				var array = [];
				
				if (typeof(segment) === 'string') {
					array.push(segment);	
				} else {
					array = segment;	
				}
				
				for (var i = ii = 0, max = headers.length; i < max; i++) {
					if (headers[i].app === app.toUpperCase()) {
						headers[i].segment = array[ii];
						headers[i].length = array[ii].length;
						ii++;
					}
					if (ii >= array.length) break;
				}
			},
			
			purge: function() {
				headers = [];
				read.init(null);
			}
		};		
	}
	
	
	function ExifParser() {
		// Private ExifParser fields
		var data, tags, offsets = {}, tagDescs;

		data = new BinaryReader();

		tags = {
			tiff : {
				/*
				The image orientation viewed in terms of rows and columns.
	
				1 - The 0th row is at the visual top of the image, and the 0th column is the visual left-hand side.
				2 - The 0th row is at the visual top of the image, and the 0th column is the visual left-hand side.
				3 - The 0th row is at the visual top of the image, and the 0th column is the visual right-hand side.
				4 - The 0th row is at the visual bottom of the image, and the 0th column is the visual right-hand side.
				5 - The 0th row is at the visual bottom of the image, and the 0th column is the visual left-hand side.
				6 - The 0th row is the visual left-hand side of the image, and the 0th column is the visual top.
				7 - The 0th row is the visual right-hand side of the image, and the 0th column is the visual top.
				8 - The 0th row is the visual right-hand side of the image, and the 0th column is the visual bottom.
				9 - The 0th row is the visual left-hand side of the image, and the 0th column is the visual bottom.
				*/
				0x0112: 'Orientation',
				0x8769: 'ExifIFDPointer',
				0x8825:	'GPSInfoIFDPointer'
			},
			exif : {
				0x9000: 'ExifVersion',
				0xA001: 'ColorSpace',
				0xA002: 'PixelXDimension',
				0xA003: 'PixelYDimension',
				0x9003: 'DateTimeOriginal',
				0x829A: 'ExposureTime',
				0x829D: 'FNumber',
				0x8827: 'ISOSpeedRatings',
				0x9201: 'ShutterSpeedValue',
				0x9202: 'ApertureValue'	,
				0x9207: 'MeteringMode',
				0x9208: 'LightSource',
				0x9209: 'Flash',
				0xA402: 'ExposureMode',
				0xA403: 'WhiteBalance',
				0xA406: 'SceneCaptureType',
				0xA404: 'DigitalZoomRatio',
				0xA408: 'Contrast',
				0xA409: 'Saturation',
				0xA40A: 'Sharpness'
			},
			gps : {
				0x0000: 'GPSVersionID',
				0x0001: 'GPSLatitudeRef',
				0x0002: 'GPSLatitude',
				0x0003: 'GPSLongitudeRef',
				0x0004: 'GPSLongitude'
			}
		};

		tagDescs = {
			'ColorSpace': {
				1: 'sRGB',
				0: 'Uncalibrated'
			},

			'MeteringMode': {
				0: 'Unknown',
				1: 'Average',
				2: 'CenterWeightedAverage',
				3: 'Spot',
				4: 'MultiSpot',
				5: 'Pattern',
				6: 'Partial',
				255: 'Other'
			},

			'LightSource': {
				1: 'Daylight',
				2: 'Fliorescent',
				3: 'Tungsten',
				4: 'Flash',
				9: 'Fine weather',
				10: 'Cloudy weather',
				11: 'Shade',
				12: 'Daylight fluorescent (D 5700 - 7100K)',
				13: 'Day white fluorescent (N 4600 -5400K)',
				14: 'Cool white fluorescent (W 3900 - 4500K)',
				15: 'White fluorescent (WW 3200 - 3700K)',
				17: 'Standard light A',
				18: 'Standard light B',
				19: 'Standard light C',
				20: 'D55',
				21: 'D65',
				22: 'D75',
				23: 'D50',
				24: 'ISO studio tungsten',
				255: 'Other'
			},

			'Flash': {
				0x0000: 'Flash did not fire.',
				0x0001: 'Flash fired.',
				0x0005: 'Strobe return light not detected.',
				0x0007: 'Strobe return light detected.',
				0x0009: 'Flash fired, compulsory flash mode',
				0x000D: 'Flash fired, compulsory flash mode, return light not detected',
				0x000F: 'Flash fired, compulsory flash mode, return light detected',
				0x0010: 'Flash did not fire, compulsory flash mode',
				0x0018: 'Flash did not fire, auto mode',
				0x0019: 'Flash fired, auto mode',
				0x001D: 'Flash fired, auto mode, return light not detected',
				0x001F: 'Flash fired, auto mode, return light detected',
				0x0020: 'No flash function',
				0x0041: 'Flash fired, red-eye reduction mode',
				0x0045: 'Flash fired, red-eye reduction mode, return light not detected',
				0x0047: 'Flash fired, red-eye reduction mode, return light detected',
				0x0049: 'Flash fired, compulsory flash mode, red-eye reduction mode',
				0x004D: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
				0x004F: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
				0x0059: 'Flash fired, auto mode, red-eye reduction mode',
				0x005D: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
				0x005F: 'Flash fired, auto mode, return light detected, red-eye reduction mode'
			},

			'ExposureMode': {
				0: 'Auto exposure',
				1: 'Manual exposure',
				2: 'Auto bracket'
			},

			'WhiteBalance': {
				0: 'Auto white balance',
				1: 'Manual white balance'
			},

			'SceneCaptureType': {
				0: 'Standard',
				1: 'Landscape',
				2: 'Portrait',
				3: 'Night scene'
			},

			'Contrast': {
				0: 'Normal',
				1: 'Soft',
				2: 'Hard'
			},

			'Saturation': {
				0: 'Normal',
				1: 'Low saturation',
				2: 'High saturation'
			},

			'Sharpness': {
				0: 'Normal',
				1: 'Soft',
				2: 'Hard'
			},

			// GPS related
			'GPSLatitudeRef': {
				N: 'North latitude',
				S: 'South latitude'
			},

			'GPSLongitudeRef': {
				E: 'East longitude',
				W: 'West longitude'
			}
		};

		function extractTags(IFD_offset, tags2extract) {
			var length = data.SHORT(IFD_offset), i, ii,
				tag, type, count, tagOffset, offset, value, values = [], hash = {};

			for (i = 0; i < length; i++) {
				// Set binary reader pointer to beginning of the next tag
				offset = tagOffset = IFD_offset + 12 * i + 2;

				tag = tags2extract[data.SHORT(offset)];

				if (tag === undef) {
					continue; // Not the tag we requested
				}

				type = data.SHORT(offset+=2);
				count = data.LONG(offset+=2);

				offset += 4;
				values = [];

				switch (type) {
					case 1: // BYTE
					case 7: // UNDEFINED
						if (count > 4) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.BYTE(offset + ii);
						}

						break;

					case 2: // STRING
						if (count > 4) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						hash[tag] = data.STRING(offset, count - 1);

						continue;

					case 3: // SHORT
						if (count > 2) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SHORT(offset + ii*2);
						}

						break;

					case 4: // LONG
						if (count > 1) {
							offset = data.LONG(offset) + offsets.tiffHeader;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4);
						}

						break;

					case 5: // RATIONAL
						offset = data.LONG(offset) + offsets.tiffHeader;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4) / data.LONG(offset + ii*4 + 4);
						}

						break;

					case 9: // SLONG
						offset = data.LONG(offset) + offsets.tiffHeader;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4);
						}

						break;

					case 10: // SRATIONAL
						offset = data.LONG(offset) + offsets.tiffHeader;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4) / data.SLONG(offset + ii*4 + 4);
						}

						break;

					default:
						continue;
				}

				value = (count == 1 ? values[0] : values);

				if (tagDescs.hasOwnProperty(tag) && typeof value != 'object') {
					hash[tag] = tagDescs[tag][value];
				} else {
					hash[tag] = value;
				}
			}

			return hash;
		}

		function getIFDOffsets() {
			var Tiff = undef, idx = offsets.tiffHeader;

			// Set read order of multi-byte data
			data.II(data.SHORT(idx) == 0x4949);

			// Check if always present bytes are indeed present
			if (data.SHORT(idx+=2) !== 0x002A) {
				return false;
			}
		
			offsets['IFD0'] = offsets.tiffHeader + data.LONG(idx += 2);
			Tiff = extractTags(offsets['IFD0'], tags.tiff);

			offsets['exifIFD'] = ('ExifIFDPointer' in Tiff ? offsets.tiffHeader + Tiff.ExifIFDPointer : undef);
			offsets['gpsIFD'] = ('GPSInfoIFDPointer' in Tiff ? offsets.tiffHeader + Tiff.GPSInfoIFDPointer : undef);

			return true;
		}
		
		// At the moment only setting of simple (LONG) values, that do not require offset recalculation, is supported
		function setTag(ifd, tag, value) {
			var offset, length, tagOffset, valueOffset = 0;
			
			// If tag name passed translate into hex key
			if (typeof(tag) === 'string') {
				var tmpTags = tags[ifd.toLowerCase()];
				for (hex in tmpTags) {
					if (tmpTags[hex] === tag) {
						tag = hex;
						break;	
					}
				}
			}
			offset = offsets[ifd.toLowerCase() + 'IFD'];
			length = data.SHORT(offset);
						
			for (i = 0; i < length; i++) {
				tagOffset = offset + 12 * i + 2;

				if (data.SHORT(tagOffset) == tag) {
					valueOffset = tagOffset + 8;
					break;
				}
			}
			
			if (!valueOffset) return false;

			
			data.LONG(valueOffset, value);
			return true;
		}
		

		// Public functions
		return {
			init: function(segment) {
				// Reset internal data
				offsets = {
					tiffHeader: 10
				};
				
				if (segment === undef || !segment.length) {
					return false;
				}

				data.init(segment);

				// Check if that's APP1 and that it has EXIF
				if (data.SHORT(0) === 0xFFE1 && data.STRING(4, 5).toUpperCase() === "EXIF\0") {
					return getIFDOffsets();
				}
				return false;
			},
			
			EXIF: function() {
				var Exif;
				
				// Populate EXIF hash
				Exif = extractTags(offsets.exifIFD, tags.exif);

				// Fix formatting of some tags
				if (Exif.ExifVersion && plupload.typeOf(Exif.ExifVersion) === 'array') {
					for (var i = 0, exifVersion = ''; i < Exif.ExifVersion.length; i++) {
						exifVersion += String.fromCharCode(Exif.ExifVersion[i]);	
					}
					Exif.ExifVersion = exifVersion;
				}

				return Exif;
			},

			GPS: function() {
				var GPS;
				
				GPS = extractTags(offsets.gpsIFD, tags.gps);
				
				// iOS devices (and probably some others) do not put in GPSVersionID tag (why?..)
				if (GPS.GPSVersionID) { 
					GPS.GPSVersionID = GPS.GPSVersionID.join('.');
				}

				return GPS;
			},
			
			setExif: function(tag, value) {
				// Right now only setting of width/height is possible
				if (tag !== 'PixelXDimension' && tag !== 'PixelYDimension') return false;
				
				return setTag('exif', tag, value);
			},


			getBinary: function() {
				return data.SEGMENT();
			}
		};
	};
})(window, document, plupload);

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
	var fakeSafariDragDrop, ExifParser;
	
	/* Introduce sendAsBinary for latest WebKits having support for BlobBuilder and typed arrays:
	credits: http://javascript0.org/wiki/Portable_sendAsBinary, 
	more info: http://code.google.com/p/chromium/issues/detail?id=35705 
	*/			
	if (window.Uint8Array && window.ArrayBuffer && !XMLHttpRequest.prototype.sendAsBinary) {
		XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
			var ui8a = new Uint8Array(datastr.length);
			for (var i = 0; i < datastr.length; i++) {
				ui8a[i] = (datastr.charCodeAt(i) & 0xff);
			}
			this.send(ui8a.buffer);
		};
	}
	

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

	function scaleImage(image_file, max_width, max_height, mime, callback) {
		var canvas, context, img, scale;

		readFileAsDataURL(image_file, function(data) {
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
				var width, height, percentage, APP1, APP2, parser;

				scale = Math.min(max_width / img.width, max_height / img.height);

				if (scale < 1) {
					width = Math.round(img.width * scale);
					height = Math.round(img.height * scale);

					// Scale image and canvas
					canvas.width = width;
					canvas.height = height;
					context.drawImage(img, 0, 0, width, height);

					// Get original EXIF info
					parser = new ExifParser();
					parser.init(atob(data.substring(data.indexOf('base64,') + 7)));
					APP1 = parser.APP1({width: width, height: height});
					APP2 = parser.APP2();

					// Remove data prefix information and grab the base64 encoded data and decode it
					data = canvas.toDataURL(mime);
					data = data.substring(data.indexOf('base64,') + 7);
					data = atob(data);

					// Restore EXIF and ICC info to scaled image
					if (APP1 || APP2) {
						parser.init(data);
						if (APP1) {
							parser.setAPP1(APP1);
						}
						if (APP2) {
							parser.setAPP2(APP2);
						}
						data = parser.getBinary();
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
			var xhr, hasXhrSupport, hasProgress, dataAccessSupport, sliceSupport, win = window;

			hasXhrSupport = hasProgress = dataAccessSupport = sliceSupport = false;
			
			if (win.XMLHttpRequest) {
				xhr = new XMLHttpRequest();
				hasProgress = !!xhr.upload;
				hasXhrSupport = !!(xhr.sendAsBinary || xhr.upload);
			}

			// Check for support for various features
			if (hasXhrSupport) {
				// Set dataAccessSupport only for Gecko since BlobBuilder and XHR doesn't handle binary data correctly				
				dataAccessSupport = !!(File && (File.prototype.getAsDataURL || win.FileReader) && xhr.sendAsBinary);
				sliceSupport = !!(File && File.prototype.slice);
			}

			// Sniff for Safari and fake drag/drop
			fakeSafariDragDrop = navigator.userAgent.indexOf('Safari') > 0 && navigator.vendor.indexOf('Apple') !== -1;

			return {
				// Detect drag/drop file support by sniffing, will try to find a better way
				html5: hasXhrSupport, // This is a special one that we check inside the init call
				dragdrop: win.mozInnerScreenX !== undef || sliceSupport || fakeSafariDragDrop,
				jpgresize: dataAccessSupport,
				pngresize: dataAccessSupport,
				multipart: dataAccessSupport || !!win.FileReader || !!win.FormData,
				progress: hasProgress,
				chunks: sliceSupport || dataAccessSupport,
				
				/* WebKit let you trigger file dialog programmatically while FF and Opera - do not, so we
				sniff for it here... probably not that good idea, but impossibillity of controlling cursor style  
				on top of add files button obviously feels even worse */
				canOpenDialog: navigator.userAgent.indexOf('WebKit') !== -1
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
			var html5files = {}, features;

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
					files.push(new plupload.File(id, file.fileName, file.fileSize || file.size)); // File.fileSize depricated
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

						if (type) {
							mimes.push(type);
						}
					}
				}


				// Insert the input inside the input container
				inputContainer.innerHTML = '<input id="' + uploader.id + '_html5" ' +
											'style="width:100%;height:100%;font-size:99px" type="file" accept="' + 
											mimes.join(',') + '" ' +
											(uploader.settings.multi_selection ? 'multiple="multiple"' : '') + ' />';
				
				inputFile = document.getElementById(uploader.id + '_html5');
				inputFile.onchange = function() {
					// Add the selected files from file input
					addSelectedFiles(this.files);

					// Clearing the value enables the user to select the same file again if they want to
					this.value = '';
				};
				
				/* Since we have to place input[type=file] on top of the browse_button for some browsers (FF, Opera),
				browse_button loses interactivity, here we try to neutralize this issue highlighting browse_button
				with a special class
				TODO: needs to be revised as things will change */
				browseButton = document.getElementById(up.settings.browse_button);
				if (browseButton) {				
					var hoverClass = up.settings.browse_button_hover,
						activeClass = up.settings.browse_button_active,
						topElement = up.features.canOpenDialog ? browseButton : inputContainer;
					
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
					if (up.features.canOpenDialog) {
						plupload.addEvent(browseButton, 'click', function(e) {
							document.getElementById(up.id + '_html5').click();
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
				var browseButton, browsePos, browseSize, inputContainer, pzIndex;
					
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
					if (uploader.features.canOpenDialog) {
						pzIndex = parseInt(browseButton.parentNode.style.zIndex, 10);
	
						if (isNaN(pzIndex)) {
							pzIndex = 0;
						}
							
						plupload.extend(browseButton.style, {
							zIndex : pzIndex
						});
            
						if (plupload.getStyle(browseButton, 'position') === 'static') {
							plupload.extend(browseButton.style, {
								position : 'relative'
							});
						}
											
						plupload.extend(inputContainer.style, {
							zIndex : pzIndex - 1
						});
					}
				}
			});

			uploader.bind("UploadFile", function(up, file) {
				var settings = up.settings, nativeFile, resize;

				function sendBinaryBlob(blob) {
					var chunk = 0, loaded = 0;

					function uploadNextChunk() {
						var chunkBlob = blob, xhr, upload, chunks, args, multipartDeltaSize = 0,
							boundary = '----pluploadboundary' + plupload.guid(), chunkSize, curChunkSize, formData,
							dashdash = '--', crlf = '\r\n', multipartBlob = '', mimeType, url = up.settings.url;

						// File upload finished
						if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
							return;
						}

						// Standard arguments
						args = {name : file.target_name || file.name};

						// Only add chunking args if needed
						if (settings.chunk_size && features.chunks) {
							chunkSize = settings.chunk_size;
							chunks = Math.ceil(file.size / chunkSize);
							curChunkSize = Math.min(chunkSize, file.size - (chunk * chunkSize));

							// Blob is string so we need to fake chunking, this is not
							// ideal since the whole file is loaded into memory
							if (typeof(blob) == 'string') {
								chunkBlob = blob.substring(chunk * chunkSize, chunk * chunkSize + curChunkSize);
							} else {
								// Slice the chunk
								chunkBlob = blob.slice(chunk * chunkSize, curChunkSize);
							}

							// Setup query string arguments
							args.chunk = chunk;
							args.chunks = chunks;
						} else {
							curChunkSize = file.size;
						}

						// Setup XHR object
						xhr = new XMLHttpRequest();
						upload = xhr.upload;

						// Do we have upload progress support
						if (upload) {
							upload.onprogress = function(e) {
								file.loaded = Math.min(file.size, loaded + e.loaded - multipartDeltaSize); // Loaded can be larger than file size due to multipart encoding
								up.trigger('UploadProgress', file);
							};
						}

						// Add name, chunk and chunks to query string on direct streaming
						if (!up.settings.multipart || !features.multipart) {
							url = plupload.buildUrl(up.settings.url, args);
						} else {
							args.name = file.target_name || file.name;
						}

						xhr.open("post", url, true);

						xhr.onreadystatechange = function() {
							var httpStatus, chunkArgs;

							if (xhr.readyState == 4) {
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

									// Check if file is uploaded
									if (!chunks || ++chunk >= chunks) {
										file.status = plupload.DONE;
										up.trigger('FileUploaded', file, {
											response : xhr.responseText,
											status : httpStatus
										});

										nativeFile = blob = html5files[file.id] = null; // Free memory
									} else {
										// Still chunks left
										uploadNextChunk();
									}
								}

								xhr = chunkBlob = formData = multipartBlob = null; // Free memory
							}
						};

						// Set custom headers
						plupload.each(up.settings.headers, function(value, name) {
							xhr.setRequestHeader(name, value);
						});

						// Build multipart request
						if (up.settings.multipart && features.multipart) {
							// Has FormData support like Chrome 6+, Safari 5+, Firefox 4
							if (!xhr.sendAsBinary) {
								formData = new FormData();

								// Add multipart params
								plupload.each(plupload.extend(args, up.settings.multipart_params), function(value, name) {
									formData.append(name, value);
								});

								// Add file and send it
								formData.append(up.settings.file_data_name, chunkBlob);
								xhr.send(formData);

								return;
							}

							// Gecko multipart request
							xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);

							// Append multipart parameters
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
								chunkBlob + crlf +
								dashdash + boundary + dashdash + crlf;

							multipartDeltaSize = multipartBlob.length - chunkBlob.length;
							chunkBlob = multipartBlob;
						} else {
							// Binary stream header
							xhr.setRequestHeader('Content-Type', 'application/octet-stream');
						}

						if (xhr.sendAsBinary) {
							xhr.sendAsBinary(chunkBlob); // Gecko
						} else {
							xhr.send(chunkBlob); // WebKit
						}
					}

					// Start uploading chunks
					uploadNextChunk();
				}

				nativeFile = html5files[file.id];
				resize = up.settings.resize;

				if (features.jpgresize) {
					// Resize image if it's a supported format and resize is enabled
					if (resize && /\.(png|jpg|jpeg)$/i.test(file.name)) {
						scaleImage(nativeFile, resize.width, resize.height, /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg', function(res) {
							// If it was scaled send the scaled image if it failed then
							// send the raw image and let the server do the scaling
							if (res.success) {
								file.size = res.data.length;
								sendBinaryBlob(res.data);
							} else {
								readFileAsBinary(nativeFile, sendBinaryBlob);
							}
						});
					} else {
						readFileAsBinary(nativeFile, sendBinaryBlob);
					}
				} else {
					sendBinaryBlob(nativeFile); // this works on older WebKits, but fails on fresh ones
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

	ExifParser = function() {
		// Private ExifParser fields
		var Tiff, Exif, GPS, app0, app0_offset, app0_length, app1, app1_offset, data,
			app1_length, exifIFD_offset, gpsIFD_offset, IFD0_offset, TIFFHeader_offset, undef,
			tiffTags, exifTags, gpsTags, tagDescs, app2;

		/**
		 * @constructor
		 */
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

			function putstr(idx, segment, replace) {
				bin = bin.substr(0, idx) + segment + bin.substr((replace === true ? segment.length : 0) + idx);
			}

			function write(idx, num, size) {
				var str = '', mv = II ? 0 : -8 * (size - 1), i;

				for (i = 0; i < size; i++) {
					str += String.fromCharCode((num >> Math.abs(mv + i*8)) & 255);
				}

				putstr(idx, str, true);
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

				SEGMENT: function(idx, segment, replace) {
					if (!arguments.length) {
						return bin;
					}

					if (typeof segment == 'number') {
						return bin.substr(parseInt(idx, 10), segment);
					}

					putstr(idx, segment, replace);
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

		data = new BinaryReader();

		tiffTags = {
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
		};

		exifTags = {
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
		};

		gpsTags = {
			0x0000: 'GPSVersionID',
			0x0001: 'GPSLatitudeRef',
			0x0002: 'GPSLatitude',
			0x0003: 'GPSLongitudeRef',
			0x0004: 'GPSLongitude'
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
				tag, type, count, tagOffset, offset, value, values = [], tags = {};

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
							offset = data.LONG(offset) + TIFFHeader_offset;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.BYTE(offset + ii);
						}

						break;

					case 2: // STRING
						if (count > 4) {
							offset = data.LONG(offset) + TIFFHeader_offset;
						}

						tags[tag] = data.STRING(offset, count - 1);

						continue;

					case 3: // SHORT
						if (count > 2) {
							offset = data.LONG(offset) + TIFFHeader_offset;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SHORT(offset + ii*2);
						}

						break;

					case 4: // LONG
						if (count > 1) {
							offset = data.LONG(offset) + TIFFHeader_offset;
						}

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4);
						}

						break;

					case 5: // RATIONAL
						offset = data.LONG(offset) + TIFFHeader_offset;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4) / data.LONG(offset + ii*4 + 4);
						}

						break;

					case 9: // SLONG
						offset = data.LONG(offset) + TIFFHeader_offset;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4);
						}

						break;

					case 10: // SRATIONAL
						offset = data.LONG(offset) + TIFFHeader_offset;

						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4) / data.SLONG(offset + ii*4 + 4);
						}

						break;

					default:
						continue;
				}

				value = (count == 1 ? values[0] : values);

				if (tagDescs.hasOwnProperty(tag) && typeof value != 'object') {
					tags[tag] = tagDescs[tag][value];
				} else {
					tags[tag] = value;
				}
			}

			return tags;
		}

		function getIFDOffsets() {
			var idx = app1_offset + 4;

			// Fix TIFF header offset
			TIFFHeader_offset += app1_offset;

			// Check if that's EXIF we are reading
			if (data.STRING(idx, 4).toUpperCase() !== 'EXIF' || data.SHORT(idx+=4) !== 0) {
				return;
			}

			// Set read order of multi-byte data
			data.II(data.SHORT(idx+=2) == 0x4949);

			// Check if always present bytes are indeed present
			if (data.SHORT(idx+=2) !== 0x002A) {
				return;
			}

			IFD0_offset = TIFFHeader_offset + data.LONG(idx += 2);
			Tiff = extractTags(IFD0_offset, tiffTags);

			exifIFD_offset = ('ExifIFDPointer' in Tiff ? TIFFHeader_offset + Tiff.ExifIFDPointer : undef);
			gpsIFD_offset = ('GPSInfoIFDPointer' in Tiff ? TIFFHeader_offset + Tiff.GPSInfoIFDPointer : undef);

			return true;
		}

		function findTagValueOffset(data_app1, tegHex, offset) {
			var length = data_app1.SHORT(offset), tagOffset, i;

			for (i = 0; i < length; i++) {
				tagOffset = offset + 12 * i + 2;

				if (data_app1.SHORT(tagOffset) == tegHex) {
					return tagOffset + 8;
				}
			}
		}

		function setNewWxH(width, height) {
			var w_offset, h_offset,
				offset = exifIFD_offset != undef ? exifIFD_offset - app1_offset : undef,
				data_app1 = new BinaryReader();

			data_app1.init(app1);
			data_app1.II(data.II());

			if (offset === undef) {
				return;
			}

			// Find offset for PixelXDimension tag
			w_offset = findTagValueOffset(data_app1, 0xA002, offset);
			if (w_offset !== undef) {
				data_app1.LONG(w_offset, width);
			}

			// Find offset for PixelYDimension tag
			h_offset = findTagValueOffset(data_app1, 0xA003, offset);
			if (h_offset !== undef) {
				data_app1.LONG(h_offset, height);
			}

			app1 = data_app1.SEGMENT();
		}

		// Public functions
		return {
			init: function(jpegData) {
				// Reset internal data
				TIFFHeader_offset = 10;
				Tiff = Exif = GPS = app0 = app0_offset = app0_length = app1 = app1_offset = app1_length = undef;
				app2 = [];

				data.init(jpegData);

				// Check if data is jpeg
				if (data.SHORT(0) !== 0xFFD8) {
					return false;
				}


				for (var idx = 2, len = 0; idx + 2 < jpegData.length; idx += len) {
					var marker = data.SHORT(idx); 
					if (marker < 0xFFE0 || marker > 0xFFEF) {
						// not a segment marker
						break;
					}

					var len = data.SHORT(idx + 2) + 2;
					switch (marker) {
						// app0
						case 0xFFE0:
							if (app0_offset === undef) {
								app0_offset = idx;
								app0_length = len;
							}
							break;
						// app1
						case 0xFFE1:
							if (app1_offset === undef &&
								len > 4 + 4 &&
								data.STRING(idx + 4, 5).toUpperCase() === "EXIF\0") {
								app1_offset = idx;
								app1_length = len;
							}
							break;
						// app2
						case 0xFFE2:
							if (len > 4 + 11 &&
								data.STRING(idx + 4, 12).toUpperCase() === "ICC_PROFILE\0") {
								// the profile may span multiple segments
								app2.push( { offset:idx, length:len } );
							}
							break;
					}
				}

				if (app1_length !== undef) {
					getIFDOffsets();
				}				
			},

			APP1: function(args) {
				if (app1_offset === undef && app1_length === undef) {
					return;
				}

				app1 = app1 || (app1 = data.SEGMENT(app1_offset, app1_length));

				// If requested alter width/height tags in app1
				if (args !== undef && 'width' in args && 'height' in args) {
					setNewWxH(args.width, args.height);
				}

				return app1;
			},

			APP2: function(args) {
				if (app2.length === 0) {
					return;
				}
				
				var data_app2 = [];
				for (var i = 0; i < app2.length; i++) {
					data_app2.push(data.SEGMENT(app2[i].offset, app2[i].length));
				}
				return data_app2;
			},

			EXIF: function() {
				// Populate EXIF hash
				Exif = extractTags(exifIFD_offset, exifTags);

				// Fix formatting of some tags
				Exif.ExifVersion = String.fromCharCode(
					Exif.ExifVersion[0],
					Exif.ExifVersion[1],
					Exif.ExifVersion[2],
					Exif.ExifVersion[3]
				);

				return Exif;
			},

			GPS: function() {
				GPS = extractTags(gpsIFD_offset, gpsTags);
				GPS.GPSVersionID = GPS.GPSVersionID.join('.');

				return GPS;
			},

			setAPP1: function(data_app1) {
				if (app1_offset !== undef) {
					return false;
				}

				data.SEGMENT((app0_offset ? app0_offset + app0_length : 2), data_app1);
			},

			setAPP2: function(data_app2) {
				if (app2.length !== 0) {
					return false;
				}
				
				var idx = (app1_offset ? app1_offset + app1_length :
						  (app0_offset ? app0_offset + app0_length : 2));

				for (var i = 0; i < data_app2.length; i++) {
					data.SEGMENT(idx, data_app2[i]);
					idx += data_app2[i].length;
				}
			},

			getBinary: function() {
				return data.SEGMENT();
			}
		};
	};
})(window, document, plupload);

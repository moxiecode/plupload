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
/*global plupload:false, File:false, window:false, atob:false */

(function(plupload) {
	function scaleImage(image_data_url, max_width, max_height, mime, callback) {
		var canvas, context, img, data, scale;

		// Setup canvas and context
		canvas = document.createElement("canvas");
		canvas.style.display = 'none';
		document.body.appendChild(canvas);
		context = canvas.getContext('2d');

		// Load image
		img = new Image();
		img.onload = function() {
			var width, height, percentage;

			scale = Math.min(max_width / img.width, max_height / img.height);

			if (scale < 1) {
				width = Math.round(img.width * scale);
				height = Math.round(img.height * scale);
			} else {
				width = img.width;
				height = img.height;
			}

			// Scale image and canvas
			canvas.width = width;
			canvas.height = height;
			context.drawImage(img, 0, 0, width, height);

			// Remove data prefix information and grab the base64 encoded data and decode it
			data = canvas.toDataURL(mime);
			data = data.substring(data.indexOf('base64,') + 7);
			data = atob(data);

			// Remove canvas and execute callback with decoded image data
			canvas.parentNode.removeChild(canvas);
			callback({success : true, data : data});
		};

		img.src = image_data_url;
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
		 * Initializes the upload runtime.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			var html5files = {}, dataAccessSupport;

			function addSelectedFiles(native_files) {
				var file, i, files = [], id;

				// Add the selected files to the file queue
				for (i = 0; i < native_files.length; i++) {
					file = native_files[i];

					// Store away gears blob internally
					id = plupload.guid();
					html5files[id] = file;

					// Expose id, name and size
					files.push(new plupload.File(id, file.fileName, file.fileSize));
				}

				// Trigger FilesAdded event if we added any
				if (files.length) {
					uploader.trigger("FilesAdded", files);
				}
			}

			function isSupported() {
				var xhr;

				if (window.XMLHttpRequest) {
					xhr = new XMLHttpRequest();

					return !!(xhr.sendAsBinary || xhr.upload);
				}

				return false;
			}

			// No HTML5 upload support
			if (!isSupported()) {
				callback({success : false});
				return;
			}

			uploader.bind("Init", function(up) {
				var inputContainer, mimes = [], i, y, filters = up.settings.filters, ext, type, container = document.body;

				// Create input container and insert it at an absolute position within the browse button
				inputContainer = document.createElement('div');
				inputContainer.id = up.id + '_html5_container';

				// Convert extensions to mime types list
				for (i = 0; i < filters.length; i++) {
					ext = filters[i].extensions.split(/,/);

					for (y = 0; y < ext.length; y++) {
						type = plupload.mimeTypes[ext[y]];

						if (type) {
							mimes.push(type);
						}
					}
				}

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
					container.style.position = 'relative';
				}

				container.appendChild(inputContainer);

				// Insert the input inide the input container
				inputContainer.innerHTML = '<input id="' + uploader.id + '_html5" ' +
											'style="width:100%;" type="file" accept="' + mimes.join(',') + '" ' +
											(uploader.settings.multi_selection ? 'multiple="multiple"' : '') + ' />';

				document.getElementById(uploader.id + '_html5').onchange = function() {
					// Add the selected files from file input
					addSelectedFiles(this.files);

					// Clearing the value enables the user to select the same file again if they want to
					this.value = '';
				};
			});

			// Add drop handler
			uploader.bind("PostInit", function() {
				var dropElm = document.getElementById(uploader.settings.drop_element);

				if (dropElm) {
					// Block browser default drag over
					plupload.addEvent(dropElm, 'dragover', function(e) {
						e.preventDefault();
					});

					// Attach drop handler and grab files from Gears
					plupload.addEvent(dropElm, 'drop', function(e) {
						var dataTransfer = e.dataTransfer;

						// Add dropped files
						if (dataTransfer && dataTransfer.files) {
							addSelectedFiles(dataTransfer.files);
						}

						e.preventDefault();
					});
				}
			});

			uploader.bind("Refresh", function(up) {
				var browseButton, browsePos, browseSize;

				browseButton = document.getElementById(uploader.settings.browse_button);
				browsePos = plupload.getPos(browseButton, document.getElementById(up.settings.container));
				browseSize = plupload.getSize(browseButton);

				plupload.extend(document.getElementById(uploader.id + '_html5_container').style, {
					top : browsePos.y + 'px',
					left : browsePos.x + 'px',
					width : browseSize.w + 'px',
					height : browseSize.h + 'px'
				});
			});

			uploader.bind("UploadFile", function(up, file) {
				var xhr = new XMLHttpRequest(), upload = xhr.upload, resize = up.settings.resize, nativeFile, multipartSize = 0;

				// Sends the binary blob to server and multipart encodes it if needed this code will
				// only be executed on Gecko since it's currently the only browser that supports direct file access
				function sendBinaryBlob(blob) {
					var boundary = '----pluploadboundary' + plupload.guid(), dashdash = '--', crlf = '\r\n', multipartBlob = '';

					// Build multipart request
					if (up.settings.multipart) {
						xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);

						// Append mutlipart parameters
						plupload.each(up.settings.multipart_params, function(value, name) {
							multipartBlob += dashdash + boundary + crlf +
								'Content-Disposition: form-data; name="' + name + '"' + crlf + crlf;

							multipartBlob += value + crlf;
						});

						// Build RFC2388 blob
						multipartBlob += dashdash + boundary + crlf +
							'Content-Disposition: form-data; name="file"; filename="' + file.name + '"' + crlf +
							'Content-Type: application/octet-stream' + crlf + crlf +
							blob + crlf +
							dashdash + boundary + dashdash + crlf;

						multipartSize = multipartBlob.length - blob.length;
						blob = multipartBlob;
					}

					// Send blob or multipart blob depending on config
					xhr.sendAsBinary(blob);
				}

				// File upload finished
				if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
					return;
				}

				// Do we have upload progress support
				if (upload) {
					upload.onprogress = function(e) {
						file.loaded = e.loaded - multipartSize;
						up.trigger('UploadProgress', file);
					};
				}

				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						file.status = plupload.DONE;
						file.loaded = file.size;
						up.trigger('UploadProgress', file);
						up.trigger('FileUploaded', file, {
							response : xhr.responseText,
							status : xhr.status
						});
					}
				};

				xhr.open("post", plupload.buildUrl(up.settings.url, {name : file.target_name || file.name}), true);
				xhr.setRequestHeader('Content-Type', 'application/octet-stream');
				nativeFile = html5files[file.id]; 

				if (xhr.sendAsBinary) {
					// Resize image if it's a supported format and resize is enabled
					if (resize && /\.(png|jpg|jpeg)$/i.test(file.name)) {
						scaleImage(nativeFile.getAsDataURL(), resize.width, resize.height, /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg', function(res) {
							// If it was scaled send the scaled image if it failed then
							// send the raw image and let the server do the scaling
							if (res.success) {
								file.size = res.data.length;
								sendBinaryBlob(res.data);
							} else {
								sendBinaryBlob(nativeFile.getAsBinary());
							}
						});
					} else {
						sendBinaryBlob(nativeFile.getAsBinary());
					}
				} else {
					xhr.send(nativeFile);
				}
			});

			// Do we have direct data access Gecko has it but WebKit doesn't yet
			dataAccessSupport = !!(File && File.prototype.getAsDataURL);

			uploader.features = {
				// Detect drag/drop file support by sniffing, will try to find a better way
				dragdrop : window.mozInnerScreenX !== undefined,
				jpgresize : dataAccessSupport,
				pngresize : dataAccessSupport
			};

			callback({success : true});
		}
	});
})(plupload);

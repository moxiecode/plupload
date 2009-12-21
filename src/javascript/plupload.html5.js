/**
 * plupload.html5.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

(function(plupload) {
	function scaleImage(image_data_url, max_width, max_height, mime, callback) {
		var canvas, context, img, data;

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
	};

	/**
	 * HMTL5 implementation.
	 *
	 * @static
	 * @class plupload.Html5Runtime
	 * @extends plupload.Runtime
	 */
	plupload.Html5Runtime = plupload.addRuntime("html5", {
		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize.
		 */
		init : function(uploader, callback) {
			var browseButton, browsePos, html5files = {};

			function isSupported() {
				var xhr;

				if (window.XMLHttpRequest) {
					xhr = new XMLHttpRequest();

					return !!(xhr.sendAsBinary || xhr.upload);
				}

				return false;
			};

			// No HTML5 upload support
			if (!isSupported()) {
				callback({success : false});
				return;
			}

			uploader.bind("Init", function(up) {
				var inputContainer, mimes = [], i, y, filters = up.settings.filters, ext, type;

				// Create input container and insert it at an absolute position within the browse button
				inputContainer = document.createElement('div');
				inputContainer.id = up.id + '_html5_container';

				// Convert extensions to mime types list
				for (i = 0; i < filters.length; i++) {
					ext = filters[i].extensions.split(/,/);

					for (y = 0; y < ext.length; y++) {
						type = plupload.mimeTypes[ext[y]];

						if (type)
							mimes.push(type);
					}
				}

				plupload.extend(inputContainer.style, {
					position : 'absolute',
					background : uploader.settings.html5_bgcolor || 'transparent',
					width : '100px',
					height : '100px',
					overflow : 'hidden',
					opacity : 0
				});

				inputContainer.className = 'plupload_html5';
				document.body.appendChild(inputContainer);

				// Insert the input inide the input container
				inputContainer.innerHTML = '<input id="' + uploader.id + '_html5" ' +
											'style="width:100%;" type="file" accept="' + mimes.join(',') + '" ' +
											(uploader.settings.multi_selection ? 'multiple="multiple"' : '') + ' />';

				document.getElementById(uploader.id + '_html5').onchange = function() {
					var file, i, files = [], id;

					// Add the selected files to the file queue
					for (i = 0; i < this.files.length; i++) {
						file = this.files[i];

						// Store away gears blob internally
						id = plupload.guid();
						html5files[id] = file;

						// Expose id, name and size
						files.push(new plupload.File(id, file.fileName, file.fileSize));
					}

					// Fire FilesSelected event
					uploader.trigger("FilesSelected", files);

					// Clearing the value enables the user to select the same file again if they want to
					this.value = '';
				};
			});

			uploader.bind("Refresh", function(up) {
				var browseButton, browsePos;

				browseButton = document.getElementById(uploader.settings.browse_button);
				browsePos = plupload.getPos(browseButton);

				plupload.extend(document.getElementById(uploader.id + '_html5_container').style, {
					top : browsePos.y + 'px',
					left : browsePos.x + 'px',
					width : browseButton.offsetWidth + 'px',
					height : browseButton.offsetHeight + 'px'
				});
			});

			uploader.bind("UploadFile", function(up, file) {
				var xhr = new XMLHttpRequest(), upload, url = up.settings.url, imageWidth, imageHeight, nativeFile;

				// File upload finished
				if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED)
					return;

				if (upload = xhr.upload) {
					upload.onload = function() {
						file.status = plupload.DONE;
						up.trigger('FileUploaded', file);
					};

					upload.onprogress = function(e) {
						file.loaded = e.loaded;
						up.trigger('UploadProgress', file);
					};
				}

				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						file.status = plupload.DONE;
						file.loaded = file.size;
						up.trigger('UploadProgress', file);
						up.trigger('FileUploaded', file);
					}
				};

				xhr.open("post", url + (url.indexOf('?') == -1 ? '?' : '&') + 'name=' + escape(file.target_name || file.name), true);
				xhr.setRequestHeader('Content-Type', 'application/octet-stream');
				nativeFile = html5files[file.id]; 

				if (xhr.sendAsBinary) {
					imageWidth = up.settings.image_width;
					imageHeight = up.settings.image_height;

					// Should we scale it
					if (/\.(png|jpg|jpeg)$/i.test(file.name) && (imageWidth || imageHeight)) {
						scaleImage(nativeFile.getAsDataURL(), imageWidth, imageHeight, /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg', function(res) {
							// If it was scaled send the scaled image if it failed then
							// send the raw image and let the server do the scaling
							if (res.success) {
								file.size = res.data.length;
								xhr.sendAsBinary(res.data);
							} else
								xhr.sendAsBinary(nativeFile.getAsBinary());
						});
					} else
						xhr.sendAsBinary(nativeFile.getAsBinary());
				} else
					xhr.send(nativeFile);
			});

			callback({success : true});
		}
	});
})(plupload);

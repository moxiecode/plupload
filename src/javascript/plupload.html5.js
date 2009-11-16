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
	/**
	 * Returns the absolute x, y position of a node. The position will be returned in a object with x, y fields.
	 *
	 * @param {Element/String} node HTML element or element id to get x, y position from.
	 * @param {Element} root Optional root element to stop calculations at.
	 * @return {object} Absolute position of the specified element object with x, y fields.
	 */
	function getPos(node, root) {
		var x = 0, y = 0, parent;

		node = node;
		root = root || document.body;

		parent = node;
		while (parent && parent != root && parent.nodeType) {
			x += parent.offsetLeft || 0;
			y += parent.offsetTop || 0;
			parent = parent.offsetParent;
		}

		r = node.parentNode;
		while (parent && parent != root && parent.nodeType) {
			x -= parent.scrollLeft || 0;
			y -= parent.scrollTop || 0;
			parent = parent.parentNode;
		}

		return {x : x, y : y};
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
		 * Checks if the browser has HTML 5 upload support or not.
		 *
		 * @method isSupported
		 * @return {boolean} true/false if the runtime exists.
		 */
		isSupported : function() {
			var xhr;

			if (window.XMLHttpRequest) {
				xhr = new XMLHttpRequest();

				return !!(xhr.sendAsBinary || xhr.upload);
			}

			return false;
		},

		/**
		 * Initializes the upload runtime. This method should add necessary items to the DOM and register events needed for operation. 
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 */
		init : function(uploader) {
				var browseButton, browsePos, inputContainer, html5files = {};

				browseButton = document.getElementById(uploader.settings.browse_button);
				browsePos = plupload.getPos(browseButton);

				// Create input container and insert it at an absolute position within the browse button
				inputContainer = document.createElement('div');
				inputContainer.id = uploader.id + '_html5_container';

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
				inputContainer.innerHTML = '<input id="' + uploader.id + '_html5" style="width:100%;" type="file" ' + (uploader.settings.multi_selection ? 'multiple="multiple"' : '') + ' />';

				uploader.bind("HTML5:PositionAtBrowseButton", function(up) {
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
					var xhr = new XMLHttpRequest(), upload, url = up.settings.url;

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

					if (xhr.sendAsBinary)
						xhr.sendAsBinary(html5files[file.id].getAsBinary());
					else
						xhr.send(html5files[file.id]);
				});

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

				uploader.trigger('HTML5:PositionAtBrowseButton');
		}
	});
})(plupload);

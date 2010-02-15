/**
 * plupload.html4.js
 *
 * Copyright 2010, Ryan Demmer
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

(function(plupload) {
	var TRUE = true;

	/**
	 * HTML4 implementation. This runtime has no special features it uses an form that posts files into an hidden iframe.
	 *
	 * @static
	 * @class plupload.runtimes.Html4
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Html4 = plupload.addRuntime("html4", {
		/**
		 * Initializes the upload runtime.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			var iframefiles = {}, form, iframe;

			function addSelectedFiles(element) {
				var file, i, files = [], id, name;

				name = element.value.replace(/\\/g, '/');
				name = name.substring(name.length, name.lastIndexOf('/')+1);

				// Store away gears blob internally
				id = plupload.guid();

				// Expose id, name and size
				file = new plupload.File(id, name, 1025);

				iframefiles[id] = file;

				file.input = element;
				files.push(file);

				// Fire FilesAdded event
				uploader.trigger("FilesAdded", files);
			}

			uploader.bind("Init", function(up) {
				var forms, inputContainer, input, mimes = [], i, y,
					filters = up.settings.filters, ext, type, IE = /MSIE/.test(navigator.userAgent),
					url = "javascript", bgcolor;

				// If no form set, create or use existing form
				if (!up.settings.form) {
					forms = document.getElementsByTagName('form');

					if (!forms.length) {
						form = document.createElement('form');
						form.setAttribute('action', up.settings.url);
						form.setAttribute('target', '_self');
						document.body.appendChild(form);
					} else {
						form = forms[0];
					}

					form.setAttribute("id", form.id || up.id);
					form.setAttribute('method', 'post');
					form.setAttribute('enctype', 'multipart/form-data');
				} else {
					form = (typeof up.settings.form == 'string') ? document.getElementById(up.settings.form) : up.settings.form;
				}

				iframe = document.createElement('iframe');
				iframe.setAttribute('src', url + ':""'); // javascript:"" for HTTPS issue on IE6, uses a variable to make an ignore for jslint
				iframe.setAttribute('name', up.id + '_iframe');
				iframe.setAttribute('id', up.id + '_iframe');
				iframe.style.display = 'none';

				// Add IFrame onload event
				plupload.addEvent(iframe, 'load', function(e){
					var n = e.target, file = uploader.currentfile;
					var el = n.contentWindow.document || n.contentDocument || window.frames[n.id].document;

					// Return on first load
					if (el.location.href == 'about:blank' || !file) {
						return;
					}

					// Get result
					var result = el.documentElement.innerText || el.documentElement.textContent;

					// Assume no error
					if (result != '') {
						file.status = plupload.DONE;
						file.loaded = 1025;
						file.percent = 100;

						// Remove input element
						if (file.input) {
							file.input.removeAttribute('name');
						}

						up.trigger('UploadProgress', file);
						up.trigger('FileUploaded', file, {
							response : result
						});

						// Reset action and target
						if (form.tmpAction) {
							form.action = form.tmpAction;
						}

						if (form.tmpTarget) {
							form.target = form.tmpTarget;
						}
					}
				});

				// append iframe to form
				form.appendChild(iframe);

				// Change iframe name
				if (IE) {
					window.frames[iframe.id].name = iframe.name;
				}

				// Create container for iframe
				inputContainer = document.createElement('div');
				inputContainer.id = up.id + '_iframe_container';

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

				// Set container styles
				plupload.extend(inputContainer.style, {
					position : 'absolute',
					background : 'transparent',
					width : '100px',
					height : '100px',
					overflow : 'hidden',
					zIndex : 99999,
					opacity : 0
				});

				// Show the container if shim_bgcolor is specified
				bgcolor = uploader.settings.shim_bgcolor;
				if (bgcolor) {
					plupload.extend(inputContainer.style, {
						background : bgcolor,
						opacity : 1
					});
				}

				// set container class
				inputContainer.className = 'plupload_iframe';

				// Append to form
				form.appendChild(inputContainer);

				// Create an input element
				function createInput() {
					// Create element and set attributes
					input = document.createElement('input');
					input.setAttribute('type', 'file');
					input.setAttribute('accept', mimes.join(','));
					input.setAttribute('size', 1);

					// set input styles
					plupload.extend(input.style, {
						width : '100%',
						height : '100%',
						opacity : 0
					});

					// no opacity in IE
					if (IE) {
						plupload.extend(input.style, {
							filter : "alpha(opacity=0)"
						});
					}

					// add change event
					plupload.addEvent(input, 'change', function(e) {
						var n = e.target;

						if (n.value) {
							// Create next input
							createInput();
							n.style.display = 'none';
							addSelectedFiles(n);
						}
					});

					// append to container
					inputContainer.appendChild(input);
					return true;
				}

				// Create input element
				createInput();
			});

			// Refresh button
			uploader.bind("Refresh", function(up) {
				var browseButton, browsePos;

				browseButton = document.getElementById(uploader.settings.browse_button);
				browsePos = plupload.getPos(browseButton);

				plupload.extend(document.getElementById(uploader.id + '_iframe_container').style, {
					top : browsePos.y + 'px',
					left : browsePos.x + 'px',
					width : browseButton.offsetWidth + 'px',
					height : browseButton.offsetHeight + 'px'
				});
			});

			// Upload file
			uploader.bind("UploadFile", function(up, file) {
				var url = up.settings.url;

				// File upload finished
				if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
					return;
				}

				// No input element so set error
				if (!file.input) {
					file.status = plupload.ERROR;
					return;
				}

				// Set input element name attribute which allows it to be submitted
				file.input.setAttribute('name', 'file');

				// Add name
				url = url + (url.indexOf('?') == -1 ? '?' : '&') + 'name=' + escape(file.target_name || file.name);

				// Store action
				form.tmpAction = form.action;
				form.action = url;

				// Store Target
				form.tmpTarget = form.target;
				form.target = iframe.name;

				// set current file
				this.currentfile = file;

				form.submit();
			});

			// Remove files
			uploader.bind("FilesRemoved", function(up, files) {
				var i, n;

				for (i = 0; i < files.length; i++) {
					n = files[i].input;

					// Remove input element
					if (n) {
						n.parentNode.removeChild(n);
					}
				}
			});

			// No features
			uploader.features = {};

			callback({success : TRUE});
		}
	});
})(plupload);

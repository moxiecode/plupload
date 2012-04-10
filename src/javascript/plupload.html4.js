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

// JSLint defined globals
/*global plupload:false, window:false */

(function(window, document, plupload, undef) {
	function getById(id) {
		return document.getElementById(id);
	}

	/**
	 * HTML4 implementation. This runtime has no special features it uses an form that posts files into an hidden iframe.
	 *
	 * @static
	 * @class plupload.runtimes.Html4
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Html4 = plupload.addRuntime("html4", {
		/**
		 * Returns a list of supported features for the runtime.
		 *
		 * @return {Object} Name/value object with supported features.
		 */
		getFeatures : function() {			
			// Only multipart feature
			return {
				multipart: true,
				
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
			uploader.bind("Init", function(up) {
				var container = document.body, iframe, url = "javascript", currentFile,
					input, currentFileId, fileIds = [], IE = /MSIE/.test(navigator.userAgent), mimes = [],
					filters = up.settings.filters, i, ext, type, y;

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
				
				mimes = mimes.join(',');

				function createForm() {
					var form, input, bgcolor, browseButton;

					// Setup unique id for form
					currentFileId = plupload.guid();
					
					// Save id for Destroy handler
					fileIds.push(currentFileId);

					// Create form
					form = document.createElement('form');
					form.setAttribute('id', 'form_' + currentFileId);
					form.setAttribute('method', 'post');
					form.setAttribute('enctype', 'multipart/form-data');
					form.setAttribute('encoding', 'multipart/form-data');
					form.setAttribute("target", up.id + '_iframe');
					form.style.position = 'absolute';

					// Create input and set attributes
					input = document.createElement('input');
					input.setAttribute('id', 'input_' + currentFileId);
					input.setAttribute('type', 'file');
					input.setAttribute('accept', mimes);
					input.setAttribute('size', 1);
					
					browseButton = getById(up.settings.browse_button);
					
					// Route click event to input element programmatically, if possible
					if (up.features.triggerDialog && browseButton) {
						plupload.addEvent(getById(up.settings.browse_button), 'click', function(e) {
							if (!input.disabled) {
								input.click();
							}
							e.preventDefault();
						}, up.id);
					}

					// Set input styles
					plupload.extend(input.style, {
						width : '100%',
						height : '100%',
						opacity : 0,
						fontSize: '99px', // force input element to be bigger then needed to occupy whole space
						cursor: 'pointer'
					});
					
					plupload.extend(form.style, {
						overflow: 'hidden'
					});

					// Show the container if shim_bgcolor is specified
					bgcolor = up.settings.shim_bgcolor;
					if (bgcolor) {
						form.style.background = bgcolor;
					}

					// no opacity in IE
					if (IE) {
						plupload.extend(input.style, {
							filter : "alpha(opacity=0)"
						});
					}

					// add change event
					plupload.addEvent(input, 'change', function(e) {
						var element = e.target, name, files = [], topElement;

						if (element.value) {
							getById('form_' + currentFileId).style.top = -0xFFFFF + "px";

							// Get file name
							name = element.value.replace(/\\/g, '/');
							name = name.substring(name.length, name.lastIndexOf('/') + 1);

							// Push files
							files.push(new plupload.File(currentFileId, name));
							
							// Clean-up events - they won't be needed anymore
							if (!up.features.triggerDialog) {
								plupload.removeAllEvents(form, up.id);								
							} else {
								plupload.removeEvent(browseButton, 'click', up.id);	
							}
							plupload.removeEvent(input, 'change', up.id);

							// Create and position next form
							createForm();

							// Fire FilesAdded event
							if (files.length) {
								uploader.trigger("FilesAdded", files);
							}							
						}
					}, up.id);

					// append to container
					form.appendChild(input);
					container.appendChild(form);

					up.refresh();
				}


				function createIframe() {
					var temp = document.createElement('div');

					// Create iframe using a temp div since IE 6 won't be able to set the name using setAttribute or iframe.name
					temp.innerHTML = '<iframe id="' + up.id + '_iframe" name="' + up.id + '_iframe" src="' + url + ':&quot;&quot;" style="display:none"></iframe>';
					iframe = temp.firstChild;
					container.appendChild(iframe);

					// Add IFrame onload event
					plupload.addEvent(iframe, 'load', function(e) {
						var n = e.target, el, result;

						// Ignore load event if there is no file
						if (!currentFile) {
							return;
						}

						try {
							el = n.contentWindow.document || n.contentDocument || window.frames[n.id].document;
						} catch (ex) {
							// Probably a permission denied error
							up.trigger('Error', {
								code : plupload.SECURITY_ERROR,
								message : plupload.translate('Security error.'),
								file : currentFile
							});

							return;
						}

						// Get result
						result = el.body.innerHTML;
						
						// Assume no error
						if (result) {
							currentFile.status = plupload.DONE;
							currentFile.loaded = 1025;
							currentFile.percent = 100;

							up.trigger('UploadProgress', currentFile);
							up.trigger('FileUploaded', currentFile, {
								response : result
							});
						}
					}, up.id);
				} // end createIframe
				
				if (up.settings.container) {
					container = getById(up.settings.container);
					if (plupload.getStyle(container, 'position') === 'static') {
						container.style.position = 'relative';
					}
				}
				
				// Upload file
				up.bind("UploadFile", function(up, file) {
					var form, input;
					
					// File upload finished
					if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
						return;
					}

					// Get the form and input elements
					form = getById('form_' + file.id);
					input = getById('input_' + file.id);

					// Set input element name attribute which allows it to be submitted
					input.setAttribute('name', up.settings.file_data_name);

					// Store action
					form.setAttribute("action", up.settings.url);

					// Append multipart parameters
					plupload.each(plupload.extend({name : file.target_name || file.name}, up.settings.multipart_params), function(value, name) {
						var hidden = document.createElement('input');

						plupload.extend(hidden, {
							type : 'hidden',
							name : name,
							value : value
						});

						form.insertBefore(hidden, form.firstChild);
					});

					currentFile = file;

					// Hide the current form
					getById('form_' + currentFileId).style.top = -0xFFFFF + "px";
					
					form.submit();
				});
				
				
				
				up.bind('FileUploaded', function(up) {
					up.refresh(); // just to get the form back on top of browse_button
				});				

				up.bind('StateChanged', function(up) {
					if (up.state == plupload.STARTED) {
						createIframe();
					} else if (up.state == plupload.STOPPED) {
						window.setTimeout(function() {
							plupload.removeEvent(iframe, 'load', up.id);
							if (iframe.parentNode) { // #382
								iframe.parentNode.removeChild(iframe);
							}
						}, 0);
					}
					
					plupload.each(up.files, function(file, i) {
						if (file.status === plupload.DONE || file.status === plupload.FAILED) {
							var form = getById('form_' + file.id);

							if(form){
								form.parentNode.removeChild(form);
							}
						}
					});
				});

				// Refresh button, will reposition the input form
				up.bind("Refresh", function(up) {
					var browseButton, topElement, hoverClass, activeClass, browsePos, browseSize, inputContainer, inputFile, zIndex;

					browseButton = getById(up.settings.browse_button);
					if (browseButton) {
						browsePos = plupload.getPos(browseButton, getById(up.settings.container));
						browseSize = plupload.getSize(browseButton);
						inputContainer = getById('form_' + currentFileId);
						inputFile = getById('input_' + currentFileId);
	
						plupload.extend(inputContainer.style, {
							top : browsePos.y + 'px',
							left : browsePos.x + 'px',
							width : browseSize.w + 'px',
							height : browseSize.h + 'px'
						});
						
						// for IE and WebKit place input element underneath the browse button and route onclick event 
						// TODO: revise when browser support for this feature will change
						if (up.features.triggerDialog) {
							if (plupload.getStyle(browseButton, 'position') === 'static') {
								plupload.extend(browseButton.style, {
									position : 'relative'
								});
							}
							
							zIndex = parseInt(browseButton.style.zIndex, 10);

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

						/* Since we have to place input[type=file] on top of the browse_button for some browsers (FF, Opera),
						browse_button loses interactivity, here we try to neutralize this issue highlighting browse_button
						with a special class
						TODO: needs to be revised as things will change */
						hoverClass = up.settings.browse_button_hover;
						activeClass = up.settings.browse_button_active;
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
					}
				});

				// Remove files
				uploader.bind("FilesRemoved", function(up, files) {
					var i, n;

					for (i = 0; i < files.length; i++) {
						n = getById('form_' + files[i].id);
						if (n) {
							n.parentNode.removeChild(n);
						}
					}
				});
				
				uploader.bind("DisableBrowse", function(up, disabled) {
					var input = document.getElementById('input_' + currentFileId);
					if (input) {
						input.disabled = disabled;	
					}
				});
				
				
				// Completely destroy the runtime
				uploader.bind("Destroy", function(up) {
					var name, element, form,
						elements = {
							inputContainer: 'form_' + currentFileId,
							inputFile: 'input_' + currentFileId,	
							browseButton: up.settings.browse_button
						};

					// Unbind event handlers
					for (name in elements) {
						element = getById(elements[name]);
						if (element) {
							plupload.removeAllEvents(element, up.id);
						}
					}
					plupload.removeAllEvents(document.body, up.id);
					
					// Remove mark-up
					plupload.each(fileIds, function(id, i) {
						form = getById('form_' + id);
						if (form) {
							container.removeChild(form);
						}
					});
					
				});

				// Create initial form
				createForm();
			});

			callback({success : true});
		}
	});
})(window, document, plupload);

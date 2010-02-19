/**
 * plupload.browserplus.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

(function(plupload) {
	/**
	 * Yahoo BrowserPlus implementation. This runtime supports these features: dragdrop, jpgresize, pngresize.
	 *
	 * @static
	 * @class plupload.runtimes.BrowserPlus
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.BrowserPlus = plupload.addRuntime("browserplus", {
		/**
		 * Initializes the browserplus runtime.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			var browserPlus = window.BrowserPlus, browserPlusFiles = {}, settings = uploader.settings, resize = settings.resize;

			function addSelectedFiles(native_files) {
				var files, i, selectedFiles = [], file, id;

				// Add the native files and setup plupload files
				for (i = 0; i < native_files.length; i++) {
					file = native_files[i];
					id = plupload.guid();
					browserPlusFiles[id] = file;

					selectedFiles.push(new plupload.File(id, file.name, file.size));
				}

				// Any files selected fire event
				if (i) {
					uploader.trigger("FilesAdded", selectedFiles);
				}
			}

			// Check for browserplus object
			if (browserPlus) {
				browserPlus.init(function(res) {
					var services = [
						{service: "Uploader", version: "3"},
						{service: "DragAndDrop", version: "1"},
						{service: "FileBrowse", version: "1"},
						{service: "FileAccess", version: "2"}
					];

					if (resize) {
						services.push({service : 'ImageAlter', version : "4"});
					}

					if (res.success) {
						browserPlus.require({
							services : services
						}, function() {
							if (res.success) {
								setup();
							} else {
								callback();
							}
						});
					} else {
						callback();
					}
				});
			} else {
				callback();
			}

			// Setup event listeners if browserplus was initialized
			function setup() {
				// Add drop handler
				uploader.bind("PostInit", function() {
					var dropTargetElm, dropElmId = settings.drop_element,
						dropTargetId = uploader.id + '_droptarget',
						dropElm = document.getElementById(dropElmId),
						lastState;

					// Enable/disable drop support for the drop target
					// this is needed to resolve IE bubbeling issues and make it possible to drag/drop
					// files into gears runtimes on the same page
					function addDropHandler(id, end_callback) {
						// Add drop target and listener
						browserPlus.DragAndDrop.AddDropTarget({id : id}, function(res) {
							browserPlus.DragAndDrop.AttachCallbacks({
								id : id,
								hover : function(res) {
									if (!res && end_callback) {
										end_callback();
									}
								},
								drop : function(res) {
									if (end_callback) {
										end_callback();
									}

									addSelectedFiles(res);
								}
							}, function() {
							});
						});
					}

					function hide() {
						document.getElementById(dropTargetId).style.top = '-1000px';
					}

					if (dropElm) {
						// Since IE has issues with bubbeling when it comes to the drop of files
						// we need to do this hack where we show a drop target div element while dropping
						if (document.attachEvent && (/MSIE/gi).test(navigator.userAgent)) {
							// Create drop target
							dropTargetElm = document.createElement('div');
							dropTargetElm.setAttribute('id', dropTargetId);
							plupload.extend(dropTargetElm.style, {
								position : 'absolute',
								top : '-1000px',
								background : 'red',
								filter : 'alpha(opacity=0)',
								opacity : 0
							});

							document.body.appendChild(dropTargetElm);

							plupload.addEvent(dropElm, 'dragenter', function(e) {
								var dropElm, dropElmPos;

								dropElm = document.getElementById(dropElmId);
								dropElmPos = plupload.getPos(dropElm);

								plupload.extend(document.getElementById(dropTargetId).style, {
									top : dropElmPos.y + 'px',
									left : dropElmPos.x + 'px',
									width : dropElm.offsetWidth + 'px',
									height : dropElm.offsetHeight + 'px'
								});
							});

							addDropHandler(dropTargetId, hide);
						} else {
							addDropHandler(dropElmId);
						}
					}

					plupload.addEvent(document.getElementById(settings.browse_button), 'click', function(e) {
						var mimeTypes = [], i, a, filters = settings.filters, ext;

						e.preventDefault();

						// Convert extensions to mimetypes
						for (i = 0; i < filters.length; i++) {
							ext = filters[i].extensions.split(',');

							for (a = 0; a < ext.length; a++) {
								mimeTypes.push(plupload.mimeTypes[ext[a]]);
							}
						}

						browserPlus.FileBrowse.OpenBrowseDialog({
							mimeTypes : mimeTypes
						}, function(res) {
							if (res.success) {
								addSelectedFiles(res.value);
							}
						});
					});

					// Prevent IE leaks
					dropElm = dropTarget = 0;
				});

				uploader.bind("UploadFile", function(up, file) {
					var nativeFile = browserPlusFiles[file.id], urlParams = {},
					    chunkSize = up.settings.chunk_size, loadProgress, chunkStack = [];

					function uploadFile(chunk, chunks) {
						urlParams.name = file.target_name || file.name;

						// only send chunk parameters if file is chunked
						if (chunks > 1) {
							urlParams.chunk = chunk;
							urlParams.chunks = chunks;
						}

					    chunk_file = chunkStack.shift();

						browserPlus.Uploader.upload({
							url : plupload.buildUrl(up.settings.url, urlParams),
							files : {file : chunk_file},
							cookies : document.cookies,
							postvars : up.settings.multipart_params,
							progressCallback : function(res) {
								var i, loaded = 0;

								// since more than 1 chunk can be sent at a time, keep track of how many bytes
								// of each chunk was sent
								loadProgress[chunk] = parseInt(res.filePercent * chunk_file.size / 100, 10);
								for (i = 0; i < loadProgress.length; i++) {
									loaded += loadProgress[i];
								}

								file.loaded = loaded;
								up.trigger('UploadProgress', file);
							}
						}, function(res) {
							if (res.success) {
							    if (chunkStack.length > 0) {
									// more chunks to be uploaded
									uploadFile(++chunk, chunks);
							    } else {
									file.status = plupload.DONE;

									up.trigger('FileUploaded', file, {
										response : res.value.body,
										status : res.value.statusCode
									});
							    }
							}
						});
					}

					function chunkAndUploadFile(native_file) {
						file.size = native_file.size;
						if (uploader.features.chunks) {
							browserPlus.FileAccess.chunk({file : native_file, chunkSize : chunkSize}, function(cr) {
								if (cr.success) {
									var chunks = cr.value, len = chunks.length;

									loadProgress = Array(len);

									for (var i = 0; i < len; i++) {
										loadProgress[i] = 0;
										chunkStack.push(chunks[i]);
									}

									uploadFile(0, len);
								}
							});
						} else {
							chunkStack.push(native_file);
							uploadFile(0, 1);
						}
					}

					// Resize image if it's a supported format and resize is enabled
					if (resize && /\.(png|jpg|jpeg)$/i.test(file.name)) {
						BrowserPlus.ImageAlter.transform({
							file : nativeFile,
							quality : resize.quality || 90,
							actions : [{
								scale : {
									maxwidth : resize.width,
									maxheight : resize.height
								}
							}]
						}, function(res) {
							if (res.success) {
								chunkAndUploadFile(res.value.file);
							}
						});
					} else {
						chunkAndUploadFile(nativeFile);
					}
				});

				uploader.features = {
					dragdrop : true,
					jpgresize : true,
					pngresize : true,
					chunks : true
				};

				callback({success : true});
			}
		}
	});
})(plupload);

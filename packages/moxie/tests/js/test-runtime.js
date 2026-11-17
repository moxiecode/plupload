;(function(Basic, x, Runtime, Url, File, Blob, FormData, Env) {

	var type = "test", extensions = {};

	
	function TestRuntime(options) {
		var I = this
		, True = Runtime.capTrue
		, False = Runtime.capFalse
		;

		Runtime.call(this, options, type, {
			access_binary: False,
			access_image_binary: False,
			display_media: False,
			do_cors: True,
			drag_and_drop: True,
			return_response_headers: True,
			return_response_type: True,
			report_upload_progress: True,
			resize_image: False,
			select_file: True,
			select_folder: False,
			select_multiple: True,
			send_binary_string: True,
			send_custom_headers: True,
			send_multipart: True,
			slice_blob: True,
			stream_upload: True,
			summon_file_dialog: False,
			upload_filesize: True,
			use_http_method: True
		});

		Basic.extend(this, {

			init : function() {
				this.trigger("Init");
			},

			destroy: (function(destroy) { // extend default destroy method
				return function() {
					destroy.call(I);
					destroy = I = null;
				};
			}(this.destroy))
		});


		Basic.extend(this.getShim(), {
		
			FileInput: function() {
				var _files = [];

				Basic.extend(this, {
					init: function() {
						// ready event is perfectly asynchronous
						this.trigger({
							type: 'ready',
							async: true
						});
					},

					setFiles: function(files) {
						var comp = this, I = this.getRuntime();

						Basic.each(this.files, function(file) {							
							file = new File(I.uid, file);
							file.relativePath = '/fakepath';

							comp.files.push(file);
						});

						if (comp.files.length) {
							comp.trigger('change');
						}
					},

					destroy: function() {
						_files = null;
					}
				});
			},


			XMLHttpRequest: function() {
				var _state = XMLHttpRequest.OPENED, _status = 0, _meta;

				Basic.extend(this, {
					send: function(meta, data) {
						var target = this
						, upSpeed = 200 * 1024 // kb/s
						, downSpeed = 100 * 1024
						, upSize = 100 * 1024
						, downSize = 10 * 1024
						, uploaded = 0
						, downloaded = 0
						, interval = 50 // ms
						, upDelta = interval / 1000 * upSpeed
						, downDelta = interval / 1000 * downSpeed
						;

						_meta = meta;

						if (data instanceof Blob) {
							upSize = data.size;
						} else if (data instanceof FormData && data.hasBlob()) {
							upSize = data.getBlob().size;
						}

						function updateUpProgress() {
							if (_state === XMLHttpRequest.DONE) {
								return;
							}

							uploaded += Math.floor(upDelta);

							if (uploaded < upSize) {
								target.trigger({
									type: 'UploadProgress',
									loaded: uploaded,
									total: upSize
								});
								setTimeout(updateUpProgress, interval);
							} else {
								target.trigger({
									type: 'UploadProgress',
									loaded: upSize,
									total: upSize
								});
								updateDownProgress();
							}
						}

						function updateDownProgress() {
							if (_state === XMLHttpRequest.DONE) {
								return;
							}

							downloaded += Math.floor(downDelta);

							if (downloaded < downSize) {
								target.trigger({
									type: 'Progress',
									loaded: downloaded,
									total: downSize
								});
								setTimeout(updateDownProgress, interval);
							} else {
								target.trigger({
									type: 'Progress',
									loaded: downSize,
									total: downSize
								});
								_state = XMLHttpRequest.DONE;

								// if meta.url is set to http code, trigger error with that code and exit
								var errCodes = ['404'];
								var m = meta.url.match(new RegExp('('+errCodes.join('|')+')$'));
								if (m) {
									_status = m[1];
								} else {
									_status = 200;
								}
								
								target.trigger('Load', meta);
							}
						}

						target.trigger('LoadStart');
						_state = XMLHttpRequest.LOADING;
						updateUpProgress();
					},

					getStatus: function() {
						return _status;
					},

					getResponse: function(responseType) {
						var response = '{"jsonrpc" : "2.0", "result" : null, "id" : "id"}';

						if (_state !== XMLHttpRequest.DONE) {
							return Basic.inArray(responseType, ["", "text"]) !== -1 ? '' : null;
						}
						return responseType === 'json' && !!window.JSON ? JSON.parse(response) : response;
					},

					getAllResponseHeaders: function() {
						var now = new Date()
						, headers = [
							"Cache-Control:no-store, no-cache, must-revalidate",
							"Cache-Control:post-check=0, pre-check=0",
							"Connection:Keep-Alive",
							"Content-Length:49",
							"Content-Type:text/html",
							"Date:" + now.toUTCString(),
							"Expires:Mon, 26 Jul 1997 05:00:00 GMT",
							"Keep-Alive:timeout=15, max=96",
							"Last-Modified:" + now.toUTCString(),
							"Pragma:no-cache",
							"Server:Apache/2.0.64 (Unix) PHP/5.3.5 DAV/2",
							"X-Powered-By:PHP/5.3.5"
						];


						Basic.each(_meta, function(value, key) {
							if (Basic.typeOf(value) !== 'undefined') {
								headers.push('meta-' + key + '::' + JSON.stringify(value));
							}
						});


						if (_state > XMLHttpRequest.OPENED) {
							return headers.join('\r\n');
						}
						return '';
					},

					abort: function() {
						_state = XMLHttpRequest.DONE;
						_status = 0;
						this.trigger('Abort');
					},

					destroy: function() {
						_status = 0;
						_meta = {};
					}
				});


				XMLHttpRequest.UNSENT = 0;
				XMLHttpRequest.OPENED = 1;
				XMLHttpRequest.HEADERS_RECEIVED = 2;
				XMLHttpRequest.LOADING = 3;
				XMLHttpRequest.DONE = 4;
			}
		});
	}

	Runtime.addConstructor(type, TestRuntime);
}(
	moxie.core.utils.Basic,
	moxie.core.Exceptions,
	moxie.runtime.Runtime,
	moxie.core.utils.Url,
	moxie.file.File,
	moxie.file.Blob,
	moxie.xhr.FormData,
	moxie.core.Exceptions,
	moxie.core.utils.Env
));

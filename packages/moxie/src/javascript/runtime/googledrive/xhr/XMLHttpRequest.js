/**
 * XMLHttpRequest.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/googledrive/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/googledrive/xhr/XMLHttpRequest", [
	"moxie/runtime/googledrive/Runtime",
	"moxie/runtime/html5/xhr/XMLHttpRequest",
	"moxie/file/File",
	"moxie/file/FileReader",
	"moxie/runtime/googledrive/file/FileReader",
	"moxie/xhr/FormData",
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/runtime/RuntimeTarget",
	"moxie/core/utils/Loader"
], function(extensions, Html5XHR, File, FileReader, GoogleDriveFileReader, FormData, Basic, x, RuntimeTarget, Loader) {
	
	function XMLHttpRequest() {
		var self = this;

		Html5XHR.call(this);

		var Html5Send = this.send;

		Basic.extend(this, {
			send: function(meta, data) {
				var target = this, file, fr, xhr;

				if (data instanceof FormData && data.hasBlob()) {
					file = data.getBlob();

					fr = new FileReader();

					fr.onprogress = function(e) {
						target.trigger({
							type: 'UploadProgress',
							loaded: Loader.interpolateProgress(e.loaded, e.total, 1, 2),
							total: e.total
						});
					};

					fr.onload = function() {
						data.append(data.getBlobName(), new File(null, {
							name: file.name || '',
							type: file.type,
							size: file.size,
							lastModifiedDate: file.lastModifiedDate,
							data: this.result
						}));

						file.destroy();

						// we are going to intercept progress events (and inevitably some others) for smoother feedback
						xhr = new RuntimeTarget();

						xhr.bind('LoadStart Progress Abort Error', function(e) {
							target.trigger(e);
						});

						xhr.bind('UploadProgress', function(e) {
							target.trigger({
								type: 'UploadProgress',
								loaded: Loader.interpolateProgress(e.loaded, e.total, 2, 2),
								total: e.total
							});
						});

						xhr.bind('Load', function(e) {
							target.trigger(e);
						});

						xhr.bind('RuntimeInit', function(e, runtime) {
							Html5Send.call(xhr, meta, data);
						});

						xhr.bind('RuntimeError', function(e, err) {
							target.dispatchEvent('RuntimeError', err);
						});

						xhr.connectRuntime({
							runtime_order: 'html5'
						});
					};

					fr.readAsBinaryString(file);
				}

			},

			destroy: function() {
				this.getRuntime().getShim().removeInstance(this.uid);
			}
		});
	}

	return (extensions.XMLHttpRequest = XMLHttpRequest);
});



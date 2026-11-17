/**
 * FileInput.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/googledrive/file/FileInput
@private
*/
define("moxie/runtime/googledrive/file/FileInput", [
	"moxie/runtime/googledrive/Runtime",
	"moxie/file/File",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, File, Basic, Dom, Events, Mime, Env) {

	function FileInput() {
		var _picker, _options, _disabled = false;

		function createPicker(cb) {
			var comp = this
			, I = comp.getRuntime()
			, scope = ['https://www.googleapis.com/auth/drive.readonly']
			;

			gapi.auth.authorize({
				'client_id': _options.googledrive.clientId,
				'scope': scope,
				'immediate': false
			}, function(authResult) {
				if (!authResult || authResult.error) {
					return;
				}

				var PickerBuilder = new google.picker.PickerBuilder()
					.addView(google.picker.ViewId.DOCS)
					.setOAuthToken(authResult.access_token)
					.setDeveloperKey(_options.googledrive.apiKey)
					;

				if (_options.multiple) {
					PickerBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
				}

				PickerBuilder.setCallback(function(data) {
					var queue = [];

					comp.files = [];

					if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
						// get minimal file info
						Basic.each(data[google.picker.Response.DOCUMENTS], function(doc) {
							queue.push(function(cb) {
								gapi.client.drive.files.get({
									fileId: doc.id
								})
								.execute(function(r) {
									comp.files.push(new File(I.uid, {
										name: r.originalFilename,
										type: r.mimeType,
										size: parseInt(r.fileSize, 10),
										lastModifiedDate: r.modifiedDate,
										gdid: r.id,
										downloadUrl: r.downloadUrl,
										thumbnail: r.thumbnailLink,
										resource: r
									}));
									cb();
								});
							});
						});

						Basic.inParallel(queue, function(err) {
							if (!err && comp.files.length) {
								comp.trigger('change');
							}
						});
					}
				});

				_picker = PickerBuilder.build();

				cb();
			});
		}

		Basic.extend(this, {
			init: function(options) {
				var comp = this, I = comp.getRuntime(), input, shimContainer, mimes, browseButton, zIndex, top;

				_options = options;

				// figure out accept string
				mimes = Mime.extList2mimes(_options.accept, I.can('filter_by_extension'));

				gapi.load('picker', {
					callback: function() {
						Events.addEvent(Dom.get(_options.browse_button), 'click', function(e) {
							if (_disabled) {
								return;
							}

							if (_picker) {
								_picker.setVisible(true);
							} else {
								createPicker.call(comp, function() {
									_picker.setVisible(true);
								});
							}
							e.preventDefault();
						}, comp.uid);

						comp.trigger({
							type: 'ready',
							async: true
						});
					}
				});
			},


			disable: function(state) {
				_disabled = state;
			},


			destroy: function() {
				var I = this.getRuntime()
				, shim = I.getShim()
				;

				Events.removeAllEvents(_options && Dom.get(_options.browse_button), this.uid);

				shim.removeInstance(this.uid);

				// destroy _picker

				_options = shim = null;
			}
		});
	}

	return (extensions.FileInput = FileInput);
});
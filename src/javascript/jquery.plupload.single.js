/**
 * jquery.plupload.single.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

// JSLint defined globals
/*global plupload:false, jQuery:false */

(function($) {
	var uploaders = {};

	function renderUI(id, target) {
		target.html(
			'<div class="plupload_single" id="' + id + '_browse">' +
				'<div class="plupload_container">' +
					'<input type="text" class="plupload_file_name" value="" />' +
					'<input type="button" class="plupload_browse" value="Browse&hellip;" />' + 
					'<span class="plupload_status"></span>' +
				'</div>' +
			'</div>'
		);
	}

	$.fn.pluploadSingle = function(settings) {
		if (settings) {
			this.each(function() {
				var uploader, target, id;

				uploader = new plupload.Uploader(settings);
				target = $(this);
				id = target.attr('id');

				if (!id) {
					id = plupload.guid();
					target.attr('id', id);
				}

				uploader.settings.browse_button = id + '_browse';
				uploader.settings.multi_selection = false;

				uploaders[id] = uploader;

				uploader.bind('PreInit', function() {
					renderUI(id, target);

					$('.plupload_file_name,.plupload_browse', target).click(function(e) {
						uploader.browse();
						e.preventDefault();
					});

					// Set unique target filenames
					if (uploader.settings.unique_names) {
						uploader.bind("UploadFile", function(up, file) {
							file.target_name = (uploader.settings.salt || '') + file.id + '.tmp';
						});
					}

					uploader.bind('QueueChanged', function(up) {
						var file;

						if (up.files.length) {
							file = up.files[up.files.length - 1];

							$('.plupload_file_name', target).val(file.name).attr('disabled', 'disabled');
							$('.plupload_status', target).html('Size: ' + plupload.formatSize(file.size));
							$('.plupload_browse', target).attr('disabled', 'disabled');

							up.start();
						}
					});

					uploader.bind("UploadProgress", function(up, file) {
						if (file.status == plupload.DONE) {
							$('.plupload_status', target).html('File uploaded.');
						} else {
							$('.plupload_status', target).html('Uploading: ' + file.percent + '%');
						}
					});

					uploader.bind('FileUploaded', function(up, file) {
						if (file.status == plupload.DONE) {
							if (file.target_name) {
								target.append('<input type="hidden" name="' + id + '_tmpname" value="' + plupload.xmlEncode(file.target_name) + '" />');
							}

							target.append('<input type="hidden" name="' + id + '_name" value="' + plupload.xmlEncode(file.name) + '" />');
						} else {
							$('.plupload_file_name,.plupload_browse', target).attr('disabled', '');
						}
					});
				});

				uploader.init();
			});

			return this;
		} else {
			// Get uploader instance for specified element
			return uploaders[$(this[0]).attr('id')];
		}
	};
})(jQuery);

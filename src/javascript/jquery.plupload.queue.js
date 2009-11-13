/**
 * jquery.plupload.queue.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload/license
 * Contributing: http://www.plupload/contributing
 */

(function($) {
	var uploaders = {};

	function _(str) {
		return str;
	};

	function renderUI(id, target) {
		target.html(
			'<div class="plupload_wrapper plupload_scroll">' +
				'<div class="plupload_container">' +
					'<div class="plupload">' +
						'<div class="plupload_header">' +
							'<div class="plupload_header_content">' +
								'<div class="plupload_header_title">' + _('Select files') + '</div>' +
								'<div class="plupload_header_text">' + _('Add files to the upload queue and click the start button.') + '</div>' +
							'</div>' +
						'</div>' +

						'<div class="plupload_content">' +
							'<div class="plupload_filelist_header">' +
								'<div class="plupload_file_name">' + _('Filename') + '</div>' +
								'<div class="plupload_file_action">&nbsp;</div>' +
								'<div class="plupload_file_status"><span>' + _('Status') + '</span></div>' +
								'<div class="plupload_file_size">' + _('Size') + '</div>' +
								'<div class="plupload_clearer">&nbsp;</div>' +
							'</div>' +

							'<ul class="plupload_filelist"></ul>' +

							'<div class="plupload_filelist_footer">' +
								'<div class="plupload_file_name">' +
									'<a href="#" title="' + _('Add files to queue') + '" class="plupload_add">' + 
										'<span class="plupload_add_icon"></span>' + 
										'<span class="plupload_add_text">' + _('Add files.') + '</span><br class="plupload_clear" />' +
									'</a>' +
									'<span class="plupload_upload_status"></span>' +
								'</div>' +
								'<div class="plupload_file_action">' +
									'<a href="#" class="plupload_stop" title="' + _('Stop current upload') + '"></a>' +
									'<a href="#" class="plupload_start" title="' + _('Start uploading queue') + '"></a><br class="plupload_clear" />' + 
								'</div>' +
								'<div class="plupload_file_status"><span class="plupload_total_status">0%</span></div>' +
								'<div class="plupload_file_size"><span class="plupload_total_file_size">0 b</span></div>' +
								'<div class="plupload_progress">' +
									'<div class="plupload_progress_container">' +
										'<div class="plupload_progress_bar" style="width:0"></div>' +
									'</div>' +
								'</div>' +
								'<div class="plupload_clearer">&nbsp;</div>' +
							'</div>' +
						'</div>' +
					'</div>' +
				'</div>' +
				'<input type="hidden" id="' + id + '_count" name="' + id + '_count" value="0" />' +
			'</div>'
		);
	};

	$.fn.pluploadQueue = function(settings) {
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

				uploaders[id] = uploader;

				function handleStatus(file) {
					var actionClass;

					if (file.status == plupload.DONE)
						actionClass = 'plupload_done';

					if (file.status == plupload.FAILED)
						actionClass = 'plupload_failed';

					if (file.status == plupload.QUEUED)
						actionClass = 'plupload_delete';

					if (file.status == plupload.UPLOADING)
						actionClass = 'plupload_uploading';

					$('#' + file.id).attr('class', actionClass).find('a').css('display', 'block');
				};

				function updateList() {
					var fileList = $('ul.plupload_filelist', target).html(''), inputCount = 0, inputHTML;

					$.each(uploader.files, function(i, file) {
						inputHTML = '';

						if (file.status == plupload.DONE) {
							if (file.target_name)
								inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_tmpname" value="' + plupload.xmlEncode(file.target_name) + '" />';

							inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_name" value="' + plupload.xmlEncode(file.name) + '" />';
							inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_status" value="' + (file.status == plupload.DONE ? 'done' : 'failed') + '" />';
	
							inputCount++;

							$('#' + id + '_count').val(inputCount);
						}

						fileList.append(
							'<li id="' + file.id + '">' +
								'<div class="plupload_file_name">' + file.name + '</div>' +
								'<div class="plupload_file_action"><a href="#"></a></div>' +
								'<div class="plupload_file_status">' + file.percent + '%</div>' +
								'<div class="plupload_file_size">' + plupload.formatSize(file.size) + '</div>' +
								'<div class="plupload_clearer">&nbsp;</div>' +
								inputHTML +
							'</li>'
						);

						handleStatus(file);

						$('#' + file.id + '.plupload_delete a').click(function(e) {
							$('#' + file.id).remove();
							uploader.removeFile(file);

							e.preventDefault();
						});
					});

					$('span.plupload_total_file_size', target).html(plupload.formatSize(uploader.total.size));

					if (uploader.total.queued == 0)
						$('span.plupload_add_text', target).text(_('Add files.'));
					else
						$('span.plupload_add_text', target).text(uploader.total.queued + ' files queued.');

					$('a.plupload_start', target).toggleClass('plupload_disabled', uploader.files.length == 0);

					// Scroll to end of file list
					fileList[0].scrollTop = fileList[0].scrollHeight;

					updateTotalProgress();
				};

				function updateTotalProgress() {
					$('span.plupload_total_status', target).html(uploader.total.percent + '%');
					$('div.plupload_progress_bar', target).css('width', uploader.total.percent + '%');
					$('span.plupload_upload_status', target).text('Uploaded ' + uploader.total.uploaded + '/' + uploader.files.length + ' files');

					// All files are uploaded
					if (uploader.total.uploaded == uploader.files.length)
						uploader.stop();
				};

				// Set unique target filenames
				if (uploader.settings.unique_names) {
					uploader.bind("UploadFile", function(up, file) {
						file.target_name = (uploader.settings.salt || '') + file.id + '.tmp';
						$('#' + file.id).addClass('plupload_current_file');
					});
				}

				uploader.bind('PreInit', function() {
					renderUI(id, target);

					$('a.plupload_add', target).click(function(e) {
						uploader.browse();
						e.preventDefault();
					}).css('display', 'block').attr('id', id + '_browse');

					uploader.settings.browse_button = id + '_browse';

					$('a.plupload_start', target).click(function(e) {
						if (!$(this).hasClass('plupload_disabled'))
							uploader.start();

						e.preventDefault();
					});

					$('a.plupload_stop', target).click(function(e) {
						uploader.stop();

						e.preventDefault();
					});

					$('a.plupload_start', target).css('display', 'block').addClass('plupload_disabled');
				});

				uploader.init();

				uploader.bind('StateChanged', function() {
					if (uploader.state === plupload.STARTED) {
						$('a.plupload_delete,a.plupload_start,a.plupload_add', target).hide();
						$('span.plupload_upload_status,div.plupload_progress,a.plupload_stop', target).css('display', 'block');
						$('span.plupload_upload_status', target).text('Uploaded 0/' + uploader.files.length + ' files');
					} else {
						$('a.plupload_stop,div.plupload_progress,span.plupload_upload_status', target).hide();
						$('a.plupload_delete,a.plupload_add,a.plupload_start', target).css('display', 'block');
					}
				});

				uploader.bind('QueueChanged', updateList);

				uploader.bind('StateChanged', function(up) {
					if (up.state == plupload.STOPPED)
						updateList();
				});

				uploader.bind('FileUploaded', function(up, file) {
					handleStatus(file);
				});

				uploader.bind("UploadProgress", function(up, file) {
					// Set file specific progress
					$('#' + file.id + ' div.plupload_file_status', target).html(file.percent + '%');

					handleStatus(file);
					updateTotalProgress();
				});
			});

			return this;
		} else {
			// Get uploader instance for specified element
			return uploaders[$(this[0]).attr('id')];
		}
	};
})(jQuery);

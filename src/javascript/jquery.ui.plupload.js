/**
 * jquery.ui.plupload.js
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

	function _(str) {
		return plupload.translate(str) || str;
	}

	function renderUI(id, target) {
		// Remove all existing non plupload items
		target.contents().each(function(i, node) {
			node = $(node);

			if (!node.is('.plupload')) {
				node.remove();
			}
		});

		target.prepend(
			'<div class="plupload_wrapper">' +
				'<div id="' + id + '_container" class="ui-widget-content plupload_container">' +
					'<div class="plupload">' +
						'<div class="ui-state-default ui-widget-header plupload_header">' +
							'<div class="plupload_header_content">' +
								'<div class="plupload_header_title">' + _('Select files') + '</div>' +
								'<div class="plupload_header_text">' + _('Add files to the upload queue and click the start button.') + '</div>' +
							'</div>' +
						'</div>' +

						'<div class="plupload_content">' +
							'<table class="plupload_filelist">' +
							'<tr class="ui-widget-header plupload_filelist_header">' +
								'<td class="plupload_cell plupload_file_name">' + _('Filename') + '</td>' +
								'<td class="plupload_cell plupload_file_status">' + _('Status') + '</td>' +
								'<td class="plupload_cell plupload_file_size">' + _('Size') + '</td>' +
								'<td class="plupload_cell plupload_file_action">&nbsp;</td>' +
							'</tr>' +
							'</table>' +

							'<div class="plupload_scroll">' +
								'<table class="plupload_filelist" id="' + id + '_filelist"></table>' +
							'</div>' +

							'<table class="plupload_filelist">' +
							'<tr class="ui-widget-header ui-widget-content plupload_filelist_footer">' +
								'<td class="plupload_cell plupload_file_name">' +

									'<div class="plupload_buttons"><!-- Visible -->' +
										'<a id="' + id + '_browse" class="plupload_button plupload_add plupload ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon"><span class="ui-button-icon-primary ui-icon ui-icon-circle-plus"></span><span class="ui-button-text">' + _('Add Files') + '</span></a>' +
										'<a class="plupload_button plupload_start ui-button ui-widget ui-state-default ui-corner-all ui-button-text-icon"><span class="ui-button-icon-primary ui-icon ui-icon-circle-arrow-e"></span><span class="ui-button-text">' + _('Start Upload') + '</span></a>' +
									'</div>' +

									'<div class="plupload_started plupload_hidden"><!-- Hidden -->' +

										'<div class="plupload_progress plupload_right">' +
											'<div class="plupload_progress_container ui-progressbar ui-widget ui-widget-content ui-corner-all">' +
												'<div class="plupload_progress_bar ui-progressbar-value ui-widget-header ui-corner-left"></div>' +
											'</div>' +
										'</div>' +

										'<div class="plupload_cell plupload_upload_status"></div>' +

										'<div class="plupload_clearer">&nbsp;</div>' +

									'</div>' +
								'</td>' +
								'<td class="plupload_file_status"><span class="plupload_total_status">0%</span></td>' +
								'<td class="plupload_file_size"><span class="plupload_total_file_size">400 kb</span></td>' +
								'<td class="plupload_file_action"></td>' +
							'</tr>' +
							'</table>' +
						'</div>' +
					'</div>' +
				'</div>' +
				'<input id="' + id + '_count" name="' + id + '_count" value="0" type="hidden">' +
			'</div>'
		);
	}

	$.fn.pluploadQueue = function(settings) {
		if (settings) {
			this.each(function() {
				var uploader, target, id;

				target = $(this);
				id = target.attr('id');

				if (!id) {
					id = plupload.guid();
					target.attr('id', id);
				}

				uploader = new plupload.Uploader($.extend({
					dragdrop : true,
					container : id
				}, settings));

				uploaders[id] = uploader;

				function handleStatus(file) {
					var actionClass, iconClass;

					if (file.status == plupload.DONE) {
						actionClass = 'plupload_done';
						iconClass = 'ui-icon ui-icon-circle-check';
					}

					if (file.status == plupload.FAILED) {
						actionClass = 'ui-state-error plupload_failed';
						iconClass = 'ui-icon ui-icon-alert';
					}

					if (file.status == plupload.QUEUED) {
						actionClass = 'plupload_delete';
						iconClass = 'ui-icon ui-icon-circle-minus';
					}

					if (file.status == plupload.UPLOADING) {
						actionClass = 'ui-state-highlight plupload_uploading';
						iconClass = 'ui-icon ui-icon-circle-arrow-w';
					}

					actionClass += ' ui-state-default plupload_file';

					$('#' + file.id).attr('class', actionClass).find('.ui-icon').attr('class', iconClass);
				}

				function updateTotalProgress() {
					$('.plupload_total_status', target).html(uploader.total.percent + '%');
					$('.plupload_progress_bar', target).css('width', uploader.total.percent + '%');
					$('.plupload_upload_status', target).text('Uploaded ' + uploader.total.uploaded + '/' + uploader.files.length + ' files');

					// All files are uploaded
					if (uploader.total.uploaded == uploader.files.length) {
						uploader.stop();
					}
				}

				function updateList() {
					var fileList = $('#' + id + '_filelist', target).html(''), inputCount = 0, inputHTML;

					$.each(uploader.files, function(i, file) {
						inputHTML = '';

						if (file.status == plupload.DONE) {
							if (file.target_name) {
								inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_tmpname" value="' + plupload.xmlEncode(file.target_name) + '" />';
							}

							inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_name" value="' + plupload.xmlEncode(file.name) + '" />';
							inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_status" value="' + (file.status == plupload.DONE ? 'done' : 'failed') + '" />';

							inputCount++;

							$('#' + id + '_count').val(inputCount);
						}

						fileList.append(
							'<tr class="ui-state-default plupload_file" id="' + file.id + '">' +
								'<td class="plupload_cell plupload_file_name"><span>' + file.name + '</span></td>' +
								'<td class="plupload_cell plupload_file_status">' + file.percent + '%</td>' +
								'<td class="plupload_cell plupload_file_size">' + plupload.formatSize(file.size) + '</td>' +
								'<td class="plupload_cell plupload_file_action"><div class="ui-icon"></div>' + inputHTML + '</td>' +
							'</tr>'
						);

						handleStatus(file);

						$('#' + file.id + '.plupload_delete .ui-icon').click(function(e) {
							$('#' + file.id).remove();
							uploader.removeFile(file);

							e.preventDefault();
						});
					});

					$('.plupload_total_file_size', target).html(plupload.formatSize(uploader.total.size));

					if (uploader.total.queued === 0) {
						$('.plupload_add_text', target).text(_('Add files.'));
					} else {
						$('.plupload_add_text', target).text(uploader.total.queued + ' files queued.');
					}

					$('.plupload_start', target).toggleClass('ui-state-disabled', uploader.files.length == (uploader.total.uploaded + uploader.total.failed));

					// Scroll to end of file list
					fileList[0].scrollTop = fileList[0].scrollHeight;

					updateTotalProgress();

					// Re-add drag message if there is no files
					if (!uploader.files.length && uploader.features.dragdrop && uploader.settings.dragdrop) {
						$('#' + id + '_filelist').append('<tr><td class="plupload_droptext">' + _("Drag files here.") + '</td></tr>');
					}
				}

				uploader.bind("UploadFile", function(up, file) {
					$('#' + file.id).addClass('ui-state-highlight plupload_current_file');
				});

				uploader.bind('Init', function(up, res) {
					renderUI(id, target);

					// Enable rename support
					if (!settings.unique_names && settings.rename) {
						$('#' + id + '_filelist .plupload_file_name span', target).live('click', function(e) {
							var targetSpan = $(e.target), file, parts, name, ext = "";

							// Get file name and split out name and extension
							file = up.getFile(targetSpan.parents('li')[0].id);
							name = file.name;
							parts = /^(.+)(\.[^.]+)$/.exec(name);
							if (parts) {
								name = parts[1];
								ext = parts[2];
							}

							// Display input element
							targetSpan.hide().after('<input type="text" />');
							targetSpan.next().val(name).focus().blur(function() {
								targetSpan.show().next().remove();
							}).keydown(function(e) {
								var targetInput = $(this);

								if (e.keyCode == 13) {
									e.preventDefault();

									// Rename file and glue extension back on
									file.name = targetInput.val() + ext;
									targetSpan.text(file.name);
									targetInput.blur();
								}
							});
						});
					}

					$('.plupload_add', target).attr('id', id + '_browse');

					up.settings.browse_button = id + '_browse';

					// Enable drag/drop
					if (up.features.dragdrop && up.settings.dragdrop) {
						up.settings.drop_element = id + '_filelist';
						$('#' + id + '_filelist').append('<tr><td class="plupload_droptext">' + _("Drag files here.") + '</td></tr>');
					}

					$('#' + id + '_container').attr('title', 'Using runtime: ' + res.runtime);

					$('.plupload_start', target).click(function(e) {
						if (!$(this).hasClass('ui-state-disabled')) {
							uploader.start();
						}

						e.preventDefault();
					});

					$('.plupload_stop', target).click(function(e) {
						uploader.stop();

						e.preventDefault();
					});

					$('.plupload_start', target).addClass('ui-state-disabled');
				});

				uploader.init();

				// Call setup function
				if (settings.setup) {
					settings.setup(uploader);
				}

				uploader.bind("Error", function(up, err) {
					var file = err.file, message;

					if (file) {
						message = err.message;

						if (err.details) {
							message += " (" + err.details + ")";
						}

						$('#' + file.id)
							.attr('class', 'ui-state-error plupload_failed')
								.find('.ui-icon')
									.attr({
										'class': 'ui-icon ui-icon-alert',
										'title': message
									});
					}
				});

				uploader.bind('StateChanged', function() {
					if (uploader.state === plupload.STARTED) {
						//$('.plupload_upload_status,.plupload_progress,.plupload_stop', target).css('display', 'block');
						$('.plupload_start,.plupload_add', target).addClass('ui-state-disabled');
						$('.plupload_buttons,.plupload_started,.plupload_progress', target).removeClass('plupload_hidden');
						$('.plupload_upload_status', target).text('Uploaded ' + uploader.total.uploaded + '/' + uploader.files.length + ' files');
						$('.plupload_header_content', target).addClass('plupload_header_content_bw');
					} else {
						if (settings.multiple_queues) {
							$('.plupload_start,.plupload_add', target).removeClass('ui-state-disabled');
						}

						$('.plupload_progress', target).toggleClass('plupload_hidden');
						updateList();
					}
				});

				uploader.bind('QueueChanged', updateList);

				uploader.bind('FileUploaded', function(up, file) {
					handleStatus(file);
				});

				uploader.bind("UploadProgress", function(up, file) {
					// Set file specific progress
					$('#' + file.id + ' .plupload_file_status', target).html(file.percent + '%');

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

	if ($.ui && $.widget) {
		$.widget("ui.plupload", {
			options: {},
			bak: null,

			_create: function() {
				// backup the elements initial state
				this.bak = this.element.html();

				this.element.pluploadQueue(this.options);
			},

			getUploader: function() {
				return this.element.pluploadQueue();
			},

			destroy: function() {
				this.getUploader().events = {};
				$('.plupload_start, .plupload_stop', this.element).unbind();

				// restore the elements initial state
				this.element.html(this.bak);

				$.Widget.prototype.destroy.apply(this);
			}
		});
	} else {
		$.fn.plupload = function(settings) {
			if (typeof settings == 'string') {
				switch (settings) {
					case 'getUploader':
						return this.pluploadQueue();

					case 'destroy':
						this.pluploadQueue().events = {};
						$('.plupload_start, .plupload_stop', this).unbind();
						this.html(this.data('plupload_bak'));
						$.removeData('plupload_bak');
						break;
				}
			} else {
				this.data('plupload_bak', this.html());
				this.pluploadQueue(settings);
			}
		};
	}
})(jQuery);

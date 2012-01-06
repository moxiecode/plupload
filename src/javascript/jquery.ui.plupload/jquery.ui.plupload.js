/**
 * jquery.ui.plupload.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	
 * Optionally:
 *	jquery.ui.button.js
 *	jquery.ui.progressbar.js
 *	jquery.ui.sortable.js
 */

// JSLint defined globals
/*global window:false, document:false, plupload:false, jQuery:false */

(function(window, document, plupload, $, undef) {
	
var uploaders = {};	
	
function _(str) {
	return plupload.translate(str) || str;
}

function renderUI(obj) {		
	obj.html(
		'<div class="plupload_wrapper">' +
			'<div class="ui-widget-content plupload_container">' +
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
							'<table class="plupload_filelist_content"></table>' +
						'</div>' +

						'<table class="plupload_filelist">' +
						'<tr class="ui-widget-header ui-widget-content plupload_filelist_footer">' +
							'<td class="plupload_cell plupload_file_name">' +

								'<div class="plupload_buttons"><!-- Visible -->' +
									'<a class="plupload_button plupload_add">' + _('Add Files') + '</a>&nbsp;' +
									'<a class="plupload_button plupload_start">' + _('Start Upload') + '</a>&nbsp;' +
									'<a class="plupload_button plupload_stop plupload_hidden">'+_('Stop Upload') + '</a>&nbsp;' +
								'</div>' +

								'<div class="plupload_started plupload_hidden"><!-- Hidden -->' +

									'<div class="plupload_progress plupload_right">' +
										'<div class="plupload_progress_container"></div>' +
									'</div>' +

									'<div class="plupload_cell plupload_upload_status"></div>' +

									'<div class="plupload_clearer">&nbsp;</div>' +

								'</div>' +
							'</td>' +
							'<td class="plupload_file_status"><span class="plupload_total_status">0%</span></td>' +
							'<td class="plupload_file_size"><span class="plupload_total_file_size">0 kb</span></td>' +
							'<td class="plupload_file_action"></td>' +
						'</tr>' +
						'</table>' +
					'</div>' +
				'</div>' +
			'</div>' +
			'<input class="plupload_count" value="0" type="hidden">' +
		'</div>'
	);
}


$.widget("ui.plupload", {
	
	contents_bak: '',
	
	runtime: null,
	
	options: {
		browse_button_hover: 'ui-state-hover',
		browse_button_active: 'ui-state-active',
		
		// widget specific
		dragdrop : true, 
		multiple_queues: true, // re-use widget by default
		
		buttons: {
			browse: true,
			start: true,
			stop: true	
		},
		autostart: false,
		sortable: false,
		rename: false,
		max_file_count: 0 // unlimited
	},
	
	FILE_COUNT_ERROR: -9001,
	
	_create: function() {
		var self = this, id, uploader;
		
		id = this.element.attr('id');
		if (!id) {
			id = plupload.guid();
			this.element.attr('id', id);
		}
		this.id = id;
				
		// backup the elements initial state
		this.contents_bak = this.element.html();
		renderUI(this.element);
		
		// container, just in case
		this.container = $('.plupload_container', this.element).attr('id', id + '_container');	
		
		// list of files, may become sortable
		this.filelist = $('.plupload_filelist_content', this.container)
			.attr({
				id: id + '_filelist',
				unselectable: 'on'
			});
		
		// buttons
		this.browse_button = $('.plupload_add', this.container).attr('id', id + '_browse');
		this.start_button = $('.plupload_start', this.container).attr('id', id + '_start');
		this.stop_button = $('.plupload_stop', this.container).attr('id', id + '_stop');
		
		if ($.ui.button) {
			this.browse_button.button({
				icons: { primary: 'ui-icon-circle-plus' }
			});
			
			this.start_button.button({
				icons: { primary: 'ui-icon-circle-arrow-e' },
				disabled: true
			});
			
			this.stop_button.button({
				icons: { primary: 'ui-icon-circle-close' }
			});
		}
		
		// progressbar
		this.progressbar = $('.plupload_progress_container', this.container);		
		
		if ($.ui.progressbar) {
			this.progressbar.progressbar();
		}
		
		// counter
		this.counter = $('.plupload_count', this.element)
			.attr({
				id: id + '_count',
				name: id + '_count'
			});
					
		// initialize uploader instance
		uploader = this.uploader = uploaders[id] = new plupload.Uploader($.extend({ 
			container: id ,
			browse_button: id + '_browse'
		}, this.options));
		
		// do not show UI if no runtime can be initialized
		uploader.bind('Error', function(up, err) {
			if (err.code === plupload.INIT_ERROR) {
				self.destroy();
			}
		});
		
		uploader.bind('Init', function(up, res) {	
			// all buttons are optional, so they can be disabled and hidden
			if (!self.options.buttons.browse) {
				self.browse_button.button('disable').hide();
				up.disableBrowse(true);
			}
			
			if (!self.options.buttons.start) {
				self.start_button.button('disable').hide();
			}
			
			if (!self.options.buttons.stop) {
				self.stop_button.button('disable').hide();
			}
				
			if (!self.options.unique_names && self.options.rename) {
				self._enableRenaming();	
			}
			
			if (uploader.features.dragdrop && self.options.dragdrop) {
				self._enableDragAndDrop();	
			}
			
			self.container.attr('title', _('Using runtime: ') + (self.runtime = res.runtime));

			self.start_button.click(function(e) {
				if (!$(this).button('option', 'disabled')) {
					self.start();
				}
				e.preventDefault();
			});

			self.stop_button.click(function(e) {
				self.stop();
				e.preventDefault();
			});
		});
		
		
		// check if file count doesn't exceed the limit
		if (self.options.max_file_count) {
			uploader.bind('FilesAdded', function(up, selectedFiles) {
				var removed = [], selectedCount = selectedFiles.length;
				var extraCount = up.files.length + selectedCount - self.options.max_file_count;
				
				if (extraCount > 0) {
					removed = selectedFiles.splice(selectedCount - extraCount, extraCount);
					
					up.trigger('Error', {
						code : self.FILE_COUNT_ERROR,
						message : _('File count error.'),
						file : removed
					});
				}
			});
		}
		
		// uploader internal events must run first 
		uploader.init();
		
		uploader.bind('FilesAdded', function(up, files) {
			self._trigger('selected', null, { up: up, files: files } );
			
			if (self.options.autostart) {
				// set a little delay to make sure that QueueChanged triggered by the core has time to complete
				setTimeout(function() {
					self.start();
				}, 10);
			}
		});
		
		uploader.bind('FilesRemoved', function(up, files) {
			self._trigger('removed', null, { up: up, files: files } );
		});
		
		uploader.bind('QueueChanged', function() {
			self._updateFileList();
		});
		
		uploader.bind('StateChanged', function() {
			self._handleState();
		});
		
		uploader.bind('UploadFile', function(up, file) {
			self._handleFileStatus(file);
		});
		
		uploader.bind('FileUploaded', function(up, file) {
			self._handleFileStatus(file);
			
			self._trigger('uploaded', null, { up: up, file: file } );
		});
		
		uploader.bind('UploadProgress', function(up, file) {
			// Set file specific progress
			$('#' + file.id)
				.find('.plupload_file_status')
					.html(file.percent + '%')
					.end()
				.find('.plupload_file_size')
					.html(plupload.formatSize(file.size));	

			self._handleFileStatus(file);
			self._updateTotalProgress();
			
			self._trigger('progress', null, { up: up, file: file } );
		});
		
		uploader.bind('UploadComplete', function(up, files) {			
			self._trigger('complete', null, { up: up, files: files } );
		});
		
		uploader.bind('Error', function(up, err) {			
			var file = err.file, message, details;

			if (file) {
				message = '<strong>' + err.message + '</strong>';
				details = err.details;
				
				if (details) {
					message += " <br /><i>" + err.details + "</i>";
				} else {
					
					switch (err.code) {
						case plupload.FILE_EXTENSION_ERROR:
							details = _("File: %s").replace('%s', file.name);
							break;
						
						case plupload.FILE_SIZE_ERROR:
							details = _("File: %f, size: %s, max file size: %m").replace(/%([fsm])/g, function($0, $1) {
								switch ($1) {
									case 'f': return file.name;
									case 's': return file.size;	
									case 'm': return plupload.parseSize(self.options.max_file_size);
								}
							});
							break;
							
						case self.FILE_COUNT_ERROR:
							details = _("Upload element accepts only %d file(s) at a time. Extra files were stripped.")
								.replace('%d', self.options.max_file_count);
							break;
						
						case plupload.IMAGE_FORMAT_ERROR :
							details = plupload.translate('Image format either wrong or not supported.');
							break;	
						
						case plupload.IMAGE_MEMORY_ERROR :
							details = plupload.translate('Runtime ran out of available memory.');
							break;
						
						case plupload.IMAGE_DIMENSIONS_ERROR :
							details = plupload.translate('Resoultion out of boundaries! <b>%s</b> runtime supports images only up to %wx%hpx.').replace(/%([swh])/g, function($0, $1) {
								switch ($1) {
									case 's': return up.runtime;
									case 'w': return up.features.maxWidth;	
									case 'h': return up.features.maxHeight;
								}
							});
							break;	
													
						case plupload.HTTP_ERROR:
							details = _("Upload URL might be wrong or doesn't exist");
							break;
					}
					message += " <br /><i>" + details + "</i>";
				}
				
				self.notify('error', message);
				self._trigger('error', null, { up: up, file: file, error: message } );
			}
		});
	},
	
	_setOption: function(key, value) {
		var self = this;

		if (key == 'buttons' && typeof(value) == 'object') {	
			value = $.extend(self.options.buttons, value);
			
			if (!value.browse) {
				self.browse_button.button('disable').hide();
				up.disableBrowse(true);
			} else {
				self.browse_button.button('enable').show();
				up.disableBrowse(false);
			}
			
			if (!value.start) {
				self.start_button.button('disable').hide();
			} else {
				self.start_button.button('enable').show();
			}
			
			if (!value.stop) {
				self.stop_button.button('disable').hide();
			} else {
				self.start_button.button('enable').show();	
			}
		}
		
		self.uploader.settings[key] = value;	
	},
	
	
	start: function() {
		this.uploader.start();
		this._trigger('start', null);
	},
	
	stop: function() {
		this.uploader.stop();
		this._trigger('stop', null);
	},
	
	getFile: function(id) {
		var file;
		
		if (typeof id === 'number') {
			file = this.uploader.files[id];	
		} else {
			file = this.uploader.getFile(id);	
		}
		return file;
	},
	
	removeFile: function(id) {
		var file = this.getFile(id);
		if (file) {
			this.uploader.removeFile(file);
		}
	},
	
	clearQueue: function() {
		this.uploader.splice();
	},
	
	getUploader: function() {
		return this.uploader;
	},
	
	refresh: function() {
		this.uploader.refresh();
	},
	
	
	_handleState: function() {
		var self = this, up = this.uploader;
						
		if (up.state === plupload.STARTED) {
							
			$(self.start_button).button('disable');
								
			$([])
				.add(self.stop_button)
				.add('.plupload_started')
					.removeClass('plupload_hidden');
							
			$('.plupload_upload_status', self.element).text(
				_('Uploaded %d/%d files').replace('%d/%d', up.total.uploaded+'/'+up.files.length)
			);
			
			$('.plupload_header_content', self.element).addClass('plupload_header_content_bw');
		
		} else {
			
			$([])
				.add(self.stop_button)
				.add('.plupload_started')
					.addClass('plupload_hidden');
			
			if (self.options.multiple_queues) {
				$(self.start_button).button('enable');
						
				$('.plupload_header_content', self.element).removeClass('plupload_header_content_bw');
			}

			self._updateFileList();
		}
	},
	
	
	_handleFileStatus: function(file) {
		var actionClass, iconClass;
		
		// since this method might be called asynchronously, file row might not yet be rendered
		if (!$('#' + file.id).length) {
			return;	
		}

		switch (file.status) {
			case plupload.DONE: 
				actionClass = 'plupload_done';
				iconClass = 'ui-icon ui-icon-circle-check';
				break;
			
			case plupload.FAILED:
				actionClass = 'ui-state-error plupload_failed';
				iconClass = 'ui-icon ui-icon-alert';
				break;

			case plupload.QUEUED:
				actionClass = 'plupload_delete';
				iconClass = 'ui-icon ui-icon-circle-minus';
				break;

			case plupload.UPLOADING:
				actionClass = 'ui-state-highlight plupload_uploading';
				iconClass = 'ui-icon ui-icon-circle-arrow-w';
				
				// scroll uploading file into the view if its bottom boundary is out of it
				var scroller = $('.plupload_scroll', this.container),
					scrollTop = scroller.scrollTop(),
					scrollerHeight = scroller.height(),
					rowOffset = $('#' + file.id).position().top + $('#' + file.id).height();
					
				if (scrollerHeight < rowOffset) {
					scroller.scrollTop(scrollTop + rowOffset - scrollerHeight);
				}				
				break;
		}
		actionClass += ' ui-state-default plupload_file';

		$('#' + file.id)
			.attr('class', actionClass)
			.find('.ui-icon')
				.attr('class', iconClass);
	},
	
	
	_updateTotalProgress: function() {
		var up = this.uploader;
		
		this.progressbar.progressbar('value', up.total.percent);
		
		this.element
			.find('.plupload_total_status')
				.html(up.total.percent + '%')
				.end()
			.find('.plupload_total_file_size')
				.html(plupload.formatSize(up.total.size))
				.end()
			.find('.plupload_upload_status')
				.text(_('Uploaded %d/%d files').replace('%d/%d', up.total.uploaded+'/'+up.files.length));
	},
	
	
	_updateFileList: function() {
		var self = this, up = this.uploader, filelist = this.filelist, 
			count = 0, 
			id, prefix = this.id + '_',
			fields;
			
		// destroy sortable if enabled
		if ($.ui.sortable && this.options.sortable) {
			$('tbody', filelist).sortable('destroy');	
		}
		
		filelist.empty();

		$.each(up.files, function(i, file) {
			fields = '';
			id = prefix + count;

			if (file.status === plupload.DONE) {
				if (file.target_name) {
					fields += '<input type="hidden" name="' + id + '_tmpname" value="'+plupload.xmlEncode(file.target_name)+'" />';
				}
				fields += '<input type="hidden" name="' + id + '_name" value="'+plupload.xmlEncode(file.name)+'" />';
				fields += '<input type="hidden" name="' + id + '_status" value="' + (file.status === plupload.DONE ? 'done' : 'failed') + '" />';

				count++;
				self.counter.val(count);
			}

			filelist.append(
				'<tr class="ui-state-default plupload_file" id="' + file.id + '">' +
					'<td class="plupload_cell plupload_file_name"><span>' + file.name + '</span></td>' +
					'<td class="plupload_cell plupload_file_status">' + file.percent + '%</td>' +
					'<td class="plupload_cell plupload_file_size">' + plupload.formatSize(file.size) + '</td>' +
					'<td class="plupload_cell plupload_file_action"><div class="ui-icon"></div>' + fields + '</td>' +
				'</tr>'
			);

			self._handleFileStatus(file);

			$('#' + file.id + '.plupload_delete .ui-icon, #' + file.id + '.plupload_done .ui-icon')
				.click(function(e) {
					$('#' + file.id).remove();
					up.removeFile(file);
	
					e.preventDefault();
				});
				
			self._trigger('updatelist', null, filelist);
		});

		if (up.total.queued === 0) {
			$('.ui-button-text', self.browse_button).text(_('Add Files'));
		} else {
			$('.ui-button-text', self.browse_button).text(_('%d files queued').replace('%d', up.total.queued));
		}


		if (up.files.length === (up.total.uploaded + up.total.failed)) {
			self.start_button.button('disable');
		} else {
			self.start_button.button('enable');
		}


		// Scroll to end of file list
		filelist[0].scrollTop = filelist[0].scrollHeight;

		self._updateTotalProgress();

		if (!up.files.length && up.features.dragdrop && up.settings.dragdrop) {
			// Re-add drag message if there are no files
			$('#' + id + '_filelist').append('<tr><td class="plupload_droptext">' + _("Drag files here.") + '</td></tr>');
		} else {
			// Otherwise re-initialize sortable
			if (self.options.sortable && $.ui.sortable) {
				 self._enableSortingList();	
			}
		}
	},
	
	
	_enableRenaming: function() {
		var self = this;
		
		$('.plupload_delete .plupload_file_name span', this.filelist).live('click', function(e) {
			var targetSpan = $(e.target), file, parts, name, ext = "";

			// Get file name and split out name and extension
			file = self.uploader.getFile(targetSpan.parents('tr')[0].id);
			name = file.name;
			parts = /^(.+)(\.[^.]+)$/.exec(name);
			if (parts) {
				name = parts[1];
				ext = parts[2];
			}

			// Display input element
			targetSpan.hide().after('<input class="plupload_file_rename" type="text" />');
			targetSpan.next().val(name).focus().blur(function() {
				targetSpan.show().next().remove();
			}).keydown(function(e) {
				var targetInput = $(this);

				if ($.inArray(e.keyCode, [13, 27]) !== -1) {
					e.preventDefault();

					// Rename file and glue extension back on
					if (e.keyCode === 13) {
						file.name = targetInput.val() + ext;
						targetSpan.text(file.name);
					}
					targetInput.blur();
				}
			});
		});
	},
	
	
	_enableDragAndDrop: function() {
		this.filelist.append('<tr><td class="plupload_droptext">' + _("Drag files here.") + '</td></tr>');
		
		this.filelist.parent().attr('id', this.id + '_dropbox');
		
		this.uploader.settings.drop_element = this.options.drop_element = this.id + '_dropbox';
	},
	
	
	_enableSortingList: function() {
		var idxStart, self = this;
		
		if ($('tbody tr', this.filelist).length < 2) {
			return;	
		}
		
		$('tbody', this.filelist).sortable({
			containment: 'parent',
			items: '.plupload_delete',
			
			helper: function(e, el) {
				return el.clone(true).find('td:not(.plupload_file_name)').remove().end().css('width', '100%');
			},
			
			stop: function(e, ui) {
				var i, length, idx, files = [];
				
				$.each($(this).sortable('toArray'), function(i, id) {
					files[files.length] = self.uploader.getFile(id);
				});				
				
				files.unshift(files.length);
				files.unshift(0);
				
				// re-populate files array				
				Array.prototype.splice.apply(self.uploader.files, files);	
			}
		});		
	},
	
	notify: function(type, message) {
		var popup = $(
			'<div class="plupload_message">' + 
				'<span class="plupload_message_close ui-icon ui-icon-circle-close" title="'+_('Close')+'"></span>' +
				'<p><span class="ui-icon"></span>' + message + '</p>' +
			'</div>'
		);
					
		popup
			.addClass('ui-state-' + (type === 'error' ? 'error' : 'highlight'))
			.find('p .ui-icon')
				.addClass('ui-icon-' + (type === 'error' ? 'alert' : 'info'))
				.end()
			.find('.plupload_message_close')
				.click(function() {
					popup.remove();	
				})
				.end();
		
		$('.plupload_header_content', this.container).append(popup);
	},
	


	destroy: function() {
		// unbind all button events
		$('.plupload_button', this.element).unbind();
		
		// destroy buttons
		if ($.ui.button) {
			$('.plupload_add, .plupload_start, .plupload_stop', this.container)
				.button('destroy');
		}
		
		// destroy progressbar
		if ($.ui.progressbar) {
			 this.progressbar.progressbar('destroy');	
		}
		
		// destroy sortable behavior
		if ($.ui.sortable && this.options.sortable) {
			$('tbody', this.filelist).sortable('destroy');
		}
		
		// destroy uploader instance
		this.uploader.destroy();
		
		// restore the elements initial state
		this.element
			.empty()
			.html(this.contents_bak);
		this.contents_bak = '';

		$.Widget.prototype.destroy.apply(this);
	}
});


} (window, document, plupload, jQuery));

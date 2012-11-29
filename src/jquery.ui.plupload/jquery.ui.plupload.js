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
				'<div class="ui-state-default ui-widget-header plupload_header">' +
					'<div class="plupload_header_content">' +
						'<div class="plupload_logo"> </div>' +
						'<div class="plupload_header_title">' + _('Select files') + '</div>' +
						'<div class="plupload_header_text">' + _('Add files to the upload queue and click the start button.') + '</div>' +
						'<div class="plupload_view_switch">' +
							'<input type="radio" id="plupload_view_list" name="view_mode" checked="checked" /> <label class="plupload_button" for="plupload_view_list">List</label>' +
							//'<input type="radio" id="plupload_view_thumblist" name="view_mode" /> <label class="plupload_button" for="plupload_view_thumblist">Thumb List</label>' +
							'<input type="radio" id="plupload_view_thumbs" name="view_mode" /> <label class="plupload_button"  for="plupload_view_thumbs">Thumbnails</label>' +
						'</div>' +
					'</div>' +
				'</div>' +

				'<table class="plupload_filelist plupload_filelist_header ui-widget-header">' +
				'<tr>' +
					'<td class="plupload_cell plupload_file_name">' + _('Filename') + '</td>' +
					'<td class="plupload_cell plupload_file_status">' + _('Status') + '</td>' +
					'<td class="plupload_cell plupload_file_size">' + _('Size') + '</td>' +
					'<td class="plupload_cell plupload_file_action">&nbsp;</td>' +
				'</tr>' +
				'</table>' +

				'<div class="plupload_content">' +
					'<div class="plupload_droptext">' + _("Drag files here.") + '</div>' +
					'<ul class="plupload_filelist_content"> </ul>' +
					'<div class="plupload_clearer">&nbsp;</div>' +
				'</div>' +
					
				'<table class="plupload_filelist plupload_filelist_footer ui-widget-header">' +
				'<tr>' +
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
			'<input class="plupload_count" value="0" type="hidden">' +
		'</div>'
	);
}


$.widget("ui.plupload", {

	imgs: {},
	
	contents_bak: '',
		
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
		views: {
			list: true,
			thumbs: false
		},
		default_view: 'list',
		remember_view: true, // requires: https://github.com/carhartl/jquery-cookie, otherwise disabled even if set to true
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

		this.content = $('.plupload_content', this.element);
		
		if ($.fn.resizable) {
			this.container.resizable({ 
				handles: 's',
				minHeight: 300
			});
		}
		
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
				icons: { primary: 'ui-icon-circle-plus' },
				disabled: true
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
		this._initUploader();
	},

	_initUploader: function() {
		var 
		  self = this
		, id = this.id
		, buttonsContainer = $('.plupload_buttons', this.element).attr('id', id + '_buttons')
		, uploader
		, options = { 
			container: id + '_buttons',
			browse_button: id + '_browse'
		}
		;

		if (self.options.dragdrop) {
			this.filelist.parent().attr('id', this.id + '_dropbox');
			options.drop_element = this.id + '_dropbox';
		}

		if (self.options.views.thumbs) {
			if (o.typeOf(self.options.required_features) === 'string') {
				self.options.required_features += ",display_media";
			} else {
				self.options.required_features = "display_media";
			}
		}

		uploader = this.uploader = uploaders[id] = new plupload.Uploader($.extend(this.options, options));

		// do not show UI if no runtime can be initialized
		uploader.bind('Error', function(up, err) {
			if (err.code === plupload.INIT_ERROR) {
				self.destroy();
			}
		});
		
		uploader.bind('PostInit', function(up, res) {	
			// all buttons are optional, so they can be disabled and hidden
			if (!self.options.buttons.browse) {
				self.browse_button.button('disable').hide();
				up.disableBrowse(true);
			} else {
				self.browse_button.button('enable');
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

			if (self.options.dragdrop && up.features.dragdrop) {
				self.filelist.parent().addClass('plupload_dropbox');
			}

			self._enableViewSwitcher();
			
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

			self._trigger('ready', null, { up: up });
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
			self._addFiles(files);

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
			self._updateTotalProgress();
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
						
						/* // This needs a review
						case plupload.IMAGE_DIMENSIONS_ERROR :
							details = plupload.translate('Resoultion out of boundaries! <b>%s</b> runtime supports images only up to %wx%hpx.').replace(/%([swh])/g, function($0, $1) {
								switch ($1) {
									case 's': return up.runtime;
									case 'w': return up.features.maxWidth;	
									case 'h': return up.features.maxHeight;
								}
							});
							break;	*/
													
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

	enable: function() {
		self.browse_button.button('enable')
		this.uploader.disableBrowse(false);
	},

	disable: function() {
		this.browse_button.button('disable')
		this.uploader.disableBrowse(true);
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

	
	removeFile: function(file) {
		if (plupload.typeOf(file) === 'string') {
			file = this.getFile(id);
		}
		this._removeFiles(file);
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
		
		$('.plupload_header', this.container).append(popup);
	},
	

	destroy: function() {
		this._removeFiles([].slice.call(this.uploader.files));
		
		// destroy uploader instance
		this.uploader.destroy();

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
		
		// restore the elements initial state
		this.element
			.empty()
			.html(this.contents_bak);
		this.contents_bak = '';

		$.Widget.prototype.destroy.apply(this);
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

			self._updateTotalProgress();
		}
	},
	
	
	_handleFileStatus: function(file) {
		var self = this, actionClass, iconClass;
		
		// since this method might be called asynchronously, file row might not yet be rendered
		if (!$('#' + file.id).length) {
			return;	
		}


		function addFields() {
			var 
			  fields = ''
			, count = parseInt(self.counter.val() || 0, 10)
			, id = self.id + '_' + count
			;

			if (file.target_name) {
				fields += '<input type="hidden" name="' + id + '_tmpname" value="'+plupload.xmlEncode(file.target_name)+'" />';
			}
			fields += '<input type="hidden" name="' + id + '_name" value="'+plupload.xmlEncode(file.name)+'" />';
			fields += '<input type="hidden" name="' + id + '_status" value="' + (file.status === plupload.DONE ? 'done' : 'failed') + '" />';

			$('#' + file.id).find('.plupload_file_fields').html(fields);
			self.counter.val(++count);
		}

		switch (file.status) {
			case plupload.DONE: 
				actionClass = 'plupload_done';
				iconClass = 'ui-icon ui-icon-circle-check';
				addFields();
				break;
			
			case plupload.FAILED:
				actionClass = 'ui-state-error plupload_failed';
				iconClass = 'ui-icon ui-icon-alert';
				addFields();
				break;

			case plupload.QUEUED:
				actionClass = 'plupload_delete';
				iconClass = 'ui-icon ui-icon-circle-minus';
				break;

			case plupload.UPLOADING:
				actionClass = 'ui-state-highlight plupload_uploading';
				iconClass = 'ui-icon ui-icon-circle-arrow-w';
				
				// scroll uploading file into the view if its bottom boundary is out of it
				var 
				  scroller = $('.plupload_scroll', this.container)
				, scrollTop = scroller.scrollTop()
				, scrollerHeight = scroller.height()
				, rowOffset = $('#' + file.id).position().top + $('#' + file.id).height()
				;
					
				if (scrollerHeight < rowOffset) {
					scroller.scrollTop(scrollTop + rowOffset - scrollerHeight);
				}		

				// Set file specific progress
				$('#' + file.id)
					.find('.plupload_file_percent')
						.html(file.percent + '%')
						.end()
					.find('.plupload_file_progress')
						.css('width', file.percent + '%')
						.end()
					.find('.plupload_file_size')
						.html(plupload.formatSize(file.size));			
				break;
		}
		actionClass += ' ui-state-default plupload_file';

		$('#' + file.id)
			.attr('class', actionClass)
			.find('.ui-icon')
				.attr('class', iconClass)
				.end()
			.filter('.plupload_delete, .plupload_done')
				.find('.ui-icon')
					.click(function(e) {
						self._removeFiles(file);
						e.preventDefault();
					});
	},
	
	
	_updateTotalProgress: function() {
		var up = this.uploader;

		if (up.total.queued === 0) {
			$('.ui-button-text', this.browse_button).text(_('Add Files'));
		} else {
			$('.ui-button-text', this.browse_button).text(_('%d files queued').replace('%d', up.total.queued));
		}

		up.refresh();

		if (up.files.length === (up.total.uploaded + up.total.failed)) {
			this.start_button.button('disable');
		} else {
			this.start_button.button('enable');
		}


		// Scroll to end of file list
		this.filelist[0].scrollTop = this.filelist[0].scrollHeight;
		
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


	_addFiles: function(files) {
		var self = this, file_html, queue = [];

		file_html = '<li class="plupload_file ui-state-default" id="%id%">' +
						'<div class="plupload_file_thumb"> </div>' +
						'<div class="plupload_file_name" title="%name%"><span class="plupload_file_namespan">%name%</span></div>' +						
						'<div class="plupload_file_action"><div class="ui-icon"> </div></div>' +
						'<div class="plupload_file_size">%size% </div>' +
						'<div class="plupload_file_status">' +
							'<div class="plupload_file_progress ui-widget-header" style="width: 0%"> </div>' + 
							'<span class="plupload_file_percent">%percent% </span>' +
						'</div>' +
						'<div class="plupload_clear plupload_file_fields"> </div>' +
					'</li>';

		if (plupload.typeOf(files) !== 'array') {
			files = [files];
		}

		// destroy sortable if enabled
		if ($.ui.sortable && this.options.sortable) {
			$('tbody', self.filelist).sortable('destroy');	
		}

		// loop over files to add
		$.each(files, function(i, file) {

			self.filelist.append(file_html.replace(/%(\w+)%/g, function($0, $1) {
				if ('size' === $1) {
					return plupload.formatSize(file.size);
				} else {
					return file[$1] || '';
				}
			}));

			if (self.options.views.thumbs) {
				queue.push(function(cb) {
					var img;
					img = new o.Image;

					img.onload = function() {
						img.embed($('#' + file.id + ' .plupload_file_thumb', self.filelist)[0], { 
							width: 100, 
							height: 60, 
							crop: true,
							swf_url: o.resolveUrl(self.options.flash_swf_url),
							xap_url: o.resolveUrl(self.options.silverlight_xap_url)
						});
						setTimeout(cb, 1); // detach, otherwise ui might hang (in SilverLight for example)
					};

					img.onembedded = function() {
						img.destroy();
					};

					img.onerror = function() {
						// error logic here
						cb();
					};
					img.load(file.getSource());
				});
			}

			self._handleFileStatus(file);
		});

		if (queue.length) {
			self._series(queue);
		}

		// re-enable sortable
		if (this.options.sortable && $.ui.sortable) {
			 this._enableSortingList();	
		}

		this._trigger('updatelist', null, this.filelist);
	},


	_series: function(queue, cb) {
		var i = 0, length = queue.length;

		if (o.typeOf(cb) !== 'function') {
			cb = function() {};
		}

		function callNext(i) {
			if (o.typeOf(queue[i]) === 'function') {
				queue[i](function() {
					++i < length ? callNext(i) : cb();
				});
			}
		}
		callNext(i);
	},


	_removeFiles: function(files) {
		var self = this, up = this.uploader;

		if (plupload.typeOf(files) !== 'array') {
			files = [files];
		}

		// destroy sortable if enabled
		if ($.ui.sortable && this.options.sortable) {
			$('tbody', self.filelist).sortable('destroy');	
		}

		$.each(files, function(i, file) {
			if (file.imgs && file.imgs.length) {
				$.each(file.imgs, function(ii, img) {
					img.destroy();
				});
				file.imgs = [];
			}
			$('#' + file.id).remove();
			up.removeFile(file);
		});

		
		if (up.files.length) {
			// re-initialize sortable
			if (this.options.sortable && $.ui.sortable) {
				 this._enableSortingList();	
			}
		}

		this._trigger('updatelist', null, self.filelist);
	},
	

	_viewChanged: function(type) {
		// update or write a new cookie
		if (this.options.remember_view && $.cookie) {
			$.cookie('plupload_ui_view', type, { expires: 7, path: '/' });
		} 
	
		// ugly fix for IE6 - make content area stretchable
		if (o.ua.browser === 'IE' && o.ua.version < 7) {
			this.content.attr('style', 'height:expression(document.getElementById("' + this.id + '_container' + '").clientHeight - ' + (type === 'list' ? 133 : 103) + ');');
		}

		this.container.removeClass('plupload_view_list plupload_view_thumbs').addClass('plupload_view_' + type); 
		this.view_mode = type;
		this._trigger('viewchanged', type);
	},


	_enableViewSwitcher: function() {
		var 
		  self = this
		, type
		, switcher = $('.plupload_view_switch', this.container)
		, buttons
		, button
		;

		$.each(self.options.views, function(type, on) {
			if (!on) {
				switcher.find('[for="plupload_view_' + type + '"], #plupload_view_' + type).remove();
			}
		});

		// check if any visible left
		buttons = switcher.find('.plupload_button');

		if (buttons.length === 1) {
			switcher.hide();
			type = buttons.attr('for').replace(/^plupload_view_/, '');
			self._viewChanged(type);
			return;
		} else if ($.ui.button && buttons.length > 1) {
			switcher.show();
			switcher.buttonset();
		} else {
			switcher.show();
			self._viewChanged(this.options.default_view);
			return;
		}

		switcher.find('.plupload_button').click(function() {
			type = $(this).attr('for').replace(/^plupload_view_/, '');
			self._viewChanged(type);
		});

		if (this.options.remember_view && $.cookie) {
			type = $.cookie('plupload_ui_view');
		}

		// if wierd case, bail out to default
		if (!~plupload.inArray(type, ['list', 'thumbs'])) {
			type = this.options.default_view;
		}

		// if view not active - happens when switcher wasn't clicked manually
		button = switcher.find('[for="plupload_view_'+type+'"]');
		if (button.length) {
			button.trigger('click');
			return; 
		}
	},
	
	
	_enableRenaming: function() {
		var self = this;

		this.filelist.dblclick(function(e) {
			var nameSpan = $(e.target), nameInput, file, parts, name, width, ext = "";

			if (!nameSpan.hasClass('plupload_file_namespan')) {
				return;
			}
		
			// Get file name and split out name and extension
			file = self.uploader.getFile(nameSpan.closest('.plupload_file')[0].id);
			name = file.name;
			parts = /^(.+)(\.[^.]+)$/.exec(name);
			if (parts) {
				name = parts[1];
				ext = parts[2];
			}

			// Display input element
			nameInput = $('<input class="plupload_file_rename" type="text" />').width(nameSpan.width()).insertAfter(nameSpan.hide());
			nameInput.val(name).blur(function() {
				nameSpan.show().parent().scrollLeft(0).end().next().remove();
			}).keydown(function(e) {
				var nameInput = $(this);

				if ($.inArray(e.keyCode, [13, 27]) !== -1) {
					e.preventDefault();

					// Rename file and glue extension back on
					if (e.keyCode === 13) {
						file.name = nameInput.val() + ext;
						nameSpan.text(file.name);
					}
					nameInput.blur();
				}
			})[0].focus();
		});
	},
	
	
	_enableSortingList: function() {
		var idxStart, self = this, filelist = $('.plupload_filelist_content', this.element);
		
		if ($('.plupload_file', filelist).length < 2) {
			return;	
		}
		
		filelist.sortable({
			items: '.plupload_delete',
			
			cancel: 'object, .plupload_clearer',

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
	}
});


} (window, document, plupload, jQuery));

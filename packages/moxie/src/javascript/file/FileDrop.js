/**
 * FileDrop.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/FileDrop', [
	'moxie/core/I18n',
	'moxie/core/utils/Dom',
	'moxie/core/Exceptions',
	'moxie/core/utils/Basic',
	'moxie/core/utils/Env',
	'moxie/file/File',
	'moxie/runtime/RuntimeClient',
	'moxie/core/EventTarget',
	'moxie/core/utils/Mime'
], function(I18n, Dom, x, Basic, Env, File, RuntimeClient, EventTarget, Mime) {
	/**
	Turn arbitrary DOM element to a drop zone accepting files. Converts selected files to _File_ objects, to be used 
	in conjunction with _Image_, preloaded in memory with _FileReader_ or uploaded to a server through 
	_XMLHttpRequest_.

	@example
		<div id="drop_zone">
			Drop files here
		</div>
		<br />
		<div id="filelist"></div>

		<script type="text/javascript">
			var fileDrop = new moxie.file.FileDrop('drop_zone'), fileList = moxie.utils.Dom.get('filelist');

			fileDrop.ondrop = function() {
				moxie.utils.Basic.each(this.files, function(file) {
					fileList.innerHTML += '<div>' + file.name + '</div>';
				});
			};

			fileDrop.init();
		</script>

	@class moxie/file/FileDrop
	@constructor
	@extends EventTarget
	@uses RuntimeClient
	@param {Object|String} options If options has typeof string, argument is considered as options.drop_zone
		@param {String|DOMElement} options.drop_zone DOM Element to turn into a drop zone
		@param {Array} [options.accept] Array of mime types to accept. By default accepts all
		@param {Object|String} [options.required_caps] Set of required capabilities, that chosen runtime must support
	*/
	var dispatches = [
		/**
		Dispatched when runtime is connected and drop zone is ready to accept files.

		@event ready
		@param {Object} event
		*/
		'ready', 

		/**
		Dispatched when dragging cursor enters the drop zone.

		@event dragenter
		@param {Object} event
		*/
		'dragenter',

		/**
		Dispatched when dragging cursor leaves the drop zone.

		@event dragleave
		@param {Object} event
		*/
		'dragleave', 

		/**
		Dispatched when file is dropped onto the drop zone.

		@event drop
		@param {Object} event
		*/
		'drop', 

		/**
		Dispatched if error occurs.

		@event error
		@param {Object} event
		*/
		'error'
	];

	function FileDrop(options) {
		if (MXI_DEBUG) {
			Env.log("Instantiating FileDrop...");	
		}

		var self = this, defaults;

		// if flat argument passed it should be drop_zone id
		if (typeof(options) === 'string') {
			options = { drop_zone : options };
		}

		// figure out the options
		defaults = {
			accept: [{
				title: I18n.translate('All Files'),
				extensions: '*'
			}],
			required_caps: {
				drag_and_drop: true
			}
		};
		
		options = typeof(options) === 'object' ? Basic.extend({}, defaults, options) : defaults;

		// this will help us to find proper default container
		options.container = Dom.get(options.drop_zone) || document.body;

		// make container relative, if it is not
		if (Dom.getStyle(options.container, 'position') === 'static') {
			options.container.style.position = 'relative';
		}
					
		// normalize accept option (could be list of mime types or array of title/extensions pairs)
		if (typeof(options.accept) === 'string') {
			options.accept = Mime.mimes2extList(options.accept);
		}

		RuntimeClient.call(self);

		Basic.extend(self, {
			uid: Basic.guid('uid_'),

			ruid: null,

			files: null,

			init: function() {		
				self.bind('RuntimeInit', function(e, runtime) {
					self.ruid = runtime.uid;
					runtime.exec.call(self, 'FileDrop', 'init', options);
					self.dispatchEvent('ready');
				});
							
				// runtime needs: options.required_features, options.runtime_order and options.container
				self.connectRuntime(options); // throws RuntimeError
			},

			destroy: function() {
				var runtime = this.getRuntime();
				if (runtime) {
					runtime.exec.call(this, 'FileDrop', 'destroy');
					this.disconnectRuntime();
				}
				this.files = null;
				
				this.unbindAll();
			}
		});

		this.handleEventProps(dispatches);
	}

	FileDrop.prototype = EventTarget.instance;

	return FileDrop;
});

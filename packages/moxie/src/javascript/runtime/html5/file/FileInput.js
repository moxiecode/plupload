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
@class moxie/runtime/html5/file/FileInput
@private
*/
define("moxie/runtime/html5/file/FileInput", [
	"moxie/runtime/html5/Runtime",
	"moxie/file/File",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, File, Basic, Dom, Events, Mime, Env) {
	
	function FileInput() {
		var _options, _browseBtnZIndex; // save original z-index

		Basic.extend(this, {
			init: function(options) {
				var comp = this, I = comp.getRuntime(), input, shimContainer, mimes, browseButton, zIndex, top;

				_options = options;

				// figure out accept string
				mimes = Mime.extList2mimes(_options.accept, I.can('filter_by_extension'));

				shimContainer = I.getShimContainer();

				shimContainer.innerHTML = '<input id="' + I.uid +'" type="file" style="font-size:999px;opacity:0;"' +
					(_options.multiple && I.can('select_multiple') ? 'multiple' : '') + 
					(_options.directory && I.can('select_folder') ? 'webkitdirectory directory' : '') + // Chrome 11+
					(mimes ? ' accept="' + mimes.join(',') + '"' : '') + ' />';

				input = Dom.get(I.uid);

				// prepare file input to be placed underneath the browse_button element
				Basic.extend(input.style, {
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%'
				});


				browseButton = Dom.get(_options.browse_button);
				_browseBtnZIndex = Dom.getStyle(browseButton, 'z-index') || 'auto';

				// Route click event to the input[type=file] element for browsers that support such behavior
				if (I.can('summon_file_dialog')) {
					if (Dom.getStyle(browseButton, 'position') === 'static') {
						browseButton.style.position = 'relative';
					}

					Events.addEvent(browseButton, 'click', function(e) {
						var input = Dom.get(I.uid);
						if (input && !input.disabled) { // for some reason FF (up to 8.0.1 so far) lets to click disabled input[type=file]
							input.click();
						}
						e.preventDefault();
					}, comp.uid);

					comp.bind('Refresh', function() {
						zIndex = parseInt(_browseBtnZIndex, 10) || 1;

						Dom.get(_options.browse_button).style.zIndex = zIndex;
						this.getRuntime().getShimContainer().style.zIndex = zIndex - 1;
					});
				}

				/* Since we have to place input[type=file] on top of the browse_button for some browsers,
				browse_button loses interactivity, so we restore it here */
				top = I.can('summon_file_dialog') ? browseButton : shimContainer;

				Events.addEvent(top, 'mouseover', function() {
					comp.trigger('mouseenter');
				}, comp.uid);

				Events.addEvent(top, 'mouseout', function() {
					comp.trigger('mouseleave');
				}, comp.uid);

				Events.addEvent(top, 'mousedown', function() {
					comp.trigger('mousedown');
				}, comp.uid);

				Events.addEvent(Dom.get(_options.container), 'mouseup', function() {
					comp.trigger('mouseup');
				}, comp.uid);

				// it shouldn't be possible to tab into the hidden element
				(I.can('summon_file_dialog') ? input : browseButton).setAttribute('tabindex', -1);

				input.onchange = function onChange() { // there should be only one handler for this
					comp.files = [];

					Basic.each(this.files, function(file) {
						var relativePath = '';

						if (_options.directory) {
							// folders are represented by dots, filter them out (Chrome 11+)
							if (file.name == ".") {
								// if it looks like a folder...
								return true;
							}
						}

						if (file.webkitRelativePath) {
							relativePath = '/' + file.webkitRelativePath.replace(/^\//, '');
						}
						
						file = new File(I.uid, file);
						file.relativePath = relativePath;

						comp.files.push(file);
					});

					// clearing the value enables the user to select the same file again if they want to
					if (Env.browser !== 'IE' && Env.browser !== 'IEMobile') {
						this.value = '';
					} else {
						// in IE input[type="file"] is read-only so the only way to reset it is to re-insert it
						var clone = this.cloneNode(true);
						this.parentNode.replaceChild(clone, this);
						clone.onchange = onChange;
					}

					if (comp.files.length) {
						comp.trigger('change');
					}
				};

				// ready event is perfectly asynchronous
				comp.trigger({
					type: 'ready',
					async: true
				});

				shimContainer = null;
			},


			setOption: function(name, value) {
				var I = this.getRuntime();
				var input = Dom.get(I.uid);

				switch (name) {
					case 'accept':
						if (value) {
							var mimes = value.mimes || Mime.extList2mimes(value, I.can('filter_by_extension'));
							input.setAttribute('accept', mimes.join(','));
						} else {
							input.removeAttribute('accept');
						}
						break;

					case 'directory':
						if (value && I.can('select_folder')) {
							input.setAttribute('directory', '');
							input.setAttribute('webkitdirectory', '');
						} else {
							input.removeAttribute('directory');
							input.removeAttribute('webkitdirectory');
						}
						break;

					case 'multiple':
						if (value && I.can('select_multiple')) {
							input.setAttribute('multiple', '');
						} else {
							input.removeAttribute('multiple');
						}

				}
			},


			disable: function(state) {
				var I = this.getRuntime(), input;

				if ((input = Dom.get(I.uid))) {
					input.disabled = !!state;
				}
			},

			destroy: function() {
				var I = this.getRuntime()
				, shim = I.getShim()
				, shimContainer = I.getShimContainer()
				, container = _options && Dom.get(_options.container)
				, browseButton = _options && Dom.get(_options.browse_button)
				;
				
				if (container) {
					Events.removeAllEvents(container, this.uid);
				}
				
				if (browseButton) {
					Events.removeAllEvents(browseButton, this.uid);
					browseButton.style.zIndex = _browseBtnZIndex; // reset to original value
				}
				
				if (shimContainer) {
					Events.removeAllEvents(shimContainer, this.uid);
					shimContainer.innerHTML = '';
				}

				shim.removeInstance(this.uid);

				_options = shimContainer = container = browseButton = shim = null;
			}
		});
	}

	return (extensions.FileInput = FileInput);
});
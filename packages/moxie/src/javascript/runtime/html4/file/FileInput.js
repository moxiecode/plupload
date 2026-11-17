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
@class moxie/runtime/html4/file/FileInput
@private
*/
define("moxie/runtime/html4/file/FileInput", [
	"moxie/runtime/html4/Runtime",
	"moxie/file/File",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, File, Basic, Dom, Events, Mime, Env) {
	
	function FileInput() {
		var _uid, _mimes = [], _options, _browseBtnZIndex; // save original z-index;

		function addInput() {
			var comp = this, I = comp.getRuntime(), shimContainer, browseButton, currForm, form, input, uid;

			uid = Basic.guid('uid_');

			shimContainer = I.getShimContainer(); // we get new ref every time to avoid memory leaks in IE

			if (_uid) { // move previous form out of the view
				currForm = Dom.get(_uid + '_form');
				if (currForm) {
					Basic.extend(currForm.style, { top: '100%' });
					// it shouldn't be possible to tab into the hidden element
					currForm.firstChild.setAttribute('tabindex', -1);
				}
			}

			// build form in DOM, since innerHTML version not able to submit file for some reason
			form = document.createElement('form');
			form.setAttribute('id', uid + '_form');
			form.setAttribute('method', 'post');
			form.setAttribute('enctype', 'multipart/form-data');
			form.setAttribute('encoding', 'multipart/form-data');

			Basic.extend(form.style, {
				overflow: 'hidden',
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});

			input = document.createElement('input');
			input.setAttribute('id', uid);
			input.setAttribute('type', 'file');
			input.setAttribute('accept', _mimes.join(','));

			if (I.can('summon_file_dialog')) {
				input.setAttribute('tabindex', -1);
			}

			Basic.extend(input.style, {
				fontSize: '999px',
				opacity: 0
			});

			form.appendChild(input);
			shimContainer.appendChild(form);

			// prepare file input to be placed underneath the browse_button element
			Basic.extend(input.style, {
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});

			if (Env.browser === 'IE' && Env.verComp(Env.version, 10, '<')) {
				Basic.extend(input.style, {
					filter : "progid:DXImageTransform.Microsoft.Alpha(opacity=0)"
				});
			}

			input.onchange = function() { // there should be only one handler for this
				var file;

				if (!this.value) {
					return;
				}

				if (this.files) { // check if browser is fresh enough
					file = this.files[0];
				} else {
					file = {
						name: this.value
					};
				}

				file = new File(I.uid, file);

				// clear event handler
				this.onchange = function() {}; 
				addInput.call(comp); 

				comp.files = [file];

				// substitute all ids with file uids (consider file.uid read-only - we cannot do it the other way around)
				input.setAttribute('id', file.uid);
				form.setAttribute('id', file.uid + '_form');
				
				comp.trigger('change');

				input = form = null;
			};


			// route click event to the input
			if (I.can('summon_file_dialog')) {
				browseButton = Dom.get(_options.browse_button);
				Events.removeEvent(browseButton, 'click', comp.uid);
				Events.addEvent(browseButton, 'click', function(e) {
					if (input && !input.disabled) { // for some reason FF (up to 8.0.1 so far) lets to click disabled input[type=file]
						input.click();
					}
					e.preventDefault();
				}, comp.uid);
			}

			_uid = uid;

			shimContainer = currForm = browseButton = null;
		}

		Basic.extend(this, {
			init: function(options) {
				var comp = this, I = comp.getRuntime(), shimContainer;

				// figure out accept string
				_options = options;
				_mimes = Mime.extList2mimes(options.accept, I.can('filter_by_extension'));

				shimContainer = I.getShimContainer();

				(function() {
					var browseButton, zIndex, top;

					browseButton = Dom.get(options.browse_button);
					_browseBtnZIndex = Dom.getStyle(browseButton, 'z-index') || 'auto';

					// Route click event to the input[type=file] element for browsers that support such behavior
					if (I.can('summon_file_dialog')) {
						if (Dom.getStyle(browseButton, 'position') === 'static') {
							browseButton.style.position = 'relative';
						}						

						comp.bind('Refresh', function() {
							zIndex = parseInt(_browseBtnZIndex, 10) || 1;

							Dom.get(_options.browse_button).style.zIndex = zIndex;
							this.getRuntime().getShimContainer().style.zIndex = zIndex - 1;
						});
					} else {
						// it shouldn't be possible to tab into the hidden element
						browseButton.setAttribute('tabindex', -1);
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

					Events.addEvent(Dom.get(options.container), 'mouseup', function() {
						comp.trigger('mouseup');
					}, comp.uid);

					browseButton = null;
				}());

				addInput.call(this);

				shimContainer = null;

				// trigger ready event asynchronously
				comp.trigger({
					type: 'ready',
					async: true
				});
			},

			setOption: function(name, value) {
				var I = this.getRuntime();
				var input;

				if (name == 'accept') {
					_mimes = value.mimes || Mime.extList2mimes(value, I.can('filter_by_extension'));
				}

				// update current input
				input = Dom.get(_uid)
				if (input) {
					input.setAttribute('accept', _mimes.join(','));
				}
			},


			disable: function(state) {
				var input;

				if ((input = Dom.get(_uid))) {
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

				_uid = _mimes = _options = shimContainer = container = browseButton = shim = null;
			}
		});
	}

	return (extensions.FileInput = FileInput);
});
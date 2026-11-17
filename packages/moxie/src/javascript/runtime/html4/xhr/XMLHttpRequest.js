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
@class moxie/runtime/html4/xhr/XMLHttpRequest
@private
*/
define("moxie/runtime/html4/xhr/XMLHttpRequest", [
	"moxie/runtime/html4/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Url",
	"moxie/core/Exceptions",
	"moxie/core/utils/Events",
	"moxie/file/Blob",
	"moxie/xhr/FormData"
], function(extensions, Basic, Dom, Url, x, Events, Blob, FormData) {
	
	function XMLHttpRequest() {
		var _status, _response, _iframe;

		function cleanup(cb) {
			var target = this, uid, form, inputs, i, hasFile = false;

			if (!_iframe) {
				return;
			}

			uid = _iframe.id.replace(/_iframe$/, '');

			form = Dom.get(uid + '_form');
			if (form) {
				inputs = form.getElementsByTagName('input');
				i = inputs.length;

				while (i--) {
					switch (inputs[i].getAttribute('type')) {
						case 'hidden':
							inputs[i].parentNode.removeChild(inputs[i]);
							break;
						case 'file':
							hasFile = true; // flag the case for later
							break;
					}
				}
				inputs = [];

				if (!hasFile) { // we need to keep the form for sake of possible retries
					form.parentNode.removeChild(form);
				}
				form = null;
			}

			// without timeout, request is marked as canceled (in console)
			setTimeout(function() {
				Events.removeEvent(_iframe, 'load', target.uid);
				if (_iframe.parentNode) { // #382
					_iframe.parentNode.removeChild(_iframe);
				}

				// check if shim container has any other children, if - not, remove it as well
				var shimContainer = target.getRuntime().getShimContainer();
				if (!shimContainer.children.length) {
					shimContainer.parentNode.removeChild(shimContainer);
				}

				shimContainer = _iframe = null;
				cb();
			}, 1);
		}

		Basic.extend(this, {
			send: function(meta, data) {
				var target = this, I = target.getRuntime(), uid, form, input, blob;

				_status = _response = null;

				function createIframe() {
					var container = I.getShimContainer() || document.body
					, temp = document.createElement('div')
					;

					// IE 6 won't be able to set the name using setAttribute or iframe.name
					temp.innerHTML = '<iframe id="' + uid + '_iframe" name="' + uid + '_iframe" src="javascript:&quot;&quot;" style="display:none"></iframe>';
					_iframe = temp.firstChild;
					container.appendChild(_iframe);

					/* _iframe.onreadystatechange = function() {
						console.info(_iframe.readyState);
					};*/

					Events.addEvent(_iframe, 'load', function() { // _iframe.onload doesn't work in IE lte 8
						var el;

						try {
							el = _iframe.contentWindow.document || _iframe.contentDocument || window.frames[_iframe.id].document;

							// try to detect some standard error pages
							if (/^4(0[0-9]|1[0-7]|2[2346])\s/.test(el.title)) { // test if title starts with 4xx HTTP error
								_status = el.title.replace(/^(\d+).*$/, '$1');
							} else {
								_status = 200;
								// get result
								_response = Basic.trim(el.body.innerHTML);

								// we need to fire these at least once
								target.trigger({
									type: 'progress',
									loaded: _response.length,
									total: _response.length
								});

								if (blob) { // if we were uploading a file
									target.trigger({
										type: 'uploadprogress',
										loaded: blob.size || 1025,
										total: blob.size || 1025
									});
								}
							}
						} catch (ex) {
							if (Url.hasSameOrigin(meta.url)) {
								// if response is sent with error code, iframe in IE gets redirected to res://ieframe.dll/http_x.htm
								// which obviously results to cross domain error (wtf?)
								_status = 404;
							} else {
								cleanup.call(target, function() {
									target.trigger('error');
								});
								return;
							}
						}	
					
						cleanup.call(target, function() {
							target.trigger('load');
						});
					}, target.uid);
				} // end createIframe

				// prepare data to be sent and convert if required
				if (data instanceof FormData && data.hasBlob()) {
					blob = data.getBlob();
					uid = blob.uid;
					input = Dom.get(uid);
					form = Dom.get(uid + '_form');
					if (!form) {
						throw new x.DOMException(x.DOMException.NOT_FOUND_ERR);
					}
				} else {
					uid = Basic.guid('uid_');

					form = document.createElement('form');
					form.setAttribute('id', uid + '_form');
					form.setAttribute('method', meta.method);
					form.setAttribute('enctype', 'multipart/form-data');
					form.setAttribute('encoding', 'multipart/form-data');

					I.getShimContainer().appendChild(form);
				}

				// set upload target
				form.setAttribute('target', uid + '_iframe');

				if (data instanceof FormData) {
					data.each(function(value, name) {
						if (value instanceof Blob) {
							if (input) {
								input.setAttribute('name', name);
							}
						} else {
							var hidden = document.createElement('input');

							Basic.extend(hidden, {
								type : 'hidden',
								name : name,
								value : value
							});

							// make sure that input[type="file"], if it's there, comes last
							if (input) {
								form.insertBefore(hidden, input);
							} else {
								form.appendChild(hidden);
							}
						}
					});
				}

				// set destination url
				form.setAttribute("action", meta.url);

				createIframe();
				form.submit();
				target.trigger('loadstart');
			},

			getStatus: function() {
				return _status;
			},

			getResponse: function(responseType) {
				if ('json' === responseType) {
					// strip off <pre>..</pre> tags that might be enclosing the response
					if (Basic.typeOf(_response) === 'string' && !!window.JSON) {
						try {
							return JSON.parse(_response.replace(/^\s*<pre[^>]*>/, '').replace(/<\/pre>\s*$/, ''));
						} catch (ex) {
							return null;
						}
					} 
				} else if ('document' === responseType) {

				}
				return _response;
			},

			abort: function() {
				var target = this;

				if (_iframe && _iframe.contentWindow) {
					if (_iframe.contentWindow.stop) { // FireFox/Safari/Chrome
						_iframe.contentWindow.stop();
					} else if (_iframe.contentWindow.document.execCommand) { // IE
						_iframe.contentWindow.document.execCommand('Stop');
					} else {
						_iframe.src = "about:blank";
					}
				}

				cleanup.call(this, function() {
					// target.dispatchEvent('readystatechange');
					target.dispatchEvent('abort');
				});
			},

			destroy: function() {
				this.getRuntime().getShim().removeInstance(this.uid);
			}
		});
	}

	return (extensions.XMLHttpRequest = XMLHttpRequest);
});
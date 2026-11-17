/**
 * Image.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/image/Image
@private
*/
define("moxie/runtime/html5/image/Image", [
	"moxie/runtime/html5/Runtime",
	"moxie/core/utils/Basic",
	"moxie/core/Exceptions",
	"moxie/core/utils/Encode",
	"moxie/file/Blob",
	"moxie/file/File",
	"moxie/runtime/html5/image/ImageInfo",
	"moxie/runtime/html5/image/ResizerCanvas",
	"moxie/core/utils/Mime",
	"moxie/core/utils/Env"
], function(extensions, Basic, x, Encode, Blob, File, ImageInfo, ResizerCanvas, Mime, Env) {

	function HTML5Image() {
		var me = this
		, _img, _imgInfo, _canvas, _binStr, _blob
		, _modified = false // is set true whenever image is modified
		, _preserveHeaders = true
		;

		Basic.extend(this, {
			loadFromBlob: function(blob) {
				var I = this.getRuntime()
				, asBinary = arguments.length > 1 ? arguments[1] : true
				;

				if (!I.can('access_binary')) {
					throw new x.RuntimeError(x.RuntimeError.NOT_SUPPORTED_ERR);
				}

				_blob = blob;

				if (blob.isDetached()) {
					_binStr = blob.getSource();
					_preload.call(this, _binStr);
					return;
				} else {
					_readAsDataUrl.call(this, blob.getSource(), function(dataUrl) {
						if (asBinary) {
							_binStr = _toBinary(dataUrl);
						}
						_preload.call(this, dataUrl);
					});
				}
			},

			loadFromImage: function(img, exact) {
				this.meta = img.meta;

				_blob = new File(null, {
					name: img.name,
					size: img.size,
					type: img.type
				});

				_preload.call(this, exact ? (_binStr = img.getAsBinaryString()) : img.getAsDataURL());
			},

			getInfo: function() {
				var I = this.getRuntime(), info;

				if (!_imgInfo && _binStr && I.can('access_image_binary')) {
					_imgInfo = new ImageInfo(_binStr);
				}

				// this stuff below is definitely having fun with itself
				info = {
					width: _getImg().width || 0,
					height: _getImg().height || 0,
					type: _blob.type || Mime.getFileMime(_blob.name),
					size: _binStr && _binStr.length || _blob.size || 0,
					name: _blob.name || '',
					meta: null
				};

				if (_preserveHeaders) {
					info.meta = _imgInfo && _imgInfo.meta || this.meta || {};

					// if data was taken from ImageInfo it will be a binary string, so we convert it to blob
					if (info.meta && info.meta.thumb && !(info.meta.thumb.data instanceof Blob)) {
						info.meta.thumb.data = new Blob(null, {
							type: 'image/jpeg',
							data: info.meta.thumb.data
						});
					}
				}

				return info;
			},


			resize: function(rect, ratio, options) {
				var canvas = document.createElement('canvas');
				canvas.width = rect.width;
				canvas.height = rect.height;

				canvas.getContext("2d").drawImage(_getImg(), rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);

				_canvas = ResizerCanvas.scale(canvas, ratio);

				_preserveHeaders = options.preserveHeaders;

				// rotate if required, according to orientation tag
				if (!_preserveHeaders) {
					var orientation = (this.meta && this.meta.tiff && this.meta.tiff.Orientation) || 1;
					_canvas = _rotateToOrientaion(_canvas, orientation);
				}

				this.width = _canvas.width;
				this.height = _canvas.height;

				_modified = true;

				this.trigger('Resize');
			},

			getAsCanvas: function() {
				if (!_canvas) {
					_canvas = _getCanvas();
				}
				_canvas.id = this.uid + '_canvas';
				return _canvas;
			},

			getAsBlob: function(type, quality) {
				if (type !== this.type) {
					_modified = true; // reconsider the state
					return new File(null, {
						name: _blob.name || '',
						type: type,
						data: me.getAsDataURL(type, quality)
					});
				}
				return new File(null, {
					name: _blob.name || '',
					type: type,
					data: me.getAsBinaryString(type, quality)
				});
			},

			getAsDataURL: function(type) {
				var quality = arguments[1] || 90;

				// if image has not been modified, return the source right away
				if (!_modified) {
					return _img.src;
				}

				// make sure we have a canvas to work with
				_getCanvas();

				if ('image/jpeg' !== type) {
					return _canvas.toDataURL('image/png');
				} else {
					try {
						// older Geckos used to result in an exception on quality argument
						return _canvas.toDataURL('image/jpeg', quality/100);
					} catch (ex) {
						return _canvas.toDataURL('image/jpeg');
					}
				}
			},

			getAsBinaryString: function(type, quality) {
				// if image has not been modified, return the source right away
				if (!_modified) {
					// if image was not loaded from binary string
					if (!_binStr) {
						_binStr = _toBinary(me.getAsDataURL(type, quality));
					}
					return _binStr;
				}

				if ('image/jpeg' !== type) {
					_binStr = _toBinary(me.getAsDataURL(type, quality));
				} else {
					var dataUrl;

					// if jpeg
					if (!quality) {
						quality = 90;
					}

					// make sure we have a canvas to work with
					_getCanvas();

					try {
						// older Geckos used to result in an exception on quality argument
						dataUrl = _canvas.toDataURL('image/jpeg', quality/100);
					} catch (ex) {
						dataUrl = _canvas.toDataURL('image/jpeg');
					}

					_binStr = _toBinary(dataUrl);

					if (_imgInfo) {
						_binStr = _imgInfo.stripHeaders(_binStr);

						if (_preserveHeaders) {
							// update dimensions info in exif
							if (_imgInfo.meta && _imgInfo.meta.exif) {
								_imgInfo.setExif({
									PixelXDimension: this.width,
									PixelYDimension: this.height
								});
							}

							// re-inject the headers
							_binStr = _imgInfo.writeHeaders(_binStr);
						}

						// will be re-created from fresh on next getInfo call
						_imgInfo.purge();
						_imgInfo = null;
					}
				}

				_modified = false;

				return _binStr;
			},

			destroy: function() {
				me = null;
				_purge.call(this);
				this.getRuntime().getShim().removeInstance(this.uid);
			}
		});


		function _getImg() {
			if (!_canvas && !_img) {
				throw new x.ImageError(x.DOMException.INVALID_STATE_ERR);
			}
			return _canvas || _img;
		}


		function _getCanvas() {
			var canvas = _getImg();
			if (canvas.nodeName.toLowerCase() == 'canvas') {
				return canvas;
			}
			_canvas = document.createElement('canvas');
			_canvas.width = canvas.width;
			_canvas.height = canvas.height;
			_canvas.getContext("2d").drawImage(canvas, 0, 0);
			return _canvas;
		}


		function _toBinary(str) {
			return Encode.atob(str.substring(str.indexOf('base64,') + 7));
		}


		function _toDataUrl(str, type) {
			return 'data:' + (type || '') + ';base64,' + Encode.btoa(str);
		}


		function _preload(str) {
			var comp = this;

			_img = new Image();
			_img.onerror = function() {
				_purge.call(this);
				comp.trigger('error', x.ImageError.WRONG_FORMAT);
			};
			_img.onload = function() {
				comp.trigger('load');
			};

			_img.src = str.substr(0, 5) == 'data:' ? str : _toDataUrl(str, _blob.type);
		}


		function _readAsDataUrl(file, callback) {
			var comp = this, fr;

			// use FileReader if it's available
			if (window.FileReader) {
				fr = new FileReader();
				fr.onload = function() {
					callback.call(comp, this.result);
				};
				fr.onerror = function() {
					comp.trigger('error', x.ImageError.WRONG_FORMAT);
				};
				fr.readAsDataURL(file);
			} else {
				return callback.call(this, file.getAsDataURL());
			}
		}

		/**
		* Transform canvas coordination according to specified frame size and orientation
		* Orientation value is from EXIF tag
		* @author Shinichi Tomita <shinichi.tomita@gmail.com>
		*/
		function _rotateToOrientaion(img, orientation) {
			var RADIANS = Math.PI/180;
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext('2d');
			var width = img.width;
			var height = img.height;

			if (Basic.inArray(orientation, [5,6,7,8]) > -1) {
				canvas.width = height;
				canvas.height = width;
			} else {
				canvas.width = width;
				canvas.height = height;
			}

			/**
			1 = The 0th row is at the visual top of the image, and the 0th column is the visual left-hand side.
			2 = The 0th row is at the visual top of the image, and the 0th column is the visual right-hand side.
			3 = The 0th row is at the visual bottom of the image, and the 0th column is the visual right-hand side.
			4 = The 0th row is at the visual bottom of the image, and the 0th column is the visual left-hand side.
			5 = The 0th row is the visual left-hand side of the image, and the 0th column is the visual top.
			6 = The 0th row is the visual right-hand side of the image, and the 0th column is the visual top.
			7 = The 0th row is the visual right-hand side of the image, and the 0th column is the visual bottom.
			8 = The 0th row is the visual left-hand side of the image, and the 0th column is the visual bottom.
			*/
			switch (orientation) {
				case 2:
					// horizontal flip
					ctx.translate(width, 0);
					ctx.scale(-1, 1);
					break;
				case 3:
					// 180 rotate left
					ctx.translate(width, height);
					ctx.rotate(180 * RADIANS);
					break;
				case 4:
					// vertical flip
					ctx.translate(0, height);
					ctx.scale(1, -1);
					break;
				case 5:
					// vertical flip + 90 rotate right
					ctx.rotate(90 * RADIANS);
					ctx.scale(1, -1);
					break;
				case 6:
					// 90 rotate right
					ctx.rotate(90 * RADIANS);
					ctx.translate(0, -height);
					break;
				case 7:
					// horizontal flip + 90 rotate right
					ctx.rotate(90 * RADIANS);
					ctx.translate(width, -height);
					ctx.scale(-1, 1);
					break;
				case 8:
					// 90 rotate left
					ctx.rotate(-90 * RADIANS);
					ctx.translate(-width, 0);
					break;
			}

			ctx.drawImage(img, 0, 0, width, height);
			return canvas;
		}


		function _purge() {
			if (_imgInfo) {
				_imgInfo.purge();
				_imgInfo = null;
			}

			_binStr = _img = _canvas = _blob = null;
			_modified = false;
		}
	}

	return (extensions.Image = HTML5Image);
});

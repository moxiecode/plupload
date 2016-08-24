/**
 * ImageResizer.js
 *
 * Copyright 2015, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class plupload/ImageResizer
@constructor 
*/
define("plupload/ImageResizer", [
	'plupload',
	'plupload/core/Queueable',
	'moxie/image/Image'
], function(plupload, Queueable, mxiImage) {

	/**
	Image preloading and manipulation utility. Additionally it provides access to image meta info (Exif, GPS) and raw binary data.

	@class plupload/Image
	@constructor
	*/
	function ImageResizer(fileRef, options) {

		Queueable.call(this);

		this._options = {
			width: 0,
			height: 0,
			type: 'image/jpeg',
			quality: 90,
			crop: false,
			fit: true,
			preserveHeaders: true,
			resample: 'default',
			multipass: true
		};

		this.setOption = function(option, value) {
			if (typeof(option) !== 'object' && !this._options.hasOwnProperty(option)) {
				return;
			}
			ImageResizer.prototype.setOption.call(this);
		};


		this.start = function(options) {
			var self = this;
			var options = self.getOptions();
			var img;

			this.setOptions(options.resize);

			img = new mxiImage();

			img.bind('load', function() {
				this.resize(options);
			});

			img.bind('resize', function() {
				self.done(this.getAsBlob(options.type, options.quality));
				this.destroy();
			});

			img.bind('error', function() {
				self.failed();
				this.destroy();
			});

			img.load(file);
		};

		this.setOptions(option.resize);
	}


	File.prototype = new Queueable();


	return ImageResizer;
});



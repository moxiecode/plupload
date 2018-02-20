/**
 * ImageResizer.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 @class plupload.ImageResizer
 @extends plupload.core.Queueable
 @constructor
 @private
 @final
 @since 3.0
 @param {plupload.File} fileRef
*/
define("plupload/ImageResizer", [
	'plupload',
	'plupload/core/Queueable'
], function(plupload, Queueable) {
	var mxiImage = moxie.image.Image;

	function ImageResizer(fileRef) {

		Queueable.call(this);

		this._options = {
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
			ImageResizer.prototype.setOption.apply(this, arguments);
		};


		this.start = function(options) {
			var self = this;
			var img;

			if (options) {
				this.setOptions(options.resize);
			}

			img = new mxiImage();

			img.bind('load', function() {
				this.resize(self.getOptions());
			});

			img.bind('resize', function() {
				self.done(this.getAsBlob(self.getOption('type'), self.getOption('quality')));
				this.destroy();
			});

			img.bind('error', function() {
				self.failed();
				this.destroy();
			});

			img.load(fileRef, self.getOption('runtimeOptions'));
		};
	}

	plupload.inherit(ImageResizer, Queueable);

	// ImageResizer is only included for builds with Image manipulation support, so we add plupload.Image here manually
	plupload.Image = mxiImage;

	return ImageResizer;
});



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
	'moxie/image/Image'
], function(plupload, Image) {

	/**
	Image preloading and manipulation utility. Additionally it provides access to image meta info (Exif, GPS) and raw binary data.

	@class plupload/Image
	@constructor
	*/
	plupload.Image = Image;

});
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
@class moxie/runtime/flash/file/FileInput
@private
*/
define("moxie/runtime/flash/file/FileInput", [
	"moxie/runtime/flash/Runtime",
	"moxie/file/File",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Basic"
], function(extensions, File, Dom, Basic) {

	var FileInput = {
		init: function(options) {
			var comp = this, I = this.getRuntime();
			var browseButton = Dom.get(options.browse_button);

			if (browseButton) {
				browseButton.setAttribute('tabindex', -1);
				browseButton = null;
			}

			this.bind("Change", function() {
				var files = I.shimExec.call(comp, 'FileInput', 'getFiles');
				comp.files = [];
				Basic.each(files, function(file) {
					comp.files.push(new File(I.uid, file));
				});
			}, 999);

			this.getRuntime().shimExec.call(this, 'FileInput', 'init', {
				accept: options.accept,
				multiple: options.multiple
			});

			this.trigger('ready');
		}
	};

	return (extensions.FileInput = FileInput);
});


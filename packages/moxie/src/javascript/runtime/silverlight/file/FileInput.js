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
@class moxie/runtime/silverlight/file/FileInput
@private
*/
define("moxie/runtime/silverlight/file/FileInput", [
	"moxie/runtime/silverlight/Runtime",
	"moxie/file/File",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Basic"
], function(extensions, File, Dom, Basic) {

	function toFilters(accept) {
		var filter = '';
		for (var i = 0; i < accept.length; i++) {
			filter += (filter !== '' ? '|' : '') + accept[i].title + " | *." + accept[i].extensions.replace(/,/g, ';*.');
		}
		return filter;
	}

	
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
			
			I.shimExec.call(this, 'FileInput', 'init', toFilters(options.accept), options.multiple);
			this.trigger('ready');
		},

		setOption: function(name, value) {
			if (name == 'accept') {
				value = toFilters(value);
			}
			this.getRuntime().shimExec.call(this, 'FileInput', 'setOption', name, value);
		}
	};

	return (extensions.FileInput = FileInput);
});
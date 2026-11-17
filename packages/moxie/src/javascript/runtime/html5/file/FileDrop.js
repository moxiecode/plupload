/**
 * FileDrop.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/runtime/html5/file/FileDrop
@private
*/
define("moxie/runtime/html5/file/FileDrop", [
	"moxie/runtime/html5/Runtime",
	'moxie/file/File',
	"moxie/core/utils/Basic",
	"moxie/core/utils/Dom",
	"moxie/core/utils/Events",
	"moxie/core/utils/Mime"
], function(extensions, File, Basic, Dom, Events, Mime) {
	
	function FileDrop() {
		var _files = [], _allowedExts = [], _options, _ruid;

		Basic.extend(this, {
			init: function(options) {
				var comp = this, dropZone;

				_options = options;
				_ruid = comp.ruid; // every dropped-in file should have a reference to the runtime
				_allowedExts = _extractExts(_options.accept);
				dropZone = _options.container;

				Events.addEvent(dropZone, 'dragover', function(e) {
					if (!_hasFiles(e)) {
						return;
					}
					e.preventDefault();
					e.dataTransfer.dropEffect = 'copy';
				}, comp.uid);

				Events.addEvent(dropZone, 'drop', function(e) {
					if (!_hasFiles(e)) {
						return;
					}
					e.preventDefault();

					_files = [];

					// Chrome 21+ accepts folders via Drag'n'Drop
					if (e.dataTransfer.items && e.dataTransfer.items[0].webkitGetAsEntry) {
						_readItems(e.dataTransfer.items, function() {
							comp.files = _files;
							comp.trigger("drop");
						});
					} else {
						Basic.each(e.dataTransfer.files, function(file) {
							_addFile(file);
						});
						comp.files = _files;
						comp.trigger("drop");
					}
				}, comp.uid);

				Events.addEvent(dropZone, 'dragenter', function(e) {
					comp.trigger("dragenter");
				}, comp.uid);

				Events.addEvent(dropZone, 'dragleave', function(e) {
					comp.trigger("dragleave");
				}, comp.uid);
			},

			destroy: function() {
				Events.removeAllEvents(_options && Dom.get(_options.container), this.uid);
				_ruid = _files = _allowedExts = _options = null;
				this.getRuntime().getShim().removeInstance(this.uid);
			}
		});


		function _hasFiles(e) {
			if (!e.dataTransfer || !e.dataTransfer.types) { // e.dataTransfer.files is not available in Gecko during dragover
				return false;
			}

			var types = Basic.toArray(e.dataTransfer.types || []);

			return Basic.inArray("Files", types) !== -1 ||
				Basic.inArray("public.file-url", types) !== -1 || // Safari < 5
				Basic.inArray("application/x-moz-file", types) !== -1 // Gecko < 1.9.2 (< Firefox 3.6)
				;
		}


		function _addFile(file, relativePath) {
			if (_isAcceptable(file)) {
				var fileObj = new File(_ruid, file);
				fileObj.relativePath = relativePath || '';
				_files.push(fileObj);
			}
		}

		
		function _extractExts(accept) {
			var exts = [];
			for (var i = 0; i < accept.length; i++) {
				[].push.apply(exts, accept[i].extensions.split(/\s*,\s*/));
			}
			return Basic.inArray('*', exts) === -1 ? exts : [];
		}


		function _isAcceptable(file) {
			if (!_allowedExts.length) {
				return true;
			}
			var ext = Mime.getFileExtension(file.name);
			return !ext || Basic.inArray(ext, _allowedExts) !== -1;
		}


		function _readItems(items, cb) {
			var entries = [];
			Basic.each(items, function(item) {
				var entry = item.webkitGetAsEntry();
				// Address #998 (https://code.google.com/p/chromium/issues/detail?id=332579)
				if (entry) {
					// file() fails on OSX when the filename contains a special character (e.g. umlaut): see #61
					if (entry.isFile) {
						_addFile(item.getAsFile(), entry.fullPath);
					} else {
						entries.push(entry);
					}
				}
			});

			if (entries.length) {
				_readEntries(entries, cb);
			} else {
				cb();
			}
		}


		function _readEntries(entries, cb) {
			var queue = [];
			Basic.each(entries, function(entry) {
				queue.push(function(cbcb) {
					_readEntry(entry, cbcb);
				});
			});
			Basic.inSeries(queue, function() {
				cb();
			});
		}


		function _readEntry(entry, cb) {
			if (entry.isFile) {
				entry.file(function(file) {
					_addFile(file, entry.fullPath);
					cb();
				}, function() {
					// fire an error event maybe
					cb();
				});
			} else if (entry.isDirectory) {
				_readDirEntry(entry, cb);
			} else {
				cb(); // not file, not directory? what then?..
			}
		}


		function _readDirEntry(dirEntry, cb) {
			var entries = [], dirReader = dirEntry.createReader();

			// keep quering recursively till no more entries
			function getEntries(cbcb) {
				dirReader.readEntries(function(moreEntries) {
					if (moreEntries.length) {
						[].push.apply(entries, moreEntries);
						getEntries(cbcb);
					} else {
						cbcb();
					}
				}, cbcb);
			}

			// ...and you thought FileReader was crazy...
			getEntries(function() {
				_readEntries(entries, cb);
			}); 
		}
	}

	return (extensions.FileDrop = FileDrop);
});
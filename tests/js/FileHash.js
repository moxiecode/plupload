;(function() {

var hasBlobConstructor = (function() {
	try {
        return !!new Blob();
    } catch (e) {
        return false;
    }
}());


var BlobBuilder = (function() {
	return window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;
}());


window.FileHash = new (function() {
	var _options = {}
	, _filesAdded = 0
	, _nativeFiles = []
	, _runtimeFiles = []
	;
	
	return  {

		init: function(options) {
			var scripts = '';

			_options = options;

			if (typeof _options.files === 'string') {
				_options.files = [_options.files];
			}

			for (var i = 0; i < _options.files.length; i++) {
				scripts += '<script type="text/javascript" src="' + _options.files[i] + '"></script>\n';
			}
			document.write(scripts);
		},


		add: function(fileData) {
			var type = fileData.type || ''
			, binStr = window.atob(fileData.data)
			;

			// add native file where possible
			if (hasBlobConstructor) {
				_nativeFiles.push({
					name: fileData.name,
					blob: new Blob([binStr], { type: type })
				});
			} else if (BlobBuilder) {
				var bb = new BlobBuilder();
				bb.append(binStr);
				_nativeFiles.push({
					name: fileData.name,
					blob: bb.getBlob(type)
				});
			}

			// add runtime version
			if (window.o && window.o.File) {
				_runtimeFiles.push(new o.File(null, {
					name: fileData.name,
					type: type,
					data: binStr
				}));
			}

			_filesAdded++;

			if (_filesAdded == _options.files.length && _options.onready) {
				_options.onready.call(this);
			}
		},


		getNativeFiles: function() {
			return _nativeFiles;
		},


		getRuntimeFiles: function() {
			var files = [];
			// return fresh set
			o.each(_runtimeFiles, function(file) {
				files.push(new o.File(null, {
					name: file.name,
					data: file.getSource()
				}));
			});
			return files;
		}
	};
});


}());

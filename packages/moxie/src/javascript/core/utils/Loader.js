/**
 * Loader.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Loader
@private
*/
define("moxie/core/utils/Loader", [
	"moxie/core/utils/Basic"
], function(Basic) {

	var loadScript = function(url, cb, attrs) {
		var head, script, cbCalled = false;

		head = document.getElementsByTagName('head')[0];
		script = document.createElement('script');
		script.type = 'text/javascript';

		script.onreadystatechange = function () {
			if (this.readyState == 'complete' && !cbCalled) {
				cbCalled = true;
				cb();
			}
		}
		
		script.onload = function() {
			if (!cbCalled) {
				cbCalled = true;
				cb();
			}
		};

		if (typeof(attrs) === 'object') {
			Basic.each(attrs, function(value, key) {
				script.setAttribute(key, value);
			});
		}

		script.src = url;
		
		head.appendChild(script);
		return script;
	};


	var interpolateProgress = function(loaded, total, partNum, totalParts) {
		var partSize = total / totalParts;
		return Math.ceil((partNum - 1) * partSize + partSize * loaded / total);
	};

	
	return {
		loadScript: loadScript,
		interpolateProgress: interpolateProgress
	};
});
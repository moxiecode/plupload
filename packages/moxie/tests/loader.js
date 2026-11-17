;(function() {
	var scripts = [
		"//ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js",
		"//code.jquery.com/qunit/qunit-1.14.0.js",
		"js/testrunner/reporter.js",
		"js/test-runtime.js"
	];

	var styles = [
		"http://code.jquery.com/qunit/qunit-git.css"
	];


	function getBaseUrl() {
		var baseUrl = '';
		var scripts = document.getElementsByTagName('script');
		for (var i = 0; i < scripts.length; i++) {
			var src = scripts[i].src;

			if (/loader\.js/.test(src)) {
				baseUrl = src.substring(0, src.lastIndexOf('/'));
				break;
			}
		}
		return baseUrl + '/';
	}

	var baseUrl = getBaseUrl();

	var matches = document.location.search.match(/src=(min|dev|cov)/);
	var source = matches ? matches[1] : 'min';
	document.write('<script src="' + baseUrl + '/../../bin/js/moxie' + (source !== 'dev' ? '.' + source : '') + '.js"></script>');
	// load that compatibility shim that we use all over the tests, if it wasn't already loaded
	if (!window.o) {
		document.write('<script src="' + baseUrl + '/../../src/javascript/o.js"></script>');
	}

	var i;
	for (i = 0; i < styles.length; i++) {
		document.write('<link rel="stylesheet" href="' + (/^(http|\/\/)/.test(styles[i]) ? styles[i] : baseUrl + styles[i]) + '" type="text/css" />');
	}

	for (i = 0; i < scripts.length; i++) {
		document.write('<script src="' + (/^(http|\/\/)/.test(scripts[i]) ? scripts[i] : baseUrl + scripts[i]) +'"></script>');
	}
}());

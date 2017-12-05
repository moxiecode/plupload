;(function() {
	var scripts = [
		"//ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js",
		"//ajax.googleapis.com/ajax/libs/jqueryui/1.10.2/jquery-ui.min.js",
		"//code.jquery.com/qunit/qunit-1.14.0.js",
		"//cdnjs.cloudflare.com/ajax/libs/json2/20160511/json2.min.js",
		"js/testrunner/reporter.js",
		"js/FileHash.js",
		"js/test-runtime.js"
	];

	var styles = [
		"//ajax.googleapis.com/ajax/libs/jqueryui/1.8.9/themes/base/jquery-ui.css",
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

	document.write('<script src="' + baseUrl + '/../../js/moxie.js"></script>');
	// load that compatibility shim that we use all over the tests, if it wasn't already loaded
	if (!window.o) {
		document.write('<script src="' + baseUrl + 'js/o.js"></script>');
	}
	document.write('<script src="' + baseUrl + '/../../js/plupload.dev.js"></script>');


	var i;
	for (i = 0; i < styles.length; i++) {
		document.write('<link rel="stylesheet" href="' + (/^(http|\/\/)/.test(styles[i]) ? styles[i] : baseUrl + styles[i]) + '" type="text/css" />');
	}

	for (i = 0; i < scripts.length; i++) {
		document.write('<script src="' + (/^(http|\/\/)/.test(scripts[i]) ? scripts[i] : baseUrl + scripts[i]) +'"></script>');
	}

	document.write('<script src="' + baseUrl + '/../../'+(source === 'min' ? 'js' : 'src')+'/jquery.ui.plupload/jquery.ui.plupload.js"></script>');
	document.write('<link rel="stylesheet" href="' + baseUrl + '/../../'+(source === 'min' ? 'js' : 'src')+'/jquery.ui.plupload/css/jquery.ui.plupload.css" type="text/css" />');
})();

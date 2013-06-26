(function() {
	var baseURL;

	// Get base where the tinymce script is located
	var scripts = document.getElementsByTagName('script');
	for (var i = 0; i < scripts.length; i++) {
		var src = scripts[i].src;

		if (/scriptloader\.js/.test(src)) {
			baseURL = src.substring(0, src.lastIndexOf('/'));
			break;
		}
	}

	var matches = document.location.search.match(/src=(min|dev|cov)/);
	var source = matches ? matches[1] : 'min';

	document.write('<script src="' + baseURL + '/../js/moxie.js"></script>');
	document.write('<script src="' + baseURL + '/../js/plupload.' + source + '.js"></script>');
})();

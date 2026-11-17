var fs = require('fs');
var utils = require('./utils');
var tools = require('./tools');


function getAvailbleRuntimes(baseDir) {
	var runtimesDir = baseDir + '/runtime';

	// each runtime is represented by a directory inside runtime/ dir
	var files = fs.readdirSync(runtimesDir)
	, runtimes = []
	;
	files.forEach(function(file) {
		if (fs.lstatSync(runtimesDir + '/' + file).isDirectory()) {
			runtimes.push(file);
		}
	});
	return runtimes;
}


function getExtensionPaths(options) {
	var modules = ["file/Blob", "file/FileInput", "file/FileDrop", "file/FileReader", "xhr/XMLHttpRequest"];
	var extensions = [];

	if (options.imageSupport) {
		modules.push("image/Image");
	}

	extensions = getExtensionPaths4(modules, {
		runtimes: options.runtimes,
		baseDir: options.extensionsDir
	});

	// we need to strip of the baseDir for plupload
	var re = new RegExp('^' + options.baseDir.replace(/\//g, '\/') + '\/?');
	return extensions.map(function(ext) {
		return ext.replace(re, '');
	});
}


/**
@param {Array} paths Array of module path that can be extended with runtimes
@param {Object} options
	@param {String} options.baseDir
	@param {String|Array} [options.runtimes=all]
@return {Array} Array of paths to extensions
*/
function getExtensionPaths4(paths, options) {
	var runtimes = options.runtimes;
	var resolvedPaths = [];

	if (runtimes == 'all') {
		runtimes = getAvailbleRuntimes(options.baseDir);
	} else {
		runtimes = (runtimes || 'html5,flash,silverlight,html4').split(/,/);
	}

	if (runtimes.length) {
		runtimes.forEach(function(type) {
			paths.forEach(function(path) {
				path = options.baseDir + '/runtime/' + type + '/' + path.replace(/(^\/|\.js$)/, '') + '.js';
				if (fs.existsSync(path)) {
					resolvedPaths.push(path);
				}
			});
		});
	}

	return resolvedPaths;
}


var addCompat = function(options) {
	var buffer = fs.readFileSync(options.baseDir + '/o.js');

	// add normal
	if (fs.existsSync(options.targetDir + "/moxie.js")) {
		fs.appendFileSync(options.targetDir + "/moxie.js", "\n" + buffer);
	}

	// ... minified
	if (fs.existsSync(options.targetDir + "/moxie.min.js")) {
		fs.appendFileSync(options.targetDir + "/moxie.min.js", tools.uglify(options.baseDir + '/o.js', null, {
			sourceBase: options.baseDir
		}));
	}

	// .. dev/cov
	['dev', 'cov'].forEach(function(suffix) {
		var fileName = "moxie." + suffix + ".js";
		if (fs.existsSync(options.targetDir + "/" + fileName)) {
			fs.appendFileSync(options.targetDir + "/" + fileName,
				"\n\n(function() {\n" +
				"	var baseDir = '';\n" +
				"	var scripts = document.getElementsByTagName('script');\n" +
				"	for (var i = 0; i < scripts.length; i++) {\n" +
				"		var src = scripts[i].src;\n" +
				"		if (src.indexOf('/" + fileName + "') != -1) {\n" +
				"			baseDir = src.substring(0, src.lastIndexOf('/'));\n" +
				"		}\n" +
				"	}\n" +
				"	document.write('<script type=\"text/javascript\" src=\"' + baseDir + '/../../" + options.baseDir + "/o.js\"></script>');\n" +
				"})();\n"
			);
		}
	});
};

var addDebug = function(srcPath, enable) {
	enable = enable === undefined ? true : enable;

	if (fs.existsSync(srcPath)) {
		var buffer = fs.readFileSync(srcPath);
		fs.writeFileSync(srcPath, ";var MXI_DEBUG = "+enable+";\n" + buffer);
	}
};

// String.prototype.replace() does something weird on strings with fancy regexps,
// hence this artifical version
var replace = function(from, to, text, all) {
	var pos = text.indexOf(from);
	if (pos == -1) {
		return text;
	}
	text = text.substring(0, pos) + to + text.substring(pos + from.length);
	return !all ? text : replace.call(null, from, to, text, all);
};

var addUMD = function(ns, iife, deps) {
	var wrap = '\
;(function (global, factory) {\n\
	var extract = function() {\n\
		var ctx = {};\n\
		factory.apply(ctx, arguments);\n\
		return ctx.__ns__;\n\
	};\n\
	\n\
	if (typeof define === "function" && define.amd) {\n\
		define("__ns__", [__deps_quoted__], extract);\n\
	} else if (typeof module === "object" && module.exports) {\n\
		module.exports = extract(__deps_require__);\n\
	} else {\n\
		global.__ns__ = extract(__deps_global__);\n\
	}\n\
}(this || window, function(__deps__) {\n\
__iife__\n\
}));\
';

	var depsQuoted = depsGlobal = depsRequire = depsPlain = '';

	if (deps && deps.length) {
		depsQuoted = "'./" + deps.join("', './") + "'";
		depsGlobal = "global." + deps.join(", global.");
		depsRequire = "require('./" + deps.join("'), require('./") + "')";
		depsPlain = deps.join(', ');
	}

	wrap = replace('__ns__', ns, wrap, true);
	wrap = replace('__deps__', depsPlain, wrap, true);
	wrap = replace('__deps_quoted__', depsQuoted, wrap, true);
	wrap = replace('__deps_global__', depsGlobal, wrap, true);
	wrap = replace('__deps_require__', depsRequire, wrap, true);
	wrap = replace('__iife__', iife, wrap);
	return wrap;
};


module.exports = {
	getExtensionPaths: getExtensionPaths,
	getExtensionPaths4: getExtensionPaths4,
	addCompat: addCompat,
	addDebug: addDebug,
	addUMD: addUMD
};



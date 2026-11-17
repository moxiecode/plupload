var fs = require("fs");
var path = require("path");
var exec = require("child_process").exec;
var utils = require("./utils");


var color = function(s,c){return (color[c].toLowerCase()||'')+ s + color.reset;};
color.reset = '\033[39m';
color.red = '\033[31m';
color.yellow = '\033[33m';
color.green = '\033[32m';


exports.uglify = function (sourceFiles, outputFile, options) {
	var uglifyJS = require("uglify-js");
	var code = "";

	options = utils.extend({
		unused: true,
		dead_code: true
	}, options);

	// Combine JS files
	if (sourceFiles instanceof Array) {
		sourceFiles.forEach(function(filePath) {
			if (options.sourceBase) {
				filePath = path.join(options.sourceBase, filePath);
			}
			code += fs.readFileSync(filePath).toString();
		});
	} else {
		code += fs.readFileSync(sourceFiles).toString();
	}

	// Compress
	var result = uglifyJS.minify(code, {
		fromString: true,
		compress: options
	});

	if (outputFile) {
		fs.writeFileSync(outputFile, result.code);
	}
	return code;
};

exports.less = function (sourceFile, outputFile, options) {
	var less = require('less');

	options = extend({
		compress: true,
		yuicompress: true,
		optimization: 1,
		silent: false,
		paths: [],
		color: true,
		strictImports: false
	}, options);

	var parser = new less.Parser({
		paths: [path.dirname(sourceFile)],
		filename: path.basename(sourceFile),
        optimization: options.optimization,
        filename: sourceFile,
        strictImports: options.strictImports
	});

	// Patch over BOM bug
	// Todo: Remove this when they fix the bug
	less.Parser.importer = function (file, paths, callback, env) {
		var pathname;

		paths.unshift('.');

		for (var i = 0; i < paths.length; i++) {
			try {
				pathname = path.join(paths[i], file);
				fs.statSync(pathname);
				break;
			} catch (e) {
				pathname = null;
			}
		}

		if (pathname) {
			fs.readFile(pathname, 'utf-8', function(e, data) {
				if (e) return callback(e);

				data = data.replace(/^\uFEFF/, '');

				new(less.Parser)({
					paths: [path.dirname(pathname)].concat(paths),
					filename: pathname
				}).parse(data, function (e, root) {
					callback(e, root, data);
				});
			});
		} else {
			if (typeof(env.errback) === "function") {
				env.errback(file, paths, callback);
			} else {
				callback({ type: 'File', message: "'" + file + "' wasn't found.\n" });
			}
		}
	}

	parser.parse(fs.readFileSync(sourceFile).toString(), function (err, tree) {
		if (err) {
			less.writeError(err, options);
			return;
		}

		fs.writeFileSync(outputFile, tree.toCSS({
			compress: options.compress,
			yuicompress: options.yuicompress
		}));
	});
}

exports.yuidoc = function (sourceDir, outputDir, options) {
	var Y = require('yuidocjs');

	if (!(sourceDir instanceof Array)) {
		sourceDir = [sourceDir];
	}

	options = utils.extend({
		paths: sourceDir,
		outdir: outputDir,
		time: false
	}, options);

	var starttime = new Date().getTime();
	var json = (new Y.YUIDoc(options)).run();

	var builder = new Y.DocBuilder(options, json);
	builder.compile(function() {
		var endtime = new Date().getTime();

		if (options.time) {
			Y.log('Completed in ' + ((endtime - starttime) / 1000) + ' seconds' , 'info', 'yuidoc');
		}

		complete();
	});
};

exports.jshint = function (sourceDir, options) {
	var jshint = require('jshint').JSHINT;

	function process(filePath) {
		var stat = fs.statSync(filePath);

		if (stat.isFile()) {
			if (!jshint(fs.readFileSync(filePath).toString(), options)) {
				// Print the errors
				console.log(color('Errors in file ' + filePath, 'red'));
				var out = jshint.data(),
				errors = out.errors;
				Object.keys(errors).forEach(function(error){
					error = errors[error];

					console.log('line: ' + error.line + ':' + error.character+ ' -> ' + error.reason );
					console.log(color(error.evidence,'yellow'));
				});
			}
		} else if (stat.isDirectory()) {
			fs.readdirSync(filePath).forEach(function(fileName) {
				process(path.join(filePath, fileName));
			});
		}
	}

	options = utils.extend({
		boss: true,
		forin: false,
		curly: true,
		smarttabs: true
	}, options);

	process(sourceDir);
}

exports.zip = function (include, zipFile, cb) {
	var fileset = require('fileset');
	var ZipWriter = require('moxie-zip').ZipWriter;

	var zip = new ZipWriter();

	// Exclude files according to .gitignore
	var exclude = fs.readFileSync('./.gitignore').toString().trim().split(/\n/);

	fileset(include, exclude)
		.on('end', function(files) {
			files.forEach(function(file) {
				if (fs.statSync(file).isFile()) {
					zip.addFile(file, file);
				}
			});
			zip.saveAs(zipFile, cb);
		});
}

exports.copySync = function(from, to) {
	var stat;

	function copyFile(srcFile, destFile) {
		var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;

		BUF_LENGTH = 64 * 1024;
		buff = new Buffer(BUF_LENGTH);
		fdr = fs.openSync(srcFile, 'r');
		fdw = fs.openSync(destFile, 'w');
		bytesRead = 1;
		pos = 0;

		while (bytesRead > 0) {
			bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
			fs.writeSync(fdw, buff, 0, bytesRead);
			pos += bytesRead;
		}
		fs.closeSync(fdr);
		return fs.closeSync(fdw);
	}

	try {
		stat = fs.statSync(from);
	} catch (ex) {
		console.info("Error: " + from + " not found.");
		process.exit(1);
	}

	if (stat.isFile()) {
		copyFile(from, to);
	} else if (stat.isDirectory()) {
		/*fs.readdirSync(from).forEach(function(fileName) {
			copySync(from, to)
		});*/
		console.info("Error: " + from + " is directory");
	}
}


// inject version details and copyright header if available to all js files in specified directory
exports.addReleaseDetailsTo = function (destPath, info) {
	var self = this;

	function processFile(filePath) {

		if (info.copyright) {
			contents = info.copyright + "\n" + fs.readFileSync(filePath);
		}

		contents = contents.replace(/@@([^@]+)@@/g, function($0, $1) {
			switch ($1) {
				case "year": return (new Date()).getFullYear();
				case "version": return info.version;
				case "releasedate": return info.releaseDate;
			}
		});

		fs.writeFileSync(filePath, contents);
	}

	function isTextFile(filePath) {
		return /\.(js|txt)$/.filePath;
	}

	var stat = fs.statSync(destPath);

	if (stat.isFile()) {
		processFile(destPath);
	} else if (stat.isDirectory()) {
		fs.readdirSync(destPath).forEach(function(fileName) {
			self.addReleaseDetailsTo(path.join(destPath, fileName), info);
		});
	}
};


exports.downloadFile = function (url, destPath, cb) {
    var protocol = /^https:/.test(url) ? require('https') : require('http');
    var file = fs.createWriteStream(destPath);
    var request = protocol.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(destPath);
        if (cb) {
            cb(err.message);
        }
    });
};


exports.startFresh = function (targetPath) {
    if (fs.existsSync(targetPath)) {
        jake.rmRf(targetPath);
    }
    jake.mkdirP(targetPath);
};

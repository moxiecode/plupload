/* global jake:true, desc:true, task:true, complete:true, require:true, console:true, process:true */
/* jshint unused:false */
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var tools = require('./src/moxie/build/tools');
var utils = require('./src/moxie/build/utils');
var wiki = require('./src/moxie/build/wiki');
var mkjs = require('./src/moxie/build/mkjs');

var copyright = [
	"/**",
	" * Plupload - multi-runtime File Uploader",
	" * v@@version@@",
	" *",
	" * Copyright 2013, Moxiecode Systems AB",
	" * Released under GPL License.",
	" *",
	" * License: http://www.plupload.com/license",
	" * Contributing: http://www.plupload.com/contributing",
	" *",
	" * Date: @@releasedate@@",
	" */"
].join("\n");


desc("Default build task");
task("default", ["moxie", "mkjs", "docs"], function (params) {});



desc("Build release package");
task("release", ["default", "package"], function (params) {});



desc("Build mOxie");
task("moxie", [], function (params) {
	var moxieDir = "./src/moxie";
	var currentDir = process.cwd();

	process.chdir(moxieDir);
	exec("jake", function(error, stdout, stderr) {
		if (error) {
			console.info(error);
		}
		process.chdir(currentDir);
		complete();
	});
}, true);



desc("Minify JS files");
task("mkjs", [], function (i18n) {
	var Instrument = require('coverjs').Instrument;
	var uglify = tools.uglify;

	var targetDir = "./js", moxieDir = "src/moxie";

	// Clear previous versions
	if (fs.existsSync(targetDir)) {
		jake.rmRf(targetDir);
	}
	fs.mkdirSync(targetDir, 0755);


	// Copy compiled moxie files
	tools.copySync(moxieDir + "/bin/flash/Moxie.swf", "js/Moxie.swf");
	tools.copySync(moxieDir + "/bin/silverlight/Moxie.xap", "js/Moxie.xap");
	tools.copySync(moxieDir + "/bin/js/moxie.min.js", "js/moxie.min.js");
	tools.copySync(moxieDir + "/bin/js/moxie.js", "js/moxie.js");


	// Include Plupload source
	var sourceCode = fs.readFileSync('./src/plupload.js').toString();

	if (process.env.umd != 'no') {
		fs.writeFileSync(targetDir + '/plupload.dev.js', mkjs.addUMD("plupload", sourceCode, ['moxie']));
	} else {
		fs.writeFileSync(targetDir + '/plupload.dev.js', sourceCode);
	}

	// Minify Plupload and combine with mOxie
	uglify(targetDir + '/plupload.dev.js', targetDir + "/plupload.min.js");

	var info = require("./package.json");
	info.copyright = copyright;
	tools.addReleaseDetailsTo(targetDir + "/plupload.dev.js", info);
	tools.addReleaseDetailsTo(targetDir + "/plupload.min.js", info);

	var code = "";
	code += fs.readFileSync(targetDir + "/moxie.min.js") + "\n";
	code += fs.readFileSync(targetDir + "/plupload.min.js");

	fs.writeFileSync(targetDir + "/plupload.full.min.js", code);

	// Instrument Plupload code
	fs.writeFileSync(targetDir + '/plupload.cov.js', new Instrument(sourceCode, {
		name: 'Plupload'
	}).instrument());


	// Copy UI Plupload
	jake.cpR("./src/jquery.ui.plupload", targetDir + "/jquery.ui.plupload", {});
	uglify(targetDir + '/jquery.ui.plupload/jquery.ui.plupload.js', targetDir + "/jquery.ui.plupload/jquery.ui.plupload.min.js");

	// Copy Queue Plupload
	jake.cpR("./src/jquery.plupload.queue", targetDir + "/jquery.plupload.queue", {});
	uglify(targetDir + '/jquery.plupload.queue/jquery.plupload.queue.js', targetDir + "/jquery.plupload.queue/jquery.plupload.queue.min.js");

	// Add I18n files
	if (i18n) {
		process.env.auth = "moxieuser:12345";
		process.env.to = "./js/i18n";
		jake.Task['i18n'].invoke();
	}
});



desc("Language tools");
task("i18n", [], function(params) {
	var i18n = require('./build/i18n');

	switch (params) {
		case 'extract':
			var from = process.env.from || ['./src/plupload.js', './src/jquery.ui.plupload/jquery.ui.plupload.js', './src/jquery.plupload.queue/jquery.plupload.queue.js'];
			var to = process.env.to || './tmp/en.po';
			i18n.extract(from, to);
			break;

		case 'toPO':
			// srcLang is required here, e.g.: jake i18n[toPO] srcLang=tmp/en.pot from=js/i18n/*.js
			var from = process.env.from;
			var to = process.env.to || './tmp/i18n';
			i18n.toPot(from, to);
			break;

		case 'pull':
		default:
			var auth = (process.env.auth || "moxieuser:12345").split(':');
			var to = process.env.to || './tmp/i18n';
			i18n.pull(utils.format("https://%s:%s@www.transifex.com/api/2/project/plupload/resource/core/", auth[0], auth[1]), to, complete);
			return;
	}

	complete(); // call complete manually
}, true);



desc("Generate documentation using YUIDoc");
task("docs", [], function (params) {
	var yuidoc = tools.yuidoc;
	yuidoc(["src", "src/jquery.plupload.queue", "src/jquery.ui.plupload"], "docs", {
		norecurse: true
	});
}, true);



desc("Generate wiki pages");
task("wiki", ["docs"], function() {
	wiki("https://github.com/moxiecode/plupload.wiki.git", "wiki", "docs");
});



desc("Runs JSHint on source files");
task("jshint", [], function (params) {
	var jshint = tools.jshint;
	jshint("src", {
		curly: true
	});
});



desc("Package library");
task("package", [], function (params) {
	var zip = tools.zip;
	var info = require("./package.json");

	var tmpDir = "./tmp";
	if (fs.existsSync(tmpDir)) {
		jake.rmRf(tmpDir);
	}
	fs.mkdirSync(tmpDir, 0755);

	var suffix = info.version.replace(/\./g, '_');
	if (/(?:beta|alpha)/.test(suffix)) {
		var dateFormat = require('dateformat');
		// If some public test build, append build number
		suffix += "." + dateFormat(new Date(), "yymmddHHMM", true);
	}

	zip([
		"js/**/*",
		"examples/**/*",
		"README.md",
		"LICENSE.txt"
	], path.join(tmpDir, utils.format("plupload_%s.zip", suffix)), complete);
}, true);


desc("Create NuGet package");
task('mknuget', [], function() {
	var mknuget = require('./src/moxie/build/mknuget');

	mknuget.pack(require('./package.json'), function(err, nugetPath) {
		console.info(nugetPath);
		complete();
	});

}, true);












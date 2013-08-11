/* global jake:true, desc:true, task:true, complete:true, require:true, console:true, process:true */
/* jshint unused:false */
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var tools = require('./src/moxie/build/tools');
var utils = require('./src/moxie/build/utils');
var wiki = require('./src/moxie/build/wiki');

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
task("mkjs", [], function (params) {
	var Instrument = require('coverjs').Instrument;
	var uglify = tools.uglify;

	var targetDir = "./js", moxieDir = "src/moxie";
	
	// Clear previous versions
	if (fs.existsSync(targetDir)) {
		jake.rmRf(targetDir);
	}
	fs.mkdirSync(targetDir, 0755);

	// Include Plupload source
	tools.copySync('./src/plupload.js', "js/plupload.dev.js");

	// Instrument Plupload code
	fs.writeFileSync(targetDir + '/plupload.cov.js', new Instrument(fs.readFileSync('./src/plupload.js').toString(), {
		name: 'Plupload'
	}).instrument());
	

	// Copy compiled moxie files
	tools.copySync(moxieDir + "/bin/flash/Moxie.swf", "js/Moxie.swf");
	tools.copySync(moxieDir + "/bin/silverlight/Moxie.xap", "js/Moxie.xap");
	tools.copySync(moxieDir + "/bin/js/moxie.min.js", "js/moxie.min.js");
	tools.copySync(moxieDir + "/bin/js/moxie.js", "js/moxie.js");

	// Copy UI Plupload
	jake.cpR("./src/jquery.ui.plupload", targetDir + "/jquery.ui.plupload", {});

	uglify([
		'jquery.ui.plupload.js'
	], targetDir + "/jquery.ui.plupload/jquery.ui.plupload.min.js", {
		sourceBase: targetDir + "/jquery.ui.plupload/"
	});

	// Copy Queue Plupload
	jake.cpR("./src/jquery.plupload.queue", targetDir + "/jquery.plupload.queue", {});

	uglify([
		'jquery.plupload.queue.js'
	], targetDir + "/jquery.plupload.queue/jquery.plupload.queue.min.js", {
		sourceBase: targetDir + "/jquery.plupload.queue/"
	});

	// Minify Plupload and combine with mOxie
	uglify([
		'plupload.js'
	], targetDir + "/plupload.min.js", {
		sourceBase: 'src/'
	});

	var info = require("./package.json");
	info.copyright = copyright;
	tools.addReleaseDetailsTo(targetDir + "/plupload.dev.js", info);
	tools.addReleaseDetailsTo(targetDir + "/plupload.min.js", info);

	var code = "";
	code += fs.readFileSync(targetDir + "/moxie.min.js") + "\n";
	code += fs.readFileSync(targetDir + "/plupload.min.js");

	fs.writeFileSync(targetDir + "/plupload.full.min.js", code);

	// Add I18n files
	process.env.auth = "moxieuser:12345";
	process.env.to = "./js/i18n";
	jake.Task['i18n'].invoke();
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
	wiki("git@github.com:moxiecode/plupload.wiki.git", "wiki", "docs");
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












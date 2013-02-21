var fs = require("fs");
var wrench = require("wrench");
var path = require("path");
var exec = require('child_process').exec;
var tools = require('./build/BuildTools');
var uglify = tools.uglify;
var less = tools.less;
var yuidoc = tools.yuidoc;
var jshint = tools.jshint;
var zip = tools.zip;

var wiki = require('./build/wiki');

function exit(message) {
	if (message) {
		console.info(message);
	}
	complete();
	process.exit(arguments[1] || 0);
}

desc("Default build task");
task("default", ["minifyjs", "yuidoc"], function (params) {});

desc("Build release package");
task("release", ["default", "package"], function (params) {});


desc("Build mOxie");
task("moxie", [], function (params) {
	var moxieDir = "src/moxie";
	exec("cd " + moxieDir + "; jake lib; cd ../..;", function(error, stdout, stderr) {
		if (!error) {
			complete();
		} else {
			exit("mOxie: Build process failed.", 1);
		}
	});
}, true);


desc("Minify JS files");
task("minifyjs", ["moxie"], function (params) {
	var targetDir = "./js", moxieDir = "src/moxie";
	
	// Clear previous versions
	if (path.existsSync(targetDir)) {
		tools.rmDir(targetDir);
	}
	fs.mkdirSync(targetDir, 0755);

	// Include Plupload source
	tools.copySync('./src/plupload.js', "js/plupload.js");

	// Copy compiled moxie files
	tools.copySync(moxieDir + "/bin/flash/Moxie.swf", "js/Moxie.swf");
	tools.copySync(moxieDir + "/bin/silverlight/Moxie.xap", "js/Moxie.xap");
	tools.copySync(moxieDir + "/bin/js/moxie.min.js", "js/moxie.min.js");
	tools.copySync(moxieDir + "/bin/js/moxie.js", "js/moxie.js");

	// Copy UI Plupload
	wrench.copyDirSyncRecursive("./src/jquery.ui.plupload", targetDir + "/jquery.ui.plupload", {});

	uglify([
		'jquery.ui.plupload.js'
	], targetDir + "/jquery.ui.plupload/jquery.ui.plupload.min.js", {
		sourceBase: targetDir + "/jquery.ui.plupload/"
	});

	// Copy Queue Plupload
	wrench.copyDirSyncRecursive("./src/jquery.plupload.queue", targetDir + "/jquery.plupload.queue", {});

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

	var releaseInfo = tools.getReleaseInfo("./changelog.txt");
	tools.addReleaseDetailsTo(targetDir + "/plupload.js", releaseInfo);
	tools.addReleaseDetailsTo(targetDir + "/plupload.min.js", releaseInfo);

	var code = "";
	code += fs.readFileSync(targetDir + "/moxie.min.js") + "\n";
	code += fs.readFileSync(targetDir + "/plupload.min.js");

	fs.writeFileSync(targetDir + "/plupload.full.min.js", code);
});


desc("Generate documentation using YUIDoc");
task("yuidoc", [], function (params) {
	yuidoc("src", "docs", {
		norecurse: true
	});
});

desc("Generate wiki pages");
task("wiki", [], function() {
	wiki("git@github.com:moxiecode/plupload.wiki.git", "wiki", "docs");
});

desc("Runs JSHint on source files");
task("jshint", [], function (params) {
	jshint("src", {
		curly: true
	});
});


desc("Package library");
task("package", [], function (params) {
	var releaseInfo = tools.getReleaseInfo("./changelog.txt");

	var tmpDir = "./tmp";
	if (path.existsSync(tmpDir)) {
		wrench.rmdirSyncRecursive(tmpDir);
	}
	fs.mkdirSync(tmpDir, 0755);


	// User package
	zip([
		"js",
		"examples",
		["readme.md", "readme.txt"],
		"changelog.txt",
		"license.txt"
	], path.join(tmpDir, "plupload_" + releaseInfo.fileVersion + ".zip"));

	// Development package
	zip([
		"src",
		"js",
		"examples",
		"tests",
		"build",
		"Jakefile.js",		
		["readme.md", "readme.txt"],
		"changelog.txt",
		"license.txt"
	], path.join(tmpDir, "plupload_" + releaseInfo.fileVersion + "_dev.zip"));
});
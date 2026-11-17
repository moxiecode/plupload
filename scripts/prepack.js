var fs = require('fs');
var path = require('path');
var p = require('./pack-files');

if (!fs.existsSync(path.join(p.pkgDir, 'js/plupload.full.min.js'))) {
	console.error('Missing packages/plupload/js, run `npm run build` first.');
	process.exit(1);
}

p.rootFiles.forEach(function(name) {
	fs.copyFileSync(path.join(p.root, name), path.join(p.pkgDir, name));
});

var moxieTarget = path.join(p.pkgDir, 'src/moxie');
fs.rmSync(moxieTarget, { recursive: true, force: true });
fs.cpSync(p.moxieDir, moxieTarget, {
	recursive: true,
	filter: function(src) {
		var rel = path.relative(p.moxieDir, src).split(path.sep).join('/');
		return !rel || !p.isMoxieExcluded(rel);
	}
});

// moxie is private in the monorepo, but its package.json shipped without that flag
var moxiePkg = path.join(moxieTarget, 'package.json');
fs.writeFileSync(moxiePkg, fs.readFileSync(moxiePkg, 'utf8').replace('\n  "private": true,\n', '\n'));

// Files that are copied into packages/plupload right before `npm pack`/`npm publish`
// so the tarball keeps the same structure as the pre-monorepo releases.
var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var pkgDir = path.join(root, 'packages/plupload');
var moxieDir = path.join(root, 'packages/moxie');

// root files that were part of the package before the monorepo split
var rootFiles = [
	'.gitattributes',
	'.jshintrc',
	'bower.json',
	'composer.json',
	'license.txt',
	'readme.md',
	'SECURITY.md'
];

// moxie files that were never part of the published package
function isMoxieExcluded(rel) {
	var name = path.basename(rel);
	return name === '.gitignore' ||
		rel === 'build/swf2lzma/.gitattributes' ||
		name === '.gitmodules' ||
		name === 'node_modules' ||
		rel === 'bin/flash' ||
		rel === 'bin/js/moxie.min.js' ||
		rel === 'src/flash/.project' ||
		rel === 'src/flash/.settings';
}

module.exports = {
	root: root,
	pkgDir: pkgDir,
	moxieDir: moxieDir,
	rootFiles: rootFiles,
	isMoxieExcluded: isMoxieExcluded,
	// everything prepack creates inside packages/plupload, relative to it
	generated: rootFiles.concat(['src/moxie'])
};

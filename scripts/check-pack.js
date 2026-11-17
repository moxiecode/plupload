// Verifies that the plupload tarball contains exactly the files listed in scripts/npm-files.txt
var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var expected = fs.readFileSync(path.join(__dirname, 'npm-files.txt'), 'utf8').split('\n').filter(Boolean);

var out = execSync('npm pack --dry-run --json --ignore-scripts=false -w packages/plupload', {
	cwd: root,
	stdio: ['ignore', 'pipe', 'inherit']
}).toString();
var actual = JSON.parse(out.slice(out.indexOf('[')))[0].files.map(function(f) {
	return f.path;
}).sort();

var missing = expected.filter(function(f) { return actual.indexOf(f) === -1; });
var extra = actual.filter(function(f) { return expected.indexOf(f) === -1; });

missing.forEach(function(f) { console.error('missing: ' + f); });
extra.forEach(function(f) { console.error('extra:   ' + f); });

if (missing.length || extra.length) {
	process.exit(1);
}
console.info('Tarball file list matches (' + actual.length + ' files).');

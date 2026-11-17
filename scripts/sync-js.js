// Mirrors the build output in packages/plupload/js into the committed root js/ folder.
var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var from = path.join(root, 'packages/plupload/js');
var to = path.join(root, 'js');

// build-only outputs that are not committed
function isExcluded(name) {
	return /\.cov\.js$/.test(name);
}

if (!fs.existsSync(from)) {
	console.error('Missing ' + from + ', run the plupload build first.');
	process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, {
	recursive: true,
	filter: function(src) {
		return !isExcluded(path.basename(src));
	}
});

console.info('Synced ' + path.relative(root, from) + ' -> ' + path.relative(root, to));

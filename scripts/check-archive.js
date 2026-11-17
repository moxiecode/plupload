// Compares the release archive (`git archive`) of a tree with a previous release tarball.
// Usage: node scripts/check-archive.js [release.tar.gz | tag] [tree-ish]
// Without a release argument, the latest vMAJOR.* tag (major taken from packages/plupload/package.json)
// is looked up on GitHub and its source archive, which is what a GitHub release ships, is downloaded.
// The tree-ish defaults to the current index, so staged changes are checked before committing.
// A diff is printed for each differing text file; pass --quiet to only list file names.
var fs = require('fs');
var os = require('os');
var path = require('path');
var execSync = require('child_process').execSync;

var REPO = 'https://github.com/moxiecode/plupload';

var args = process.argv.slice(2).filter(function(a) { return a.indexOf('--') !== 0; });
var quiet = process.argv.indexOf('--quiet') !== -1;

var root = path.resolve(__dirname, '..');
var tree = args[1] || execSync('git write-tree', { cwd: root }).toString().trim();
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-archive-'));

function compareVersions(a, b) {
	var pa = a.split('.').map(Number), pb = b.split('.').map(Number);
	for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
		if ((pa[i] || 0) !== (pb[i] || 0)) {
			return (pa[i] || 0) - (pb[i] || 0);
		}
	}
	return 0;
}

function latestTag() {
	var major = require(path.join(root, 'packages/plupload/package.json')).version.split('.')[0];
	var out = execSync('git ls-remote --tags --refs ' + REPO + '.git "v' + major + '.*"', { cwd: root }).toString();
	var tags = out.split('\n').map(function(line) {
		var m = /refs\/tags\/(v(\d+\.\d+\.\d+))$/.exec(line.trim());
		return m && m[1];
	}).filter(Boolean);
	if (!tags.length) {
		throw new Error('No v' + major + '.x.y tags found on ' + REPO);
	}
	return tags.sort(function(a, b) {
		return compareVersions(a.slice(1), b.slice(1));
	}).pop();
}

async function download(tag) {
	var url = REPO + '/archive/refs/tags/' + tag + '.tar.gz';
	console.info('Downloading ' + url);
	var res = await fetch(url).catch(function(err) {
		throw new Error('Download of ' + url + ' failed: ' + (err.cause ? err.cause.message : err.message));
	});
	if (!res.ok) {
		throw new Error('Download failed: ' + res.status + ' ' + res.statusText);
	}
	var file = path.join(tmp, tag + '.tar.gz');
	fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
	return file;
}

async function resolveRelease(arg) {
	if (arg && (fs.existsSync(arg) || /\.(tar\.gz|tgz)$/.test(arg) || arg.indexOf('/') !== -1)) {
		if (!fs.existsSync(arg)) {
			throw new Error('Release file not found: ' + arg);
		}
		return path.resolve(arg);
	}
	return download(arg || latestTag());
}

function isBinary(buf) {
	return buf.indexOf(0) !== -1;
}

// Minified files are one huge line, so break long lines after ; , { } to get a readable diff
function readable(buf) {
	return buf.toString().split('\n').map(function(line) {
		return line.length > 500 ? line.replace(/([;,{}])/g, '$1\n') : line;
	}).join('\n') + '\n';
}

function showDiff(rel, a, b) {
	if (isBinary(a) || isBinary(b)) {
		console.info('  (binary, ' + a.length + ' -> ' + b.length + ' bytes)');
		return;
	}
	var dir = fs.mkdtempSync(path.join(tmp, 'diff-'));
	fs.writeFileSync(path.join(dir, 'a'), readable(a));
	fs.writeFileSync(path.join(dir, 'b'), readable(b));
	try {
		execSync('diff -u --label "released/' + rel + '" --label "current/' + rel + '" a b', { cwd: dir });
	} catch (e) {
		// diff exits with 1 when the files differ
		process.stdout.write(e.stdout.toString());
	}
}

function extract(dir, cmd) {
	fs.mkdirSync(dir);
	execSync(cmd + ' | tar -x -C "' + dir + '"', { cwd: root, shell: '/bin/sh' });
	// both archives contain a single top-level folder
	var entries = fs.readdirSync(dir);
	return entries.length === 1 && fs.statSync(path.join(dir, entries[0])).isDirectory() ? path.join(dir, entries[0]) : dir;
}

function list(dir, base, out) {
	base = base || '';
	out = out || {};
	fs.readdirSync(dir).forEach(function(name) {
		var abs = path.join(dir, name);
		var rel = base ? base + '/' + name : name;
		if (fs.statSync(abs).isDirectory()) {
			list(abs, rel, out);
		} else {
			out[rel] = abs;
		}
	});
	return out;
}

async function main() {
	var tarball = await resolveRelease(args[0]);
	var released = list(extract(path.join(tmp, 'released'), 'gzip -dc "' + tarball + '"'));
	var current = list(extract(path.join(tmp, 'current'), 'git archive --prefix=archive/ ' + tree));

	var problems = 0;
	Object.keys(released).sort().forEach(function(rel) {
		if (!current[rel]) {
			console.info('missing: ' + rel);
			problems++;
		} else {
			var a = fs.readFileSync(released[rel]);
			var b = fs.readFileSync(current[rel]);
			if (!a.equals(b)) {
				console.info('differs: ' + rel);
				if (!quiet) {
					showDiff(rel, a, b);
				}
				problems++;
			}
		}
	});
	Object.keys(current).sort().forEach(function(rel) {
		if (!released[rel]) {
			console.info('extra:   ' + rel);
			problems++;
		}
	});

	if (problems) {
		console.info(problems + ' difference(s) from ' + path.basename(tarball));
		process.exitCode = 1;
	} else {
		console.info('Archive matches ' + path.basename(tarball) + ' (' + Object.keys(released).length + ' files).');
	}
}

main().catch(function(err) {
	console.error(err.message);
	process.exitCode = 2;
}).finally(function() {
	fs.rmSync(tmp, { recursive: true, force: true });
});

var fs = require('fs');
var path = require('path');
var p = require('./pack-files');

p.generated.forEach(function(rel) {
	fs.rmSync(path.join(p.pkgDir, rel), { recursive: true, force: true });
});

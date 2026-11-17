var path = require('path');
var fs = require('fs');

function exportTree(version, outputDir, cb) {
    var glob = require('glob');
    var extract = require('extract-zip');
    var exec = require('child_process').exec;
    var targetPath = path.join(outputDir, version);

    exec('git archive --format=zip v' + version + ' > ' + targetPath + '.zip', function(err) {
        if (err) {
            return cb(err);
        }

		extract(targetPath + '.zip', {
			dir: targetPath
		}, function(err) {
            if (err) {
                return cb(err);
            }

            var files = glob.sync('**/*', {
                cwd: targetPath,
                nodir: true
            });

            fs.unlink(targetPath + '.zip');
            cb(null, files, targetPath);
        });
	});
}


function createPackage(info, packagePath, files, cb) {
    var Package = require('grunt-nuget-pack/lib/Package');

    var package = new Package({
        id: info.name,
        version: info.version,
        authors: info.author,
        owners: info.author,
        title: info.name,
        description: info.description,
        projectUrl: info.homepage,
        iconUrl: "http://plupload.com/img/favicon.png",
        licenseUrl: info.licenses[0].url,
        copyright: "© 2016 Ephox",
        requireLicenseAcceptance: true,
        tags: info.keywords ? info.keywords.join(' ') : ''
    });

    if (files && files.length) {
        files.forEach(function(file) {
            package.addFile(file, path.join('content/Scripts/' + info.name, file));
        });
    }

    try {
        package.saveAs(packagePath, function() {
            console.info("NuGet package successfully written to: " + packagePath);
            cb(null, packagePath);
        });
    } catch(ex) {
        cb("Error: Failed to create NuGet package.");
    }
}


function push(src, endPoint, apiKey, cb) {
    var request = require('request');

    request({
        method: 'POST',
        uri: endPoint || 'https://www.nuget.org/api/v2/package',
        headers: {
            "X-NuGet-ApiKey": apiKey
        },
        formData: {
            "package.nupkg": fs.createReadStream(src)
        }
    }, function (error, response, body) {
        console.info(arguments);

        if (response.statusCode >= 400) {
            cb(response.statusMessage);
        } else {
            cb();
        }
    });
}


function pack(info, cb) {
    var tools = require('./tools');
	var outputDir = './tmp/nuget';

	tools.startFresh(outputDir);

    exportTree(info.version, outputDir, function(err, files, tmpDir) {
        if (err) {
            return cb(err);
        }

        // name of the file doesn't matter, NuGet creates its own, apparently out of the package id and version
        createPackage(info, path.join(outputDir, "package.nupkg"), files, function() {
            jake.rmRf(tmpDir);
            cb.apply(null, arguments);
        });
    });
}


function publish(info, endPoint, apiKey, cb) {
    pack(info, function(err, nupkgPath) {
        if (err) {
            return cb(err);
        }
        push(nupkgPath, endPoint, apiKey, cb);
    });
}


module.exports = {
    exportTree: exportTree,
    pack: pack,
    publish: publish
};
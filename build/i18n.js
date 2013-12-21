var fs = require('fs')
, path = require('path')
, request = require('request')
, async = require('async')
, util = require('util')
;


var getPotHeader = function() {
	var dateFormat = require('dateformat');
	var now = dateFormat(new Date(), "yyyy-mm-dd HH:MM+0000", true);
	return [
		'# Generated pot',
		'msgid ""',
		'msgstr ""',
		'"Project-Id-Version: Plupload\\n"',
		'"Report-Msgid-Bugs-To: http://moxiecode.com\\n"',
		'"POT-Creation-Date: ' + now + '\\n"',
		'"PO-Revision-Date: ' + now + '\\n"',
		'"MIME-Version: 1.0\\n"',
		'"Content-Type: text/plain; charset=UTF-8\\n"',
		'"Content-Transfer-Encoding: 8bit\\n"',
		'"Last-Translator: Davit Barbakadze <davit@moxiecode.com>\\n"',
		'"Language-Team: Support <support@moxiecode.com>\\n"'
	];
};


var extract = function(from, to) {
	var methodPtrn = process.env.fn;
	var entries = {};
	var garbage = [];

	from = from || process.env.from;
	to = to || process.env.to || './tmp/en.po';

	function extract(input) {
		var content = fs.readFileSync(path.resolve(input)).toString();
		var fileName = path.basename(input);
		var regExp;
		var m;
		var text;
		var newLines = [];

		function getLine(index) {
			var i = newLines.length;
			while (i--) {
				if (index > newLines[i]) {
					return i + 2; // cause it starts from 0 (+1) and we need next to current (+2)
				}
			}
			return 0; // shouldn't happen
		}

		function trimQuotes(str) {
			return str.trim().replace(/^[\'\"]/, '').replace(/[\'\"]$/, '');
		}

		// find new lines
		regExp = /\n/g;
		while (m = regExp.exec(content)) {
			newLines.push(m.index);
		}

		regExp = new RegExp("(?:" + (methodPtrn || "plupload\.translate|_") + ")\\(\s*([\\\'\\\"])([\\\s\\\S]*?[^\\\\])\\1", 'g');

		while (m = regExp.exec(content)) {
			text = trimQuotes(m[2]);

			if (garbage.indexOf(text) !== -1) {
				continue;
			}

			if (entries[text]) {
				entries[text].comment += ' ' + fileName + ':' + getLine(m.index);
			} else {
				entries[text] = {
					text: trimQuotes(m[2]),
					comment: '#: ' + fileName + ':' + getLine(m.index)
				};
			}
		}

		newLines = null;
	}

	function writeToPOT() {
		var key, entry;
		var lines = getPotHeader();

		for (key in entries) {
			entry = entries[key];

			if (lines.length) {
				lines.push('');
			}

			lines.push(entry.comment);

			if (/%[a-z]/.test(entry.text)) {
				lines.push('#, c-format');
			}		

			lines.push(
				'msgid "' + entry.text + '"',
				'msgstr ""'
			);
		}

		jake.mkdirP(path.dirname(to));
		fs.writeFileSync(to, lines.join('\n'));

		console.info(to + " generated.");
	}

	findFiles(from).forEach(extract);

	if (to) {
		writeToPOT();
	}
	return entries;
};



var findFiles = function(filePath, baseDir) {
	var files = [];

	// If array of paths or path expressions
	if (filePath instanceof Array) {
		filePath.forEach(function(filePath) {
			Array.prototype.push.apply(files, findFiles(filePath, baseDir));
		});
		return files;
	}

	filePath = path.join(baseDir, filePath);

	if (filePath.indexOf('*') != -1) {
		// Use glob if whildcard pattern
		Array.prototype.push.apply(files, require("glob").sync(filePath));
	} else {
		// Single file
		files.push(filePath);
	}
	return files;
};



var toPot = function(from, to) {

	to = to || process.env.to || './tmp/i18n';
	if (fs.existsSync(to)) {
		jake.rmRf(to);
	} 
	jake.mkdirP(to);

	function generatePOT(input) {
		var srcItems, json, lines = [], fileName, name;

		input = path.resolve(input);
		fileName = path.basename(input, '.js');

		srcItems = fs.readFileSync(process.env.srcLang).toString().split(/msgstr \"[^\"]*/);

		// extract hash of strings only
		json = JSON.parse(fs.readFileSync(input).toString().replace(/^[\s\S]*plupload.addI18n\((\{[^\}]+\})\);[\s\S]*$/, '$1'));

		srcItems.forEach(function(srcItem, idx) {
			var m = srcItem.match(/msgid \"([\s\S]*?[^\\]|)\"/);
			if (m) { 
				srcItems[idx] += 'msgstr "';
				if (json[m[1]]) {
					srcItems[idx] += json[m[1]].replace(/([^\\])\"/g, '$1\\"');
				}
			} 
		});

		fs.writeFileSync(path.join(to, fileName+'.po'), srcItems.join(''));
		console.info(fileName + ".po generated.");
	}
	

	if (!process.env.srcLang) {
		console.info("Source language not specified!");
		process.exit(1);
	}

	findFiles(from).forEach(generatePOT);
};


var pull = function(srcUrl, to, cb) {
	console.info("Fetching fresh internationalization files...")

	srcUrl = srcUrl.replace(/\/*$/, '');
	var langsUrl = srcUrl + '/?details';

	to = to || process.env.to || './tmp/i18n';
	if (fs.existsSync(to)) {
		jake.rmRf(to);
	} 
	jake.mkdirP(to);

	function generateLangFile(lang, strs) {
		var langStr = lang.name + " (" + lang.code + ")";
		var data = {};

		strs.forEach(function(str) {
			data[str.source_string] = str.translation;
		});
		fs.writeFileSync(path.join(to, lang.code+".js"), "// " + langStr + "\n" + "plupload.addI18n(" + JSON.stringify(data) + ");");
		console.info(langStr + " fetched.");
	}

	request(langsUrl, function (error, response, body) {
		if (error || response.statusCode != 200) {
			console.log(srcUrl + " not reachable.");
			process.exit(1);
		}

		/*
		{
			"slug": "txc"
			"mimetype": "text/x-po",
			"source_language_code": "en",
			"wordcount": 6160,
			"total_entities": 1017,
			"last_update": "2011-12-05 19:59:55",
			"available_languages": [
			{
				"code_aliases": " ",
				"code": "sq",
				"name": "Albanian"
			},
			...
			],
		}
		*/
		var data = JSON.parse(body);

		var queue = [];
		var langUrl = srcUrl + '/translation/%s/strings/';


		data.available_languages.forEach(function(lang) {
			queue.push(function(cb) {
				request(util.format(langUrl, lang.code), function(error, response, body) {
					if (error || response.statusCode != 200) {
						console.log(lang.name + " not fetched.");
					} else {
						generateLangFile(lang, JSON.parse(body));
					}
					cb();
				});
			});
		});

		async.parallel(queue, function() {
			if (typeof(cb) == 'function') {
				cb();
			}
		});
	})

};


module.exports = {
	toPot: toPot,
	extract: extract,
	pull: pull
};








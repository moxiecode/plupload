var 
  program = require('commander')
, keypress = require('keypress')
, fs = require('fs')
, path = require('path')
, url = require('url')
, util = require('./util')
;


function parseConfigFile(configPath) {
	if (!configPath) {
		configPath = './config.js';
	}

	configPath = path.resolve(configPath);

	if (fs.existsSync(configPath)) {
		return require(configPath);
	}
	return {};
}


function parseBrowsers(browserStr) {
	var browsers = [];

	if (!/[:]/.test(browserStr)) { // probably is file path
		if (fs.existsSync(browserStr)) {
			try {
				return JSON.parse(fs.readFileSync(browserStr, 'utf8'));
			} catch(e) {}
		}
		return browserStr; // pass through for further investigation
	} else { // browser string has been passed, parse it
		var 
		  opt = browserStr.split('|')
		, versions
		, os
		, platform
		, data
		;

		opt.forEach(function(browser) {
			data = browser.split("/");
			platform = data[0].split(":");
			browser = platform[0];
			os = platform[1];
			versions = data[1].split(',');

			versions.forEach(function(ver) {
				/* {
					  name: 'Google Chrome'
					, id: 'chrome'
					, farmId: 'chrome'
					, version: '25'
					, osId: 'win'
					, osFarmId: 'Windows'
					, osName: 'Windows'
					, osVersion: '2012'
					, platform: 'Desktop'
				} */
				browsers.push({
					  id: browser
					, version: +ver
					, osId: os
				});
			});
		});
		return browsers;
	} 
}

function parseTesterUrl(uri) {
	if (typeof(uri) === 'string') {
		uri = url.parse(uri);
	}
	return util.extend({
		protocol: 'http:',
		hostname: 'localhost',
		port: 9000
	}, uri);
}

// program.password doesn't work in commander.js (see https://github.com/visionmedia/commander.js/issues/72)
function passwordPrompt(str, fn) {
	var buf = '';

	keypress(process.stdin);

	process.stdin.resume();
	process.stdin.setRawMode(true);
	process.stdout.write(str);

	// keypress
	process.stdin.on('keypress', function(c, key) {
		if (key && 'enter' == key.name) {
			console.log();
			process.stdin.removeAllListeners('keypress');
			process.stdin.setRawMode(false);
			if (!buf.trim().length) {
				return passwordPrompt(str, fn);
			}
			fn(buf);
			return;
		}

		if (key && key.ctrl && 'c' == key.name) {
			process.exit();
		}

		buf += c;
	})
	.resume();
}


function getConfig(cb) {
	var config;

	program
		.version('0.2.0')
		.option('-b, --browsers <ie:win/6.0 || file.json>', 'browsers to test in e.g "ie:win/6.0,7.0|iPhone 3GS:ios/3.0"', parseBrowsers, [])
		.option('-c, --config <config>', 'path to standalone config file to use', parseConfigFile, parseConfigFile())
		.option('-h, --hub <url>', 'tester server, if not specified will default to localhost:9000', parseTesterUrl, parseTesterUrl())
		.option('-f, --farm <service>', 'agent breeding service (currently saucelabs or browserstack)', 'saucelabs')
		.option('-u, --user <username>', 'username - at agent breeding farm')
		.option('-p, --pass [pass]', 'password - (or access key) at agent breeding farm')
		.option('-l, --list', 'display agents available from the agent farm')
		.option('-L, --listWorkers', 'display agents connected (workers) to the tester')
		.option('-k, --kill <id>', 'kill worker process')
		.option('-K, --killAll', 'kill all workers and tunnelier')
		.option('-S, --silent', 'stop the default verbose mode')
		.option('-w, --wait', 'do not shut down tunnels and workers on quit')
		;

	program
		.parse(process.argv);

	// output help screen by default
	if (process.argv.length <= 2) {
		process.stdout.write(program.helpInformation());
		program.emit('--help');
		process.exit();
	}

	program[program.farm] = {
		  user: program.user
		, pass: program.pass
	};

	config = util.extend({}, program.config, program); 

	// unset extra properties (aesthetics)
	util.each(config, function(value, key) {
		if (['Command', 'Option', '_version', '_events', 'rawArgs', 'name', 'options', 'commands', 'user', 'pass', 'config'].indexOf(key) !== -1) {
			delete config[key];
		}
	});

	// if --pass specified but empty, request password prompt
	if (program.pass === true) {
		passwordPrompt('Password: ', function(pass) {
			process.stdin.destroy();
			config[config.farm].pass = pass;
			cb(config);
		});
	} else {
		cb(config);
	}
}


module.exports = getConfig;

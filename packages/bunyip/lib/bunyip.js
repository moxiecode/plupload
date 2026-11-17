#!/usr/bin/env node
/*
 * bunyip
 * http://ryanseddon.github.com/Bunyip
 *
 * Copyright (c) 2012 Ryan Seddon
 * Licensed under the MIT license.
 */

 /*jshint laxcomma:true */

var url = require('url')
, color = require('./color').codes
, Yeti = require('./yeti')
, SauceLabs = require('./saucelabs')
, BrowserStack = require('./browserstack')
;


var good = "✔";
var bad = "✖";


function error() {
    console.error.apply(console, arguments);
}

function panic() {
    error.apply(panic, arguments);
    process.exit(1);
}

function puts() {
    console.log.apply(console, arguments);
}


/**
Entry point.

@method main
@param {Object} config
@param {Function} [exitCallback] Will be invoked instead of mere exit, if present
*/
function main(config, exitCallback) {
	var _timeStart
    , _batchDetails = { passed: 0, failed: 0 }
    
    // we have an agent breeding farm here
    , _farm = config.farm == 'browserstack' 
		? new BrowserStack(config.browserstack) 
		: new SauceLabs(config.saucelabs)
    
    // ... and tester
    , _tester = new Yeti(config.hub)
	;


	function exit(code) {
		if (!code) {
			code = 0;
		}

		if (typeof exitCallback != 'function') {
			exitCallback = process.exit;
		}

		_farm.shutDown(!config.wait)
			.then(function() {
				exitCallback(code);
			})
			.fail(function() {
				exitCallback(1);
			})
			;
	}


	function onDone(uid) {
		return _farm.closeAgent(uid)
			.then(function() {
			   return _farm.requestAgents(config.hub);
			})
			.then(function(agents) {
				if (!agents.length) {
					_tester.emit('allComplete');
				}
			})
			.fail(function(err) {
				error(err);
				exit(1);
			})
			;
	}

	// gracefully handle Ctrl+C
	process.on('SIGINT', function() {
		exit();
	});

	// clean up processes on exit
	process.on('SIGTERM', function () {
		exit();
	});



	// check command line options
	if (config.killAll) {
		config.wait = false;
		exit();
	} else {
		_farm.on('agentRequested', function(uid, agent) {
			puts("%s %s (%s) requested.", agent.name, agent.version, agent.osName);
		});


		_farm.on('agentClosed', function(uid, agent) {
			console.info(agent.toString() + ": closed.");
		});


		_farm.on('tunnelierKilled', function(name) {
			puts("Tunnelier (%s) killed.", name);
		});

		

		_tester.on('ready', function() {
			if (!config.silent) {
				puts("Tester running at %s.", url.format(config.hub));
			}

			_timeStart = new Date();
			_farm.go(config.browsers, config.hub)
				.fail(function(err) {
					error(err);
					exit(1);
				})
			;
		});


		_tester.on('agentConnect', function(uid, agent) {
			if (!config.silent) {
	            puts("Connected %s", agent);
	        }
		});

		_tester.on('agentDisconnect', function(uid, agent) {
			if (!config.silent) {
				puts("Disconnected %s", agent);
			}
		});


		_tester.on('agentResult', function(uid, agent, details) {
			/* details sample:
			{ Utils: 
				{ 
					name: 'Utils',
					passed: 58,
					failed: 1,
					total: 59,
					test1: { result: true, message: '', name: 'test1' },
					...
					test10: 
					{ 
						result: 'fail',
						message: 'Looping over an array\nExpected: 7 (Number)\nActual: 6 (Number)',
						name: 'test10' }
					},
					passed: 58,
					failed: 1,
					total: 59,
					duration: 94,
					name: '✖ Plupload Test Suite' 
				}
			*/

			var 
			  passed = details.passed
			, failed = details.failed
			, icon = failed ? bad : good
			, iconColor = failed ? color.red : color.green
			;

			function displayVerboseResult(result) {
			    var lastSuite, k, k1,
			        suite, test, msg, m;
			    for (k in result) {
			        suite = result[k];
			        if ("object" === typeof suite) {
			            if (suite.failed) {
			                for (k1 in suite) {
			                    test = suite[k1];
			                    if ("object" === typeof test) {
			                        if ("fail" === test.result) {
			                            if (!lastSuite || lastSuite !== suite.name) {
			                                error("   in", color.bold(suite.name));
			                                lastSuite = suite.name;
			                            }
			                            msg = test.message.split("\n");
			                            error("    ", color.bold(color.red(test.name)) + ":", msg[0]);
			                            for (m = 1; m < msg.length; m = m + 1) {
			                                error("       " + msg[m]);
			                            }
			                        }
			                    }
			                }
			            }
			        }
			    }
			    error("");
			}

	        _batchDetails.passed += passed;
	        _batchDetails.failed += failed;

	        error(iconColor(details.name), "on", agent);

	        if (failed) {
	            displayVerboseResult(details);
	        }
		});


		_tester.on('agentComplete', function(uid) {
			onDone(uid);
		});


		_tester.on('agentScriptError', function(uid, agent, details) {
			error(color.red(bad + " Script error") + ": " + details.message);
	        error("  URL: " + details.url);
	        error("  Line: " + details.line);
	        error("  User-Agent: " + agent);
	        
	        onDone(uid);
		});


		_tester.on('agentError', function(uid, agent, details) {
			error(color.red(bad + " Error") + ": " + details.message);
	        error("  User-Agent: " + agent);
	        
	        onDone(uid);
		});


		_tester.on('allComplete', function() {
			var duration = new Date() - _timeStart,
	            total = _batchDetails.passed + _batchDetails.failed,
	            durationString = "(" + duration + "ms)";

	        if (_batchDetails.failed) {
	            error(color.red("Failures") + ":", _batchDetails.failed, "of", total, "tests failed.", durationString);
	            exit(1);
	        } else {
	            error(color.green(total + " tests passed!"), durationString);
	            exit();
	        }
		});


		_tester.on('error', function(err) {
			puts(color.red("Tester Error: %s"), err);
			exit();
		});

		// let the testing start...
		_tester.start(config.args);
	}
}

exports.main = main;

/*global __dirname */

var 
  Q = require('q')
, wd = require('wd')
, fs = require('fs')
, url = require('url')
, path = require('path')
, EventEmitter = require('events').EventEmitter
, util = require('./util')
, download = require('./download')
, exec = require('child_process').exec
, Agent = require('./agent')
, AgentFarm = require('./farm')
, Collection = require('./collection')
;

/**
@constructor
@class SauceLabs
@extends AgentFarm
*/
function SauceLabs(options) {
	var
	/**
	Available agents in normalized form

	e.g.
		[{
			  name: 'Google Chrome'
			, id: 'chrome'
			, farmId: 'chrome'
			, version: '25'
			, os: 'win'
			, osName: 'Windows'
			, osVersion: '2012'
		}]

	@private
	@property _supportedAgents
	@type {Array}
	*/
	  _supportedAgents = {}

	, _workers = new Collection()

	, _tunnelierName = "Sauce-Connect.jar"

	, _tunnelierReadyFile = "sauce.pid"

	;


	AgentFarm.call(this, options);


	function _requestAgent(agent, toUrl) {
		var self = this
		, deferred = Q.defer()
		, timer
		, conn = wd.promiseRemote("ondemand.saucelabs.com", 80, options.user, options.pass)
		;

		self.agents[agent.uid].state = Agent.REQUESTED;
		
		self.emit('agentRequested', agent.uid, agent);

		// reject the requested if it gets timed out
		timer = setTimeout(function() {
			if (self.agents[agent.uid].state == Agent.REQUESTED) { // still pending
				self.agents[agent.uid].state = Agent.FAILED;
				_workers.remove(agent.uid);
				self.emit('agentTimeout', agent.uid, agent);
				deferred.reject(util.format("Agent '%s' timed out.", agent.toString()));
			}
		}, agent.timeout);

		conn.init({
			  browserName: agent.farm.id
			, version: agent.farm.version
			, platform: agent.farm.osId
		})
		.then(function(sessionId) {
			_workers.update(agent.uid, {
				  sessionId: sessionId
				, agent: agent
				, conn: conn
			});
			conn.get(url.format(toUrl))
				.then(function() {
					if (self.agents[agent.uid].state == Agent.REQUESTED) {
						self.agents[agent.uid].state = Agent.RUNNING;
						clearTimeout(timer);
						deferred.resolve(agent);
					} else {
						self.closeAgent(agent.uid);
					}
				});
		})
		.fail(function() {
			self.agents[agent.uid].state = Agent.FAILED;
			_workers.remove(agent.uid);
			deferred.reject(util.format("Agent '%s' not available.", agent.toString()));
		});

		return deferred.promise;
	}


	util.extend(this, {

		tunnelierDownloadUrl: "http://plupload.com/tests/Sauce-Connect-latest.zip" //"http://saucelabs.com/downloads/Sauce-Connect-latest.zip"


		, tunnelierName: "Sauce-Connect.jar"


		, killTunnelier: function() {
			var readyFile = path.join(this.tunnelierPath, _tunnelierReadyFile);
			if (fs.existsSync(readyFile)) {
				fs.unlinkSync(readyFile);
			}			
			return SauceLabs.prototype.killTunnelier.call(this);
		}

		, launchTunnelier: function() {
			var self = this
			, tunnelierPath = path.join(this.tunnelierPath, this.tunnelierName)
			;

			function _getTunnelier(tunnelierPath) {
				if (fs.existsSync(tunnelierPath)) {
					return Q(true);
				}

				console.log("Tunnelier (%s) not found. Retrieving...", self.tunnelierName);

				return download(self.tunnelierDownloadUrl, {
						to: path.dirname(tunnelierPath)
					})
					.then(function(file) {
						console.log("Unpacking: %s. Wait...", file.name);

						var buffer = fs.readFileSync(path.join(file.path, file.name))
						, reader = require('zip').Reader(buffer)
						;

						reader.toObject();
						reader.forEach(function (entry) {
							if (entry.getName() === _tunnelierName) {
								fs.writeFileSync(path.join(file.path, _tunnelierName), entry.getData());
							}
						});
						reader.iterator();

						fs.unlinkSync(path.join(file.path, file.name));
						console.log("Done.");
						return true;
					});
			}

			return self.isTunnelierActive()
				.then(function() {
					return Q.resolve(true);
				})
				.fail(function() {
					// make sure it is not already running
					return _getTunnelier(tunnelierPath)
						.then(function() {
							var deferred = Q.defer()
							, start = new Date()
							;

							function isReady() {
								if (fs.existsSync(path.join(self.tunnelierPath, _tunnelierReadyFile))) {
									deferred.resolve(true);
								} else if (new Date() - start < 120 * 1000) { // 60 secs to launch
									setTimeout(isReady, 500);
								} else {
									deferred.reject("Timeout: Tunnelier failed to launch within 120 secs.");
								}
							}

							// not running - launch
							console.log("Launching tunnelier...");

							exec(util.format("java -jar %s %s %s -f %s &" // -l %s
								, tunnelierPath
								, options.user
								, options.pass
								, path.join(self.tunnelierPath, _tunnelierReadyFile)
								//, path.join(self.tunnelierPath, 'sauce.log')
							));

							isReady();
							return deferred.promise;
						})
						;
				});
		}


		, apiUrl: function(action) {
			return ["https://", options.user, ":", options.pass, "@saucelabs.com/rest/v1", action].join('');
		}

		/**
		Bring agent to standard format
		*/
		, normalizeAgent: function(agent) {
			var os = agent.os.split(/\s(?=\d)/);

			function _normalizeFarmId(farmId) {
				var map = {
					  'internet explorer': 'ie'
				};
				return map[farmId] ? map[farmId] : farmId;
			}


			function _normalizeFarmOs(os) {
				var map = {
					  'Windows': 'win'
					, 'Linux': 'linux'
					, 'Mac': 'mac'
				};
				return map[os] ? map[os] : os;
			}

			return new Agent({
				  name: agent.long_name
				, id: _normalizeFarmId(agent.api_name)
				, version: +agent.long_version.replace(/^(\d+).*$/, '$1')
				, osName: os[0]
				, osId: _normalizeFarmOs(os[0])
				, osVersion: os[1] || ''
				, farm: {
					  id: agent.api_name
					, version: agent.short_version
					, osId: agent.os
				}
			})
			;
		}

		
		, getSupportedAgents: function() {
			var self = this;

			if (!util.isEmptyObj(_supportedAgents)) {
				Q(_supportedAgents);
			} 

			return this.api("/info/browsers/webdriver")
				.then(function(sauceAgents) 
				{
					sauceAgents.forEach(function(agent) {
						agent = self.normalizeAgent(agent);
						_supportedAgents[agent.uid] = agent;
					});
					return _supportedAgents;
				})
				;
		}


		, requestAgents: function(toUrl) {
			var self = this
			, maxSlots = options.slots || 1
			, queue = []
			, agentPicked = false
			;
			
			if (_workers.length < maxSlots) {
				while (maxSlots - _workers.length) {
					agentPicked = self.getPendingAgent();
					if (agentPicked) {
						_workers.add(agentPicked.uid, {
							agent: agentPicked
						});
						queue.push(_requestAgent.call(self, agentPicked, toUrl));
					} else {
						break; // no more agents to pick
					}
				}
			}
			return Q.all(queue);	
		}


		, closeAgent: function(uid, state) {
			var self = this;

			if (typeof(uid) != 'string') {
				uid = uid.uid;
			}

			var worker = _workers.get(uid);

			if (!worker) {
				return Q(false);
			}

			if (state == Agent.FAILED) {
				self.emit('agentRequestFailed', uid, worker.agent);
			}

			return worker.conn.quit()
				.then(function() {
					self.agents[worker.agent.uid].state = state ? state : Agent.DONE;
					_workers.remove(uid);
					self.emit('agentClosed', uid, worker.agent);
				})
				;
		}


		, shutDown: function(full) {
			var self = this
			, queue = []
			;

			if (full) {
				queue.push(self.killTunnelier());
			}

			_workers.each(function(worker, uid) {
				queue.push(self.closeAgent(uid));
			});
			return Q.all(queue);
		}

	});
}

SauceLabs.prototype = AgentFarm.prototype;
SauceLabs.prototype.constructor = SauceLabs;

module.exports = SauceLabs;

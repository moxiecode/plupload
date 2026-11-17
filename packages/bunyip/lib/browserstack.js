var 
  Q = require('q')
, fs = require('fs')
, path = require('path')
, url = require('url')
, request = require('request')
, qs = require('querystring')
, exec = require('child_process').exec
, util = require('./util')
, isLocal = require('./ip')
, download = require('./download')
;


function BrowserStack(options) {
	var
	/**
	Available agents in normalized form

	e.g.
		[{
			  name: 'Google Chrome'
			, id: 'chrome'
			, farmId: 'chrome'
			, version: '25'
			, osId: 'win'
			, osFarmId: 'Windows'
			, osName: 'Windows'
			, osVersion: '2012'
			, platform: 'Desktop'
		}]

	@private
	@property _supportedAgents
	@type {Array}
	*/
	  _supportedAgents = []

	, _workers = {}

	, _tunnel
	;


	function api(action, method, data) {
		var 
		  deferred = Q.defer()
		, params
		;

		if (typeof(method) !== 'string') {
			if (typeof(method) === 'object') {
				data = method;
			}
			method = 'get'; 
		}

		params = {
			  method: method
			, uri: ["http://", options.user, ":", options.pass, "@api.browserstack.com/3", action].join('')
			, json: true
		};

		if (params.method.toLowerCase() !== 'post') {
			params.qs = data;
		} else {
			params.body = qs.stringify(data);
		}

		request(params, function (error, response, body) {
			if (error) {
				deferred.reject(error);
			} else if (body.errors) {
				deferred.reject(body.message);
			} else {
				deferred.resolve(body);
			}
		});
		return deferred.promise;
	}


	function _normalizeName(id) {
		var map = {
			  'ie': 'Internet Explorer'
			, 'chrome': 'Google Chrome'
			, 'firefox': 'Mozilla Firefox' 
			, 'opera': 'Opera'
			, 'safari': 'Safari'
			, 'Mobile Safari': 'Safari'
		};
		return map[id] ? map[id] : id;
	}


	function _normalizeOs(os) {
		var map = {
			  'win': 'Windows'
			, 'linux': 'Linux' // currently not supported by BrowserStack
			, 'OS X': 'Mac OS X'
			, 'ios': 'iOS'
			, 'android': 'Android'
		};
		return map[os] ? map[os] : os;
	}


	function _normalizeFarmOs(os) {
		var map = {
			  'Windows': 'win'
			, 'Linux': 'linux'
			, 'OS X': 'mac'
		};
		return map[os] ? map[os] : os;
	}


	function _isExposed() {
		var getProcs = Q.denodeify(exec);

		return getProcs("ps -ef | grep BrowserStack")
			.then(function(procs) {
				for (var i in procs) {
					if (/BrowserStackTunnel\.jar[\s\S]+?localhost,9000,0/.test(procs[i])) {
						return true;
					}
				}
				return false;
			});
	}


	function _getTunnelier(tunnelierPath) {
		if (fs.existsSync(tunnelierPath)) {
			return Q(true);
		}

		console.log("Tunnelier (BrowserStackTunnel.jar) not found. Retrieving...");

		return download("http://www.browserstack.com/BrowserStackTunnel.jar", {
				to: path.dirname(tunnelierPath)
			});
	}


	function _exposeToAgents(urlParts) {
		var tunnelierPath = path.resolve('tools/BrowserStackTunnel.jar');	

		return _getTunnelier(tunnelierPath)
			.then(function() {
				var 
				  defaultPort = {
					  'http:': 80
					, 'https:': 443
				  }
				, protocol = urlParts.protocol || 'http:'
				;

				console.log("Launching tunnelier...");

				_tunnel = exec(util.format("java -jar %s %s %s,%d,%d &"
					, tunnelierPath
					, options.key
					, urlParts.hostname
					, urlParts.port || defaultPort[protocol]
					, protocol === 'https:' ? 1 : 0
				));
				
				return Q.delay(10000); // give it some time to start
			})
			.then(function() {
				return urlParts;
			});
	}


	function _connect(urlParts, agentId) {	
		return this.resolve(agentId)
			.then(function(agent) {
				console.log("%s %s requested.", agent.name, agent.version);

				return api('/worker', 'post', {
					  url: url.format(urlParts)
					, timeout: options.timeout || 300
					, browser: agent.farm.id
					, browser_version: agent.farm.version
					, os: agent.farm.osId
					, os_version: agent.farm.osVersion
				})
				.then(function(session) {
					_workers[session.id] = agent;
					return session;
				});
			});
	}



	util.extend(this, {

		getAvailable: function() {
			if (_supportedAgents.length) {
				return Q(_supportedAgents);
			} 

			return api('/browsers', { flat: true })
				.then(function(bsAgents) {

					/* this part of the response is very strange, need to handle it in some way as well
					...
					{ os_version: '1024x600', device: 'Samsung Galaxy Tab', os: 'opera', browser: 'Opera Browser' },
					{ os_version: '1280x800', device: 'Samsung Galaxy Tab 10.1', os: 'opera', browser: 'Opera Browser' },
					{ os_version: '240x320', device: 'HTC Wildfire', os: 'opera', browser: 'Opera Browser' },
					{ os_version: '320x480', device: 'LG Optimus One', os: 'opera', browser: 'Opera Browser' },
					{ os_version: '360x640', device: 'Nokia 5800 XpressMusic', os: 'opera', browser: 'Opera Browser' },
					{ os_version: '480x800', device: 'Samsung Galaxy S II', os: 'opera', browser: 'Opera Browser' },
					...
					*/

					bsAgents.forEach(function(agent) {
						_supportedAgents.push({
							  name: _normalizeName(agent.browser || agent.device)
							, id: agent.browser || agent.os
							, version: +agent.browser_version
							, osName: _normalizeOs(agent.os)
							, osId: _normalizeFarmOs(agent.os)
							, osVersion: agent.os_version
							, platform: agent.device || 'Desktop'
							// remote representation of the agent
							, farm: {
								  id: agent.browser
								, version: agent.browser_version
								, osId: agent.os
								, osVersion: agent.os_version
							}
						});
					});
					return _supportedAgents;
				});
		}


		, getWorkers: function() {
			return api('/workers');
		}


		, connect: function(urlParts, agents) {
			var self = this;

			if (typeof(urlParts) === 'string') {
				urlParts = url.parse(urlParts);
			}

			if (!util.isArray(agents)) {
				agents = [agents];
			}

			return Q.all([ isLocal(urlParts.hostname), _isExposed() ])
				.spread(function(isLocal, isExposed) {
					return isLocal && !isExposed ? _exposeToAgents.call(self, urlParts) : urlParts;
				})
				.then(function(urlParts) {
					var 
					  queue = []
					, i = agents.length
					;
					while (i--) {
						queue.push(_connect.call(self, urlParts, agents[i]));
					}
					return Q.all(queue);
				});	
		}


		, kill: function(id) {
			return api('/worker/' + id, 'delete')
				.then(function() {
					delete _workers[id];
				});
		}


		, killAll: function() {
			var 
			  self = this
			, queue = []
			;
			util.each(_workers, function(agent, id) {
				queue.push(self.kill.call(self, id));
			});
			return Q.all(queue);
		}


		, echoStatus: function() {
			api('/status')
				.then(function(status) {
					console.info(status);
				});
		}


		, exit: function() {
			return this.killAll()
				.then(function() {
					if (_tunnel) {
						_tunnel.kill();
					}
					_supportedAgents = _tunnel = null;
				});
		}


	});
}


module.exports = BrowserStack;

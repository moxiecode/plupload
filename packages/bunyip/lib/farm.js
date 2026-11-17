/*global __dirname */

var
  Q = require('q')
, url = require('url')
, path = require('path')
, request = require('request')
, exec = require('child_process').exec
, EventEmitter = require('events').EventEmitter
, util = require('./util')
, isLocal = require('./ip')
, Agent = require('./agent')
;

/**
Supplies the Tester with requested Agents. If tester is running on a local server,
will try to establish the tunnel.

@constructor 
@class AgentFarm
@param {String} farm Identifier of the agent breeding farm (saucelabs or browserstack)
*/
function AgentFarm(options) {
	this.agents = {};

	this.options = options;

	/**
	Url of tunnelier binary

	@property tunnelierName
	@type {String}
	@default ''
	*/
	this.tunnelierDownloadUrl = '';

	/**
	Name of the tunnelier file and process

	@property tunnelierName
	@type {String}
	@default ''
	*/
	this.tunnelierName = '';

	this.tunnelierPath = path.resolve(__dirname + '/../tools');
}


AgentFarm.prototype = new EventEmitter();	
AgentFarm.prototype.constructor = AgentFarm;


util.extend(AgentFarm.prototype, {

	isTunnelierActive: function() {
		var deferred = Q.defer();
		exec(util.format("ps -ef | grep %s | grep -v grep", this.tunnelierName), function(err, output) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(output);
			}
		});
		return deferred.promise;
	}

	, killTunnelier: function() {
		var self = this
		, deferred = Q.defer()
		;
		
		this.isTunnelierActive()
			.then(function(output) {
				var cols = output.trim().split(/\s+/)
				, pid = cols[1]
				;
				exec(util.format("kill -9 %s", pid), function() {
					self.emit('tunnelierKilled', self.tunnelierName, pid);
					deferred.resolve(pid);
				});
			})
			.fail(function(err) {
				deferred.reject(err);
			})
			;
			
		return deferred.promise;
	}

	/**
	Generate the functional Url for the specified action

	@method apiUrl
	@param {String} action
	@return {String} Functional Url for the action
	....
	*/

	
	/**
	Make an API call

	@method api
	@param {String} action
	@param {String|Object} [method="get"] (if Object is passed will be considered as @param data)
	@param {Object} data
	@return {Promise}
	*/
	, api: function(action, method, data) {
		var deferred = Q.defer()
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
			, uri: this.apiUrl(action)
			, body: JSON.stringify(data)
			, json: true
		};

		request(params, function (error, response, body) {
			if (error) {
				deferred.reject(error);
			} else {
				deferred.resolve(body);
			}
		});

		return deferred.promise;
	}


	/**
	Bring agent to standard format

	@method normalizeAgent
	@param {Object} agent Agent identifier object in farm specific format
	@return {Agent} Normalized agent object 
	....
	*/


	/**
	Retrieve all agents supported by the current farm

	@method getSupportedAgents
	@return {Promise} Either rejected or resolved with the list of agents
	....
	*/


	/**
	Request the specified agent to the specified url.

	@method connect
	@param {String} url Url to navigate agent to
	@param {String|Object|Array} agent Agent identifier or an array of such
	@return {Promise}
	....
	*/


	/**
	Resolves agent id or partial object to full agent identifying object.

	e.g. for 'chrome' will return an object like this:
		{
			  name: 'Google Chrome'
			, id: 'chrome'
			, farmId: 'chrome'
			, version: '25'
			, osId: 'win'
			, osName: 'Windows'
			, osVersion: '2012'
		}
	
	@method resolveAgents
	@params {String|Object} agent Either normalized id or a set of agent identifiers
	@return {Promise} Promise fulfilled with agent identifying object or null
	*/
	, resolveAgents: function (requestedAgents) {
		var self = this, agents = {};

		return this.getSupportedAgents()
			.then(function(supportedAgents) {

				util.each(requestedAgents, function(requestedAgent) {
					var uid = Agent.getUID(requestedAgent);
					if (supportedAgents[uid]) {
						agents[uid] = supportedAgents[uid];
						agents[uid].timeout = requestedAgent.timeout || self.options.timeout;
					} else {
						this.emit('agentNotSupported', uid, requestedAgent);
					}
				});

				if (!util.isEmptyObj(agents)) {
					return agents;
				}					
				return Q.reject("None of the requested agents is available from the agent farm.");
			});
	}


	, getPendingAgent: function() {
		var agentPicked = null;

		util.each(this.agents, function(agent) {
			if (agent.state == Agent.INIT) {
				agentPicked = agent;
				return false;
			}
		});

		return agentPicked ? agentPicked : false;
	}


	/**
	Prints out list of agents available from current agent farm.

	@method list 
	*/
	, list: function() {
		this.getAvailable().done(function() {
			
		});
	}


	/**
	Request agents from the farm to connect to the specified url.

	@method requestAgents
	@param {String|Object} toUrl Either url or pre-parsed object containing url parts
	@return {Promise}
	*/
	, requestAgents: function() {
		return Q.reject("Agents not available");
	}


	/**
	Launches the process of requesting the agents
	
	@method go
	@param {Array} requestedAgents Array of browser identifying objects
	@param {String} toUrl Url to connect those agents to
	@return {Promise} Returns rejected promise in case of failure
	*/
	, go: function(requestedAgents, toUrl) {
		var self = this;

		return this.resolveAgents(requestedAgents)
			.then(function(agents) {
				self.agents = agents;

				if (typeof(toUrl) === 'string') {
					toUrl = url.parse(toUrl);
				}

				return isLocal(toUrl.hostname)
					.then(function(result) {
						if (result) { 
							return self.launchTunnelier()
								.then(function() { 
									return toUrl; 
								});
						} else {
							return toUrl; 
						}
					})
					.then(function(toUrl) {
						return self.requestAgents(toUrl);
					});
			});
	}
});


module.exports = AgentFarm;
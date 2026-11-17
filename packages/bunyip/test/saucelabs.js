var rewire = require('rewire') 
, chai = require('chai')
, expect = chai.expect
, chaiAsPromised = require('chai-as-promised')
, sinon = require('sinon')
, sinonChai = require('sinon-chai')
, Q = require('q')
, config = require('../config.js')
, Agent = require('../lib/agent')
, SauceLabs = require('../lib/saucelabs')
;

chai.use(chaiAsPromised);
chai.use(sinonChai);
	


describe("Testing SauceLabs", function() {
	var validAgents = [ // more browser identifying object can be added here
		  { id: 'firefox', version: 16, osId: 'mac' }
		, { id: 'chrome', version: 26, osId: 'win' }
	]
	, invalidAgents = [
		{ id: 'invalid_agent', version: 26, osId: 'win' }
	]
	;


	it("apiUrl()", function() {
		var agentFarm = new SauceLabs({ // mock the options
			user: 'user',
			pass: 'pass'
		});

		expect(agentFarm.apiUrl("/action"))
			.to.equal("https://user:pass@saucelabs.com/rest/v1/action");
	});

	// it("api()", function() {});

	describe("resolveAgents()", function() {
		var agentFarm = new SauceLabs(config.saucelabs);
		
		it("valid agent objects identifying resolve", function(done) {
			this.timeout(5000);

			agentFarm.resolveAgents(validAgents)
				.then(function(agents) {
					expect(agents).to.be.instanceof(Object);

					validAgents.forEach(function(agent) {
						var uid = Agent.getUID(agent);
						expect(agents).to.have.property(uid);
						expect(agents[uid]).to.be.an.instanceof(Object); // timed out on wrong assertion :/
					});

					done();
				})
				.fail(function(err) {
					expect(err).not.to.be.ok;
					done();
				})
			;					
		});


		it("invalid agent objects identifying get rejected", function(done) {
			this.timeout(5000);

			agentFarm.resolveAgents(invalidAgents)
				.then(function() {
					// this should not run
					expect(false).to.be.ok;
					done();
				})
				.fail(function(err) {
					expect(err).to.be.ok;
					done();
				})
			;
		});
	});


	describe("requestAgents()", function() {
		var SauceLabs = rewire('../lib/saucelabs')
		, Collection = require('../lib/Collection')
		, maxSlots = 1
		, workers
		;

		beforeEach(function() {
			workers = new Collection()

			// expose internal workers collection
			SauceLabs.__set__('Collection', function() {
				Collection.call(this);

				var add = this.add 
				, remove = this.remove
				;

				this.add = function() {
					workers.add.apply(workers, arguments);
					add.apply(this, arguments);
				};

				this.remove = function() {
					workers.remove.apply(workers, arguments);
					remove.apply(this, arguments);
				};
			});
		});

		// 1. test if worker is created (will call init, get)

		it("successful request", function(done) {
			var agent = new Agent({ id: 'firefox', version: 16, osId: 'mac' })
			;

			// mock webdriver module
			SauceLabs.__set__('wd', {
				promiseRemote: function() {
					return {
						init: function() {
							return Q.resolve(+new Date());
						},
						get: function() {
							return Q.resolve(true);
						},
						quit: function() {
							return Q.resolve(true);
						}
					};
				}
			});

			var agentFarm = new SauceLabs({
				user: 'user',
				pass: 'pass',
				slots: maxSlots
			});

			agentFarm.agents[agent.uid] = agent;
			agentFarm.requestAgents("http://localhost:9000")
				.then(function() {
					expect(workers.length).to.equal(1);
					expect(workers.get(agent.uid).agent).to.equal(agent);
					expect(agentFarm.agents[agent.uid].state).to.equal(Agent.RUNNING);
					done();
				})
				.fail(function(err) {
					expect(false).to.be.ok;
					done();
				});
			
		});

		it("failed request", function(done) {
			var agent = new Agent({ id: 'firefox', version: 16, osId: 'mac' })
			;

			// mock webdriver module
			SauceLabs.__set__('wd', {
				promiseRemote: function() {
					return {
						init: function() {
							return Q.reject("error");
						},
						get: function() {
							return Q.resolve(true);
						},
						quit: function() {
							return Q.resolve(true);
						}
					};
				}
			});

			var agentFarm = new SauceLabs({
				user: 'user',
				pass: 'pass',
				slots: maxSlots
			});

			agentFarm.agents[agent.uid] = agent;
			agentFarm.requestAgents("http://localhost:9000")
				.then(function() {
					expect(false).to.be.ok;
					done();
				})
				.fail(function(err) {
					expect(err).to.be.ok;
					expect(workers.length).to.equal(0);
					expect(agentFarm.agents[agent.uid].state).to.equal(Agent.FAILED);
					done();
				});
		});


		it("timed out request", function(done) {
			var agent = new Agent({ id: 'firefox', version: 16, osId: 'mac' })
			, timeout = 1000
			;
			
			this.timeout(timeout + 10000);

			// mock webdriver module
			SauceLabs.__set__('wd', {
				promiseRemote: function() {
					return {
						init: function() {
							var deferred = Q.defer();
							setTimeout(function() {
								deferred.resolve(true);
							}, timeout + 5000);
							return deferred.promise;
						},
						get: function() {
							return Q.resolve(true);
						},
						quit: function() {
							return Q.resolve(true);
						}
					};
				}
			});

			var agentFarm = new SauceLabs({
				user: 'user',
				pass: 'pass',
				slots: maxSlots
			});

			agent.timeout = timeout;
			agentFarm.agents[agent.uid] = agent;
			agentFarm.requestAgents("http://localhost:9000")
				.then(function() {
					expect(false).to.be.ok;
					done();
				})
				.fail(function(err) {
					expect(err).to.be.ok;
					expect(workers.length).to.equal(0);
					expect(agentFarm.agents[agent.uid].state).to.equal(Agent.FAILED);
					done();
				});
		});


		/*it("test Q.all()", function(done) {
			Q.all([
				  Q.resolve(1)
				, Q.resolve(2)
				, Q.resolve(3)
			]).done(function(results) {
				expect(results).to.be.instanceof(Array);
				expect(results).to.deep.include.members([1, 2, 3]);
				done();
			});
		});*/


		it("successfully enqueued agents must be returned in array, after promise is resolved", function(done) {
			var agents = {
				  'firefox:16:mac' : new Agent({ id: 'firefox', version: 16, osId: 'mac' })
				, 'chrome:24:win' : new Agent({ id: 'chrome', version: 24, osId: 'win' })
			};

			// mock webdriver module
			SauceLabs.__set__('wd', {
				promiseRemote: function() {
					return {
						init: function() {
							return Q.resolve(+new Date());
						},
						get: function() {
							return Q.resolve(true);
						},
						quit: function() {
							return Q.resolve(true);
						}
					};
				}
			});

			var agentFarm = new SauceLabs({
				user: 'user',
				pass: 'pass',
				slots: 2
			});

			agentFarm.agents = agents;
			agentFarm.requestAgents("http://localhost:9000")
				.done(function(results) {
					expect(workers.length).to.equal(2);
					expect(results).to.be.instanceof(Array);
					expect(results).to.deep.include.members(Object.keys(agents).map(function(key) { return agents[key]; }));
					done();
				});
		});
	});


	it("event emitting", function(done) {
		this.timeout(2000);

		var agentFarm = new SauceLabs({ // mock the options
			user: 'user',
			pass: 'pass'
		});

		agentFarm.on('arbitraryEvent', function() {
			expect(true).to.be.ok;
			done();
		});

		agentFarm.emit('arbitraryEvent');
	});
});











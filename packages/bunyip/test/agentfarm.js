var rewire = require('rewire') 
, chai = require('chai')
, expect = chai.expect
, chaiAsPromised = require('chai-as-promised')
, sinon = require('sinon')
, sinonChai = require('sinon-chai')
, Q = require('q')
, config = require('../config.js')
, Agent = require('../lib/agent')
, AgentFarm = require('../lib/farm')
;

chai.use(chaiAsPromised);
chai.use(sinonChai);


describe("Testing AgentFarm", function() {
	var validAgents = [ // more browser identifying object can be added here
		  { id: 'firefox', version: 16, osId: 'mac' }
		, { id: 'chrome', version: 26, osId: 'win' }
	]
	, invalidAgents = [
		{ id: 'invalid_agent', version: 26, osId: 'win' }
	]
	;


	it("getPendingAgent()", function() {
		var agentFarm = new AgentFarm(config.saucelabs) // particular farm is not relevant - can be anything
		, pendingAgent
		, agents = [ 
			  { id: 'agent1', version: 16, osId: 'mac' }
			, { id: 'agent2', version: 16, osId: 'mac' }
		]
		;

		agents.forEach(function(obj) {
			var agent = new Agent(obj);
			agentFarm.agents[agent.uid] = agent;
		});

		// go...
		pendingAgent = agentFarm.getPendingAgent();
		expect(pendingAgent.uid).to.equal(Agent.getUID(agents[0]));

		// first agent is done now
		agentFarm.agents[pendingAgent.uid].state = Agent.DONE;
		pendingAgent = agentFarm.getPendingAgent();
		expect(pendingAgent.uid).to.equal(Agent.getUID(agents[1]));

		// all agents are done now
		agentFarm.agents[pendingAgent.uid].state = Agent.DONE;
		expect(agentFarm.getPendingAgent()).to.be.false;
	});

});


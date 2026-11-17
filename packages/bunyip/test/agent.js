var chai = require('chai')
, expect = chai.expect
, Q = require("q")
, config = require("../config.js")
, Agent = require("../lib/agent")
;


describe("Testing Agent", function() {
	var agentObjs = [ // more browser identifying object can be added here
		  { id: 'firefox', version: 16, osId: 'mac' }
		, { id: 'chrome', version: 26, osId: 'win' }
	];

	it("Agent.getUID()", function() {
		var a = agentObjs[0]
		, aUID = [a.id, a.version, a.osId].join(':')
		, A = new Agent(a)
		;
		expect(Agent.getUID(a)).to.equal(aUID);
		expect(A.getUID(a)).to.equal(aUID);
	});

	
});

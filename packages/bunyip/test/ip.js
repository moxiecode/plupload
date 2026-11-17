var chai = require('chai')
, expect = chai.expect
, chaiAsPromised = require('chai-as-promised')
, Q = require("q")
, isLocal = require("../lib/ip")
;

chai.use(chaiAsPromised);


describe("isLocal() - checks if ip or url is local", function() {

	it("localhost", function() {
		return expect(isLocal("localhost")).to.eventually.be.true;
	});

	it("http://google.com", function() {
		return expect(isLocal("http://google.com")).to.eventually.be.false;
	});

	it("192.168.0.1", function() {
		return expect(isLocal("192.168.0.1")).to.eventually.be.true;
	});

	it("192.169.0.1", function() {
		return expect(isLocal("192.169.0.1")).to.eventually.be.false;
	});

	it("http://172.16.0.1:8080", function() {
		return expect(isLocal("http://172.16.0.1:8080")).to.eventually.be.true;
	});

	it("http://moxie.mxi:8080", function() {
		return expect(isLocal("http://moxie.mxi:8080")).to.eventually.be.true;
	});

});
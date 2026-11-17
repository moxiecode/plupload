module.exports = {
	tester: 'testswarm', // e.g. yeti or testswarm

	yeti: {
		url: "http://localhost:9000",
		loglevel: 'silent'
	},

	testswarm: {
		url: "http://swarm.mxi",
		testsurl: 'http://moxie.mxi/moxie/',
		username: 'jayarjo',
		authToken: 'ac10637a0c72551d84f94ef2b098d65883796885',
		pollInterval: 1000,
		timeout: 1000 * 60 * 15 // 15 minutes
	},

	browserstack: {
		username: "jayarjo",
		password: "flytoinfinity",
		version: 2,
		timeout: 1800 // keep them busy as long as possible
	},
	
	tunnel: {
		url: "mxi.pagekite.me",
		secret: "kczz8d8d7f6f9akacbkbc4cba46d9e7e",
		cmd: "pagekite.py --clean --defaults --backend=http/<port>:<url>:<localhost>:<localport>:<secret>"
	}
};
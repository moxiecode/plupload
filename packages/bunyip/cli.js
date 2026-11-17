#!/usr/bin/env node
var getConfig = require('./lib/options');

getConfig(function(config) {
	require('./lib/bunyip').main(config);
});

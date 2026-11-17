function Reporter(options) {
	"use strict";

	var level, levels;

	function createLoggerFunc(levelName) {
		return function(message) {
			if (levels[levelName] >= level) {
				if (options[levelName]) {
					options[levelName](message);
				} else {
					console.log(message);
				}
			}
		};
	}

	levels = {
		debug: 1,
		info: 2,
		warning: 3,
		error: 4,
		fatal: 5
	};

	options = options || {};
	level = levels[(options.level || "info").toLowerCase()];

	for (var levelName in levels) {
		this[levelName] = createLoggerFunc(levelName);
	}
}

exports.create = function(options) {
	"use strict";

	return new Reporter(options);
};

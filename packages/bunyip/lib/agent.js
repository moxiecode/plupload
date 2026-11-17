var util = require('./util');


function Agent(data) {
	var _state = Agent.INIT
	, _startTime = 0
	, _duration = 0
	;

	if (typeof(data) === 'string') { // probably uid
		var parts = data.split(':');
		data = {
			  id: parts[0]
			, version: parts[1]
			, osId: parts[2]
		};
	}

	util.extend(this, {
		  name: null
		, id: 'chrome'
		, version: 26
		, osId: 'win'
		, osVersion: null
		, osName: null
	}, data);

	// if no farm related details were passed, initialize with defaults
	if (!this.farm) {
		this.farm = {
			  id: this.id
			, version: this.version
			, osId: this.osId
		};
	}

	if (this.timeout) {
		this.timeout = 20000;
	}


	Object.defineProperty(this, 'state', {
	    get: function() {
	        return _state;
	    },

		set: function(state) {
			_state = state;

			switch (state) {
			case Agent.REQUESTED:
				_duration = 0;
				break;

			case Agent.RUNNING:
				_startTime = +new Date();
				break;

			case Agent.DONE:
			case Agent.FAILED:
				_duration = +new Date() - _startTime;
				break;
			}
		}
	});


	util.extend(this, {

		  getUID: function() {
			return Agent.getUID(this);
		}

		, getRunDuration: function() {
			return _duration;
		}

		, toObject: function() {
			return {
				 name: this.name
				, id: this.id
				, version: this.version
				, osId: this.osId
				, osVersion: this.osVersion
				, osName: this.osName
				, farm: this.farm
			};
		}

		, toString: function() {
			return this.name + ' ' + this.version + ', ' + this.osName + ' ' + this.osVersion;
		}
	});

	this.uid = this.getUID();
}

Agent.getUID = function(id, version, osId) {
	if (typeof(id) == 'object') {
		version = id.version;
		osId = id.osId;
		id = id.id;
	}
	return [id, version, osId].join(':');
};


Agent.INIT = 0;
Agent.REQUESTED = 1;
Agent.RUNNING = 2;
Agent.DONE = 4;
Agent.FAILED = 5;

module.exports = Agent;

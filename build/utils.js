
var extend = function(target) {
	each(arguments, function(arg, i) {
		if (i > 0) {
			each(arg, function(value, key) {
				if (value !== undefined) {
					if (typeof(target[key]) === 'object' && typeof(value) === 'object') { // arrays also count
						extend(target[key], value);
					} else {
						target[key] = value;
					}
				}
			});
		}
	});
	return target;
};

var each = function(obj, callback) {
	var length, key, i;

	if (obj) {
		try {
			length = obj.length;
		} catch(ex) {
			length = undefined;
		}

		if (length === undefined) {
			// Loop object items
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (callback(obj[key], key) === false) {
						return;
					}
				}
			}
		} else {
			// Loop array items
			for (i = 0; i < length; i++) {
				if (callback(obj[i], i) === false) {
					return;
				}
			}
		}
	}
};

var inSeries = function(queue, cb) {
	var i = 0, length = queue.length;

	if (typeof(cb) !== 'function') {
		cb = function() {};
	}

	function callNext(i) {
		if (typeof(queue[i]) === 'function') {
			queue[i](function(error) {
				++i < length && !error ? callNext(i) : cb(error);
			});
		}
	}
	callNext(i);
};

var color = function(s,c){return (color[c].toLowerCase()||'')+ s + color.reset;};
color.reset = '\033[39m';
color.red = '\033[31m';
color.yellow = '\033[33m';
color.green = '\033[32m';


module.exports = {
	extend: extend,
	each: each,
	inSeries: inSeries,
	color: color
};
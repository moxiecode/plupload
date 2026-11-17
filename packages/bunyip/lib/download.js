/*global __dirname:true */

var 
  Q = require('q')
, fs = require('fs')
, path = require('path')
, url = require('url')
, rl = require('readline')
, util = require('./util')
, request = {
	  http: require('http')
	, https: require('https')
}
;


/*!
 * node-progress
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Expose `ProgressBar`.
 */

/**
 * Initialize a `ProgressBar` with the given
 * `fmt` string and `options`.
 *
 * Options:
 *
 *   - `total` total number of ticks to complete
 *   - `stream` the output stream defaulting to stdout
 *   - `complete` completion character defaulting to "="
 *   - `incomplete` incomplete character defaulting to "-"
 *
 * Tokens:
 *
 *   - `:bar` the progress bar itself
 *   - `:current` current tick number
 *   - `:total` total ticks
 *   - `:elapsed` time elapsed in seconds
 *   - `:percent` completion percentage
 *   - `:eta` eta in seconds
 *
 * @param {String} fmt
 * @param {Object} options
 * @api public
 */

function ProgressBar(fmt, options) {
	options = options || {};

	if ('string' !== typeof fmt) {
		throw new Error('format required');
	}

	if ('number' !== typeof options.total) {
		throw new Error('total required');
	}

	var
	  _rl
	, _curr = 0
	, _total = options.total
	, _width = options.width || Math.min(_total, 50)
	, _percent = 0
	, _chars = {
		  complete: options.complete || '='
		, incomplete: options.incomplete || '-'
	}
	, _start = new Date()
	;

	_rl = rl.createInterface({
		  input: process.stdin
		, output: options.stream || process.stdout
	});

	_rl.setPrompt('', 0);
	
	/**
	 * "tick" the progress bar with optional `len` and
	 * optional `tokens`.
	 *
	 * @param {Number|Object} len or tokens
	 * @param {Object} tokens
	 * @api public
	 */
	this.tick = function(len, tokens) {
		var 
		  percent
		, complete
		, incomplete
		, elapsed 
		, eta
		, str
		;

		if (!_rl) {
			return;
		}

		if (len !== 0) {
			len = len || 1;
		}

		// swap tokens
		if ('object' === typeof len) {
			tokens = len, len = 1;
		}

		// progress complete
		if ((_curr += len) >= _total) {
			_rl.resume();
			_rl.close();
			return;
		}

		percent = Math.round(_curr / _total * 100);
		complete = Math.round(_width * (_curr / _total));
		elapsed = new Date() - _start;
		eta = elapsed * (_total / _curr - 1);

		// do not update progress bar, when not neccessary (avoids blinking)     
		if (percent <= _percent) {
			return;
		}
		_percent = percent;

		complete = Array(complete).join(_chars.complete);
		incomplete = Array(_width - complete.length).join(_chars.incomplete);

		str = fmt
			.replace(':bar', complete + incomplete)
			.replace(':current', _curr)
			.replace(':total', _total)
			.replace(':elapsed', (elapsed / 1000).toFixed(1))
			.replace(':eta', (eta / 1000).toFixed(1))
			.replace(':percent', percent.toFixed(0) + '%');

		if (tokens) {
			for (var key in tokens) {
				str = str.replace(':' + key, tokens[key]);
			}
		}

		_rl.write(null, {ctrl: true, name: 'u'});
		_rl.write(str);
	};
}


function download(uri, options) {
	var 
	  deferred = Q.defer()
	, uriParts = url.parse(uri)
	, protocol
	;

	if (typeof(options) === 'string') {
		options = { output: options };
	}
	options = util.extend({
		  to: __dirname
		, verbose: true
	}, options || {});

	if (!fs.existsSync(options.to)) {
		return Q.reject(util.format("Directory: '%s' doesn't exist.", options.to));
	}

	protocol = uriParts.protocol && uriParts.protocol.replace(/:$/, '') || 'http'; 

	if (!request[protocol]) {
		return Q.reject(util.format("Protocol: '%s' is not supported.", protocol));
	}

	request[protocol].get(uri)
		.on('response', function(response) {
			var 
			  total = parseInt(response.headers['content-length'], 10)
			, loaded = 0
			, type = response.headers['content-type']
			, disposition = response.headers['content-disposition']
			, fileName = options.fileName || uri.replace(/^.+?\/([\w\-\.]+)$/, '$1')
			, filePath
			, file
			, bar
			;

			if (disposition) {
				var m = disposition.match(/filename=([\'\"'])([^\1]+)\1/);
				if (m) {
					fileName = m[2];
				}
			}

			filePath = path.join(options.to, fileName);
			file = fs.createWriteStream(filePath);

			console.log("Downloading: %s", uri);

			bar = new ProgressBar('  [:bar] :percent :etas', {
				  complete: '='
				, incomplete: ' '
				, width: 50
				, total: total
			});

			response.on('data', function(chunk) {
				file.write(chunk);
				bar.tick(chunk.length);
				loaded += chunk.length;
				deferred.notify(Math.ceil(loaded / total * 100));
			});

			response.on('end', function() {
				file.end();
				console.log('\n');
				deferred.resolve({
					  size: total
					, type: type
					, name: fileName
					, path: options.to 
				});
			});
		})
		.end();

	return deferred.promise;
}


module.exports = download;


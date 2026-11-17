var 
  Q = require('q')
, urlParse = require('url').parse
, dns = require('dns')
, ip = require('range_check')
;


function isFromLocalRange(ipStr) {
	return ip.in_range(ipStr, ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
}


function isIP(str) {
	return (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(str));
}


function isLocal(url) {
	var deferred = Q.defer();

	if (!/^https?:\/\//.test(url)) {
		url = 'http://' + url;
	}

	url = urlParse(url);

	if ('localhost' === url.hostname) {
		deferred.resolve(true);
	} else if (isIP(url.hostname)) {
		deferred.resolve(isFromLocalRange(url.hostname));
	} else {
		dns.lookup(url.hostname, function(error, result) {
			if (error) {
				deferred.reject(error);
			} else {
				deferred.resolve(isFromLocalRange(result));
			}
		});
	}
	return deferred.promise;
}


module.exports = isLocal;

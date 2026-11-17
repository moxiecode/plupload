/**
 * Url.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Url
@public
@static
*/

define('moxie/core/utils/Url', [
	'moxie/core/utils/Basic'
], function(Basic) {
	/**
	Parse url into separate components and fill in absent parts with parts from current url,
	based on https://raw.github.com/kvz/phpjs/master/functions/url/parse_url.js

	@method parseUrl
	@static
	@param {String} url Url to parse (defaults to empty string if undefined)
	@return {Object} Hash containing extracted uri components
	*/
	var parseUrl = function(url, currentUrl) {
		var key = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
		, i = key.length
		, ports = {
			http: 80,
			https: 443
		}
		, uri = {}
		, regex = /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@\/]*):?([^:@\/]*))?@)?(\[[\da-fA-F:]+\]|[^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/
		, m = regex.exec(url || '')
		, isRelative
		, isSchemeLess = /^\/\/\w/.test(url)
		;

		switch (Basic.typeOf(currentUrl)) {
			case 'undefined':
				currentUrl = parseUrl(document.location.href, false);
				break;

			case 'string':
				currentUrl = parseUrl(currentUrl, false);
				break;
		}

		while (i--) {
			if (m[i]) {
				uri[key[i]] = m[i];
			}
		}

		isRelative = !isSchemeLess && !uri.scheme;

		if (isSchemeLess || isRelative) {
			uri.scheme = currentUrl.scheme;
		}

		// when url is relative, we set the origin and the path ourselves
		if (isRelative) {
			uri.host = currentUrl.host;
			uri.port = currentUrl.port;

			var path = '';
			// for urls without trailing slash we need to figure out the path
			if (/^[^\/]/.test(uri.path)) {
				path = currentUrl.path;
				// if path ends with a filename, strip it
				if (/\/[^\/]*\.[^\/]*$/.test(path)) {
					path = path.replace(/\/[^\/]+$/, '/');
				} else {
					// avoid double slash at the end (see #127)
					path = path.replace(/\/?$/, '/');
				}
			}
			uri.path = path + (uri.path || ''); // site may reside at domain.com or domain.com/subdir
		}

		if (!uri.port) {
			uri.port = ports[uri.scheme] || 80;
		}

		uri.port = parseInt(uri.port, 10);

		if (!uri.path) {
			uri.path = "/";
		}

		delete uri.source;

		return uri;
	};

	/**
	Resolve url - among other things will turn relative url to absolute

	@method resolveUrl
	@static
	@param {String|Object} url Either absolute or relative, or a result of parseUrl call
	@return {String} Resolved, absolute url
	*/
	var resolveUrl = function(url) {
		var ports = { // we ignore default ports
			http: 80,
			https: 443
		}
		, urlp = typeof(url) === 'object' ? url : parseUrl(url);
		;

		return urlp.scheme + '://' + urlp.host + (urlp.port !== ports[urlp.scheme] ? ':' + urlp.port : '') + urlp.path + (urlp.query ? urlp.query : '');
	};

	/**
	Check if specified url has the same origin as the current document

	@method hasSameOrigin
	@static
	@param {String|Object} url
	@return {Boolean}
	*/
	var hasSameOrigin = function(url) {
		function origin(url) {
			return [url.scheme, url.host, url.port].join('/');
		}

		if (typeof url === 'string') {
			url = parseUrl(url);
		}

		return origin(parseUrl()) === origin(url);
	};

	return {
		parseUrl: parseUrl,
		resolveUrl: resolveUrl,
		hasSameOrigin: hasSameOrigin
	};
});

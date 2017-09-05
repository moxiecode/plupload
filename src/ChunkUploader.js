/**
 * ChunkUploader.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 * @class plupload.ChunkUploader
 * @extends plupload.core.Queueable
 * @constructor
 * @private
 * @final
 * @constructor
 */
define('plupload/ChunkUploader', [
    'moxie/core/utils/Basic',
    'plupload/core/Collection',
    'plupload/core/Queueable',
    'moxie/xhr/XMLHttpRequest',
    'moxie/xhr/FormData'
], function(Basic, Collection, Queueable, XMLHttpRequest, FormData) {

    function ChunkUploader(blob) {
        var _xhr;

        Queueable.call(this);

        this._options = {
			file_data_name: 'file',
			headers: false,
			http_method: 'POST',
			multipart: true,
			params: {},
			send_file_name: true,
			url: false
		};

        Basic.extend(this, {

            start: function() {
                var self = this;
                var url;
                var formData;
                var options = self._options;

                if (this.state === Queueable.PROCESSING) {
                    return false;
                }

                _xhr = new XMLHttpRequest();

                if (_xhr.upload) {
                    _xhr.upload.onprogress = function(e) {
                        self.progress(e.loaded, e.total);
                    };
                }

                _xhr.onload = function() {
                    var result = {
                        response: this.responseText,
                        status: this.status,
                        responseHeaders: this.getAllResponseHeaders()
                    };

                    if (this.status < 200 && this.status >= 400) { // assume error
                        return self.failed(result);
                    }

                    self.done(result);
                };

                _xhr.onerror = function() {
                    self.failed(); // TODO: reason here
                };

                _xhr.onloadend = function() {
                    // we do not need _xhr anymore, so destroy it
                    setTimeout(function() { // we detach to sustain reference until all handlers are done
                        if (_xhr) {
                            _xhr.destroy();
                            _xhr = null;
                        }
                    }, 1);
                };

                try {
                    url = options.multipart ? options.url : buildUrl(options.url, options.params);
                    _xhr.open(options.http_method, url, true);


                    // headers must be set after request is already opened, otherwise INVALID_STATE_ERR exception will raise
                    if (!Basic.isEmptyObj(options.headers)) {
                        Basic.each(options.headers, function(val, key) {
                            _xhr.setRequestHeader(key, val);
                        });
                    }


                    if (options.multipart) {
                        formData = new FormData();

                        if (!Basic.isEmptyObj(options.params)) {
                            Basic.each(options.params, function(val, key) {
                                formData.append(key, val);
                            });
                        }

                        formData.append(options.file_data_name, blob);

                        _xhr.send(formData);
                    } else { // if no multipart, send as binary stream
                        if (Basic.isEmptyObj(options.headers) || !_xhr.hasRequestHeader('content-type')) {
                            _xhr.setRequestHeader('content-type', 'application/octet-stream'); // binary stream header
                        }

                        _xhr.send(blob);
                    }

                    ChunkUploader.prototype.start.call(this);
                } catch(ex) {
                    self.failed();
                }
            },


            stop: function() {
                if (_xhr) {
                    _xhr.abort();
                    _xhr.destroy();
                    _xhr = null;
                }
                ChunkUploader.prototype.stop.call(this);
            },

            setOption: function(option, value) {
				ChunkUploader.prototype.setOption.call(this, option, value, true);
			},

			setOptions: function(options) {
				ChunkUploader.prototype.setOption.call(this, options, true);
			},

            destroy: function() {
                this.stop();
                ChunkUploader.prototype.destroy.call(this);
            }
        });


        /**
         * Builds a full url out of a base URL and an object with items to append as query string items.
         *
         * @method buildUrl
         * @private
         * @param {String} url Base URL to append query string items to.
         * @param {Object} items Name/value object to serialize as a querystring.
         * @return {String} String with url + serialized query string items.
         */
        function buildUrl(url, items) {
            var query = '';

            Basic.each(items, function(value, name) {
                query += (query ? '&' : '') + encodeURIComponent(name) + '=' + encodeURIComponent(value);
            });

            if (query) {
                url += (url.indexOf('?') > 0 ? '&' : '?') + query;
            }

            return url;
        }

    }

    Basic.inherit(ChunkUploader, Queueable);

    return ChunkUploader;
});
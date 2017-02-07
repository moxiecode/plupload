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

    function ChunkUploader(blob, options) {
        var _xhr;

        Queueable.call(this);

        this.setOptions(options);

        Basic.extend(this, {

            start: function(options) {
                var self = this;
                var url;
                var formData;

                // have the options override local for the start() method only
                var _options = options ? Basic.extendImmutable({}, this.getOptions(), options) : this.getOptions();

                ChunkUploader.prototype.start.call(this);

                _xhr = new XMLHttpRequest();

                if (_xhr.upload) {
                    _xhr.upload.onprogress = function(e) {
                        self.progress(e.loaded, e.total);
                    };
                }

                _xhr.onload = function() {
                    var result = {
                        response: _xhr.responseText,
                        status: _xhr.status,
                        responseHeaders: _xhr.getAllResponseHeaders()
                    };

                    if (_xhr.status >= 400) { // assume error
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


                url = _options.multipart ? _options.url : buildUrl(_options.url, _options.params);
                _xhr.open(_options.http_method, url, true);


                // headers must be set after request is already opened, otherwise INVALID_STATE_ERR exception will raise
                if (!Basic.isEmptyObj(_options.headers)) {
                    Basic.each(_options.headers, function(val, key) {
                        _xhr.setRequestHeader(key, val);
                    });
                }


                if (_options.multipart) {
                    formData = new FormData();

                    if (!Basic.isEmptyObj(_options.params)) {
                        Basic.each(_options.params, function(val, key) {
                            formData.append(key, val);
                        });
                    }

                    formData.append(_options.file_data_name, blob);

                    _xhr.send(formData);
                } else { // if no multipart, send as binary stream
                    if (Basic.isEmptyObj(_options.headers) || !_options.headers['content-type']) {
                        _xhr.setRequestHeader('content-type', 'application/octet-stream'); // binary stream header
                    }

                    _xhr.send(blob);
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

    ChunkUploader.prototype = new Queueable();

    return ChunkUploader;
});
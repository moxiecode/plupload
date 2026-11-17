/**
 * QueueUpload.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
 @class plupload.QueueUpload
 @extends plupload.core.Queue
 @constructor
 @private
 @final
 @since 3.0
 @param {Object} options
 */
define('plupload/QueueUpload', [
    'plupload',
    'plupload/core/Queue'
], function(plupload, Queue) {

    return (function(Parent) {
        plupload.inherit(QueueUpload, Parent);

        function QueueUpload(options) {

            Queue.call(this, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                url: false,
                chunk_size: 0,
                multipart: true,
                http_method: 'POST',
                params: {},
                headers: false,
                file_data_name: 'file',
                send_file_name: true,
                stop_on_fail: true
            });

            this.setOption = function(option, value) {
                if (typeof(option) !== 'object') {
                    if (option == 'max_upload_slots') {
                        option = 'max_slots';
                    }
                }
                QueueUpload.prototype.setOption.call(this, option, value, true);
            };

            this.setOptions(options);
        }

        return QueueUpload;
    }(Queue));
});
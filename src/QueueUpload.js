/**
 * QueueUpload.js
 *
 * Copyright 2016, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
 @contsructor
 @class plupload/QueueUpload
 @private
 */
define('plupload/QueueUpload', [
    'moxie/core/utils/Basic',
    'plupload/core/Queue'
], function(Basic, Queue) {

    /**
     * @class QueueUpload
     * @constructor
     * @extends Queue
     */
    return (function(Parent) {
        Basic.inherit(QueueUpload, Parent);

        function QueueUpload(options) {

            Queue.call(this, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                pause_before_start: true,
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
                    if (!this._options.hasOwnProperty(option)) {
                        return;
                    }
                }
                QueueUpload.prototype.setOption.apply(this, arguments);
            };

            this.setOptions(options);
        }

        return QueueUpload;
    }(Queue));
});
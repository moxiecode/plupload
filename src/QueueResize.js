/**
 * QueueResize.js
 *
 * Copyright 2016, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
 @contsructor
 @class plupload/QueueResize
 @private
 */
define('plupload/QueueResize', [
    'moxie/core/utils/Basic',
    'plupload/core/Queue'
], function(Basic, Queue) {

    /**
     * @class QueueResize
     * @constructor
     * @extends Queue
     */
    return (function(Parent) {
        Basic.inherit(QueueResize, Parent);

        function QueueResize(options) {

            Queue.call(this, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                pause_before_start: true,
                resize: {}
            });

            this.setOption = function(option, value) {
                if (typeof(option) !== 'object') {
                    if (option == 'max_resize_slots') {
                        option = 'max_slots';
                    }
                    if (!this._options.hasOwnProperty(option)) {
                        return;
                    }
                }
                QueueResize.prototype.setOption.apply(this, arguments);
            };


            this.setOptions(options);
        }


        return QueueResize;
    }(Queue));
});
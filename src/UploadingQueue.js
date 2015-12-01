/**
@class plupload/UploadingQueue
@constructor
@public
@extends plupload/core/Queue
*/
define('plupload/UploadingQueue', [
    'plupload/core/Queue'
], function(Queue) {

    var _instance;

    function UploadingQueue(options) {
        UploadingQueue.prototype.init.call(this, options);
    }


    UploadingQueue.getInstance = function(options, forceFresh) {
        if (!_instance || forceFresh) {
            _instance = new UploadingQueue(options);
        }
        return _instance;
    };

    UploadingQueue.prototype = new Queue();

    return UploadingQueue;
});
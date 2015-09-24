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
        Queue.call(this, options);
    }
    
    
    UploadingQueue.getInstance = function(options, forceFresh) {
        if (_instance && !forceFresh) {
            return _instance;
        }
        return (_instance = new UploadingQueue(options));
    };
    
    UploadingQueue.prototype = new Queue();
    
    return UploadingQueue;
});

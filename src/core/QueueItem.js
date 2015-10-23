/**
 * QueueItem.js
 *
 * Copyright 2015, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
Every queue item must have properties, implement methods and fire events defined in this class

@contsructor
@class plupload/core/QueueItem
@private
@decorator
@extends EventTarget
*/
define('plupload/core/QueueItem', [
    'moxie/core/utils/Basic',
    'plupload/core/Collection',
    'moxie/core/EventTarget'
], function(Basic, Collection, EventTarget) {
    
	var dispatches = [
	    /**
	     * Dispatched when the item is put on pending list
	     * 
	     * @event queued
	     * @param {Object} event
	     */
	     'queued',
	    
	    
		/**
		 * Dispatched as soon as activity starts
		 * 
		 * @event started
		 * @param {Object} event
		*/
		'started',
		
		
		'paused',
		
		
		'stopped',
		
		
		/**
		 * Dispatched as the activity progresses
		 * 
		 * @event
		 * @param {Object} event
		 *      @param {Number} event.percent
		 *      @param {Number} [event.processed]
		 *      @param {Number} [event.total]
		 */
		 'progress',
		 
	
		  'failed',
		  

		  'done',
		  
		  
		  'processed'
	];
	
	
    function QueueItem() {
        var _options;        
        
        Basic.extend(this, {
            
            uid: Basic.guid(),
            
            state: QueueItem.IDLE,
            
            processed: 0,
            
            total: 0,
            
            percent: 0,
            
            retries: 0,


            init: function(options) {
                _options = Basic.extend({}, options);
            },

            
            start: function() {
                this.state = QueueItem.PROCESSING;
                this.trigger('started');
            },
            
            
            pause: function() {
                this.processed = this.percent = 0; // by default reset all progress
                this.loaded = this.processed; // for backward compatibility
                
                this.state = QueueItem.PAUSED;
                this.trigger('paused');  
            },
            
            
            stop: function() {
                this.processed = this.percent = 0;
                this.loaded = this.processed; // for backward compatibility
                
                this.state = QueueItem.IDLE;
                this.trigger('stopped');
            },
            
            
            done: function(result) {
                this.processed = this.total;
                this.loaded = this.processed; // for backward compatibility
                this.percent = 100;
                
                this.state = QueueItem.DONE;
                this.trigger('done', result);
            },
            
            
            failed: function(result) {
                this.processed = this.percent = 0; // reset the progress
                this.loaded = this.processed; // for backward compatibility
                
                this.state = QueueItem.FAILED;
                this.trigger('failed', result);
            },
            
            
            progress: function(processed, total) {
                this.processed = processed;
                this.loaded = this.processed; // for backward compatibility
                
                if (total) {
                    this.total = total;
                }

                this.percent = Math.min(Math.ceil(this.processed / this.total * 100), 100);
                
                this.trigger({
                    type    : 'progress',
                    loaded  : this.processed,
                    total   : this.total
                });
            },
            
            
            destroy: function() {
                this.unbindAll();
                this.state = QueueItem.DESTROYED;
                this.trigger('destroy');
            }
            
        });
    }
    
    
    QueueItem.IDLE          = 0;
    QueueItem.PROCESSING    = 1;
    QueueItem.PAUSED        = 2;
    QueueItem.RESUMED       = 3;
    QueueItem.DONE          = 4;
    QueueItem.FAILED        = 5;
    QueueItem.DESTROYED     = 8;
    
    QueueItem.prototype = new EventTarget();
    
    return QueueItem;
});
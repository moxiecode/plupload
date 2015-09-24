/**
 * Queue.js
 *
 * Copyright 2015, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload/core/Queue
@private
*/
define('plupload/core/Queue', [
    'moxie/core/utils/Basic',
    'plupload/core/Collection',
    'moxie/core/EventTarget',
    'plupload/core/QueueItem',
    'plupload/core/Stats'
], function(Basic, Collection, EventTarget, QueueItem, Stats) {
    
    	var dispatches = [
		/**
		 * Dispatched as soon as activity starts
		 * 
		 * @event started
		 * @param {Object} event
		*/
		'Started',

        'OptionChanged',

        'StateChanged',
		
		
		/**
		 * Dispatched as the activity progresses
		 * 
		 * @event
		 * @param {Object} event
		 *      @param {Number} event.percent
		 *      @param {Number} event.processed
		 *      @param {Number} event.total
		 */
		 'Progress',
		 
		 
		 /**
		  * 
		  */
		  'Paused',
		  
		  
		  'Done',
		  
		  'Stopped'
	];
	
    /**
     * @class Queue
     * @constructor
     * @extends EventTarget
     * @param {Object} [options]
     *      @param {Number} [options.max_slots=1] Amount of simultaneously active slots
     *      @param {Bool} [options.auto_start=false] Whether to start the queue as soon as the items are added
     *      @param {Bool} [options.finish_active=false] Whether to always wait until active items finish or stop immediately
     */
    function Queue(options) {
        var _options;
    
        var _queue = new Collection();
        var _stats = new Stats();
        var _countProcessing = 0;
        var _countPaused = 0;
        var _startTime;
        
        _options = Basic.extend({
            max_slots: 1,
            max_retries: 0, 
            auto_start: false,
            finish_active: false,
            pause_before_start: true
        }, options);
        
    
        EventTarget.call(this);
        
        
        Basic.extend(this, {
            /**
             * @property state
             * @type {Number}
             * @default Queue.IDLE
             * @readOnly
             */ 
            state: Queue.IDLE,


            stats: _stats,

            /**
             * Set the value for the specified option(s).
             *
             * @method setOption
             * @since 2.1
             * @param {String|Object} option Name of the option to change or the set of key/value pairs
             * @param {Mixed} [value] Value for the option (is ignored, if first argument is object)
             */
            setOption: function(option, value) {
                var self = this;
                var oldValue;

                if (typeof(option) === 'object') {
                    Basic.each(option, function(value, option) {
                        self.setOption(option, value);
                    });
                    return;
                } 

                oldValue = _options[option];

                _options[option] = normalizeOption(option, value, _options);
                
                self.trigger('OptionChanged', option, value, oldValue);
            },

            /**
             * Get the value for the specified option or the whole configuration, if not specified.
             * 
             * @method getOption
             * @since 2.1
             * @param {String} [option] Name of the option to get
             * @return {Mixed} Value for the option or the whole set
             */
            getOption: function(option) {
                if (!option) {
                    return _options;
                }
                return _options[option];
            },            
            
            /**
             * Start the queue
             * 
             * @method start
             */ 
            start: function() {
                var self = this;
                var prevState = self.state;

                if (self.state === Queue.STARTED) {
                    return false;
                }

                self.state = Queue.STARTED;
                self.trigger('StateChanged', self.state, prevState);

                _startTime = new Date();

                processNext.call(self);
                return true;
            },
            
            
            /**
             * Stop the queue. If `finish_active=true` the queue will wait until active items are done, before
             * stopping.
             * 
             * @method stop
             */
            stop: function() {
                var self = this;
                var prevState = self.state;
                
                if (_options.finish_active) {
                    return;
                } else if (!_countProcessing) {
                    _queue.each(function(item) {
                        self.pauseItem(item.uid);   
                    });
                }
                
                self.state = Queue.STOPPED;
                this.trigger('StateChanged', self.state, prevState);
                self.trigger('Stopped');
            },


            getItem: function(uid) {
                return _queue.get(uid);
            },
            
            
            /**
             * Add instance of QueueItem to the queue. If `auto_start=true` queue will start as well.
             * 
             * @method addItem
             * @param {QueueItem} item
             */ 
            addItem: function(item) {
                var self = this;

                item.bind('Progress', function() {
                    self.calcStats();
                });
                
                item.bind('Failed', function () {
                    if (_options.max_retries && this.retries < _options.max_retries) {
                        this.stop();
                        this.retries++;
                    }
                });
                
                item.bind('Processed', function() {
                    self.calcStats();
                    processNext.call(this);
                }, 0, this);

                _queue.add(item.uid, item);
                item.trigger('Queued');
                
                if (_options.auto_start) {
                    this.start();
                }
            },
            
            
            /**
             * Removes an item from the queue by its uid
             * 
             * @method removeItem
             * @param {String} uid
             * @return {QueueItem} Item that was removed
             */ 
            removeItem: function(uid) {
                var item = _queue.get(uid);
                
                if (item) {
                    this.stopItem(item.uid);
                    
                    if (this.state === Queue.STARTED) {
                        processNext.call(this);
                    }
                } else {
                    return false;
                }
                
                _queue.remove(uid);
                item.destroy();
                self.calcStats();
                
                return true;
            },
            
            
            stopItem: function(uid) {
                var item = _queue.get(uid);
                if (item) {
                    if (item.state === QueueItem.PROCESSING) {
                        _countProcessing--;
                    }
                    item.stop();
                } else {
                    return false;
                }
                
                if (!_countProcessing && !_countPaused) {
                    this.stop();
                }
                return true;
            },
            
            
            pauseItem: function(uid) {
                var item = _queue.get(uid);
                if (item) {
                    if (item.state === QueueItem.PROCESSING) {
                        _countProcessing--;
                    }
                    _countPaused++;
                    item.pause();
                } else {
                    return false;
                }

                return true;
            },
            
            
            resumeItem: function(uid) {
                var item = _queue.get(uid);
                if (item && item.state === QueueItem.PAUSED) {
                    item.state = QueueItem.RESUMED; // mark the item to be picked up on next iteration
                    _countPaused--;
                } else {
                    return false;
                }

                this.start();
                return true;
            },
            

            forEachItem: function(cb) {
                _queue.each(cb);
            },

            
            countSpareSlots: function() {
                return Math.max(_options.max_slots - _countProcessing, 0);
            },
            
            
            clear: function() {
                var self = this;
                
                if (self.state !== Queue.STOPPED) { 
                    // stop the active queue first
                    self.bindOnce('Stopped', function() {
                        self.clear();
                    });
                    return self.stop();
                } else {
                    _queue.clear();
                    _stats.reset();
                }
            },
            
            
            calcStats: function() {
                _stats.reset();
                
                this.forEachItem(function(item) {
                    _stats.processed += item.processed;
                    _stats.total += item.total;

                    switch (item.status) {
                        case QueueItem.DONE:
                            _stats.done++;
                            _stats.uploaded = _stats.done; // for backward compatibility
                            break;

                        case QueueItem.FAILED:
                            _stats.failed++;
                            break;

                        default:
                            _stats.queued++;
                    }

                    if (_startTime) {
                        _stats.processedPerSec = Math.ceil(_stats.processed / ((+new Date() - _startTime || 1) / 1000.0));
                        _stats.bytesPerSec = _stats.processedPerSec; // for backward compatibility
                    }

                    if (_stats.total) {
                        _stats.percent = Math.ceil(_stats.processed / _stats.total * 100);
                    }
                });
                   
               // for backward compatibility     
                _stats.loaded = _stats.processed;
                _stats.size = _stats.total;
            }
        });
        
        
        function getCandidate() {
            var nextItem;
            _queue.each(function(item) {
                if (item.state === QueueItem.IDLE || item.state === QueueItem.RESUMED) {
                    nextItem = item;
                    return false;
                }
            });
            return nextItem;
        }
        
        
        function processNext() {
		    var item;
		    
		    while (_countProcessing < _options.max_slots) {
		        item = getCandidate();
		        if (item) {
    		        if (_options.pause_before_start && item.state === QueueItem.IDLE) {
    		            this.pauseItem(item.uid);
    		            
    		            if (item.trigger('BeforeStart')) {
    		                // if nothing has seized the item, continue
    		                this.resumeItem(item.uid);
    		            }
    		        } else {
                        _countProcessing++;
                        item.start();
                    }
		        } else if (!_countProcessing) { // we ran out of pending and active items too, so we are done
		            this.trigger('Done');
		            return this.stop();
		        }
		    }
        }        
    }
    
    Queue.STOPPED = 1;
    Queue.STARTED = 2;
    
    return Queue;
});

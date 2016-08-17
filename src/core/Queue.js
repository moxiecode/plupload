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
    'plupload/core/Optionable',
    'plupload/core/Queueable',
    'plupload/core/Stats'
], function(Basic, Collection, Optionable, Queueable, Stats) {

    var dispatches = [
        /**
         * Dispatched as soon as activity starts
         * 
         * @event started
         * @param {Object} event
         */
        'Started',

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
     */
    return (function(Parent) {
        Basic.inherit(Queue, Parent);
    

        function Queue() {
            Parent.apply(this, arguments);

            /**
            @property _queue
            @type {Collection}
            @private
            */
            this._queue = new Collection();

            /**
             * @property state
             * @type {Number}
             * @default Queue.IDLE
             * @readOnly
             */
            this.state = Queue.IDLE;


            /**
            @property stats
            @type {Stats}
            @readOnly
            */
            this.stats = new Stats();


            this.setOption({
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                pause_before_start: true
            });

            this.handleEventProps(dispatches);
        }            

        
        Basic.extend(Queue.prototype, {

            /**
             * Returns number of items in the queue
             *
             * @method count
             * @returns {Number}
             */
            count: function() {
                return this._queue.count();
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

                self._startTime = new Date();

                processNext.call(self);
                return true;
            },


            pause: function() {
                var self = this;
                var prevState = self.state;

                this._queue.each(function(item) {
                    if (Basic.inArray(item.state, [Queueable.PROCESSING, Queueable.RESUMED]) !== -1) {
                        self.pauseItem(item);
                    }
                });

                self.state = Queue.PAUSED;
                this.trigger('StateChanged', self.state, prevState);
                self.trigger('Paused');
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

                if (self.getOption('finish_active')) {
                    return;
                } else if (self.stats.processing || self.stats.paused) {
                    self._queue.each(function(item) {
                        self.stopItem(item.uid);
                    });
                }

                self.state = Queue.STOPPED;
                self.trigger('StateChanged', self.state, prevState);
                self.trigger('Stopped');
            },


            forEachItem: function(cb) {
                this._queue.each(cb);
            },

            getItem: function(uid) {
                return this._queue.get(uid);
            },


            /**
             * Add instance of Queueable to the queue. If `auto_start=true` queue will start as well.
             * 
             * @method addItem
             * @param {Queueable} item
             */
            addItem: function(item) {
                var self = this;

                item.bind('Progress', function() {
                    calcStats.call(self);
                });

                item.bind('Failed', function() {
                    if (self.getOption('max_retries') && this.retries < self.getOption('max_retries')) {
                        this.stop();
                        this.retries++;
                    }
                });

                item.bind('Processed', function() {
                    me.stats.processing--;
                    calcStats.call(self);
                    processNext.call(self);
                }, 0, this);

                this._queue.add(item.uid, item);
                calcStats.call(this);
                item.trigger('Queued');

                if (self.getOption('auto_start')) {
                    this.start();
                }
            },


            /**
             * Extracts item from the queue by its uid and returns it.
             *
             * @method extractItem
             * @param {String} uid
             * @return {Queueable} Item that was removed
             */
            extractItem: function(uid) {
                var item = this._queue.get(uid);

                if (item) {
                    this.stopItem(item.uid);

                    if (this.state === Queue.STARTED) {
                        processNext.call(this);
                    }

                    this._queue.remove(uid);
                    calcStats.call(this);
                }
                return item;
            },

            /**
             * Removes item from the queue and destroys it
             *
             * @method removeItem
             * @param {String} uid
             */
            removeItem: function(uid) {
                var item = this.extractItem(uid);
                if (item) {
                    item.destroy();
                }
            },


            stopItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    if (item.state === Queueable.PROCESSING) {
                        this.stats.processing--;
                    }
                    item.stop();
                } else {
                    return false;
                }

                if (!this.stats.processing && !this.stats.paused) {
                    this.stop();
                }
                return true;
            },


            pauseItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    if (item.state === Queueable.PROCESSING) {
                        this.stats.processing--;
                    }
                    this.stats.paused++;
                    item.pause();
                } else {
                    return false;
                }

                if (!this.stats.processing) {
                    this.pause();
                }

                return true;
            },


            resumeItem: function(uid) {
                var item = this._queue.get(uid);
                if (item && item.state === Queueable.PAUSED) {
                    item.state = Queueable.RESUMED; // mark the item to be picked up on next iteration
                    this.stats.paused--;
                } else {
                    return false;
                }

                this.start();
                return true;
            },


            countSpareSlots: function() {
                return Math.max(this.getOption('max_slots') - self.stats.processing, 0);
            },


            toArray: function() {
                var arr = [];
                this.forEachItem(function(item) {
                    arr.push(item);
                });
                return arr;
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
                    self._queue.clear();
                    self.stats.reset();
                }
            },


            destroy: function() {
                var self = this;
                var prevState = self.state;

                if (self.state === Queue.DESTROYED) {
                    return; // already destroyed
                }

                if (self.state !== Queue.STOPPED) {
                    // stop the active queue first
                    self.bindOnce('Stopped', function() {
                        self.destroy();
                    });
                    return self.stop();
                } else {
                    self.clear();
                    self.unbindAll();

                    self._queue = self.stats = self._startTime = null;

                    self.state = Queue.DESTROYED;
                    self.trigger('StateChanged', self.state, prevState);
                    self.trigger('Destroy');
                }
            }
        });



        function getCandidate() {
            var nextItem;
            this._queue.each(function(item) {
                if (item.state === Queueable.IDLE || item.state === Queueable.RESUMED) {
                    nextItem = item;
                    return false;
                }
            });
            return nextItem;
        }


        function processNext() {
            var self = this;
            var item;

            while (self.stats.processing < self.getOption('max_slots')) {
                item = getCandidate.call(self);
                if (item) {
                    if (self.getOption('pause_before_start') && item.state === Queueable.IDLE) {
                        self.pauseItem(item.uid);

                        if (item.trigger('BeforeStart')) {
                            // if nothing has seized the item, continue
                            self.resumeItem(item.uid);
                        }
                    } else {
                        self.stats.processing++;
                        item.start(self.getOptions());
                    }
                } else if (!self.stats.processing) { // we ran out of pending and active items too, so we are done
                    self.trigger('Done');
                    return self.stop();
                }
            }
        }


        function calcStats() {
            var self = this;
            self.stats.reset();

            self.forEachItem(function(item) {
                self.stats.processed += item.processed;
                self.stats.total += item.total;

                switch (item.status) {
                    case Queueable.DONE:
                        self.stats.done++;
                        self.stats.uploaded = self.stats.done; // for backward compatibility
                        break;

                    case Queueable.FAILED:
                        self.stats.failed++;
                        break;

                    default:
                        self.stats.queued++;
                }

                if (self._startTime) {
                    self.stats.processedPerSec = Math.ceil(self.stats.processed / ((+new Date() - self._startTime || 1) / 1000.0));
                    self.stats.bytesPerSec = self.stats.processedPerSec; // for backward compatibility
                }

                if (self.stats.total) {
                    self.stats.percent = Math.ceil(self.stats.processed / self.stats.total * 100);
                }
            });

            // for backward compatibility     
            self.stats.loaded = self.stats.processed;
            self.stats.size = self.stats.total;
        }


        Queue.STOPPED = 1;
        Queue.STARTED = 2;
        Queue.PAUSED = 3;
        Queue.DESTROYED = 8;

        return Queue;

    }(Optionable));
});
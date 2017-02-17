/**
 * Queue.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload.core.Queue
@private
*/
define('plupload/core/Queue', [
    'moxie/core/utils/Basic',
    'plupload/core/ArrCollection',
    'plupload/core/Optionable',
    'plupload/core/Queueable',
    'plupload/core/Stats'
], function(Basic, ArrCollection, Optionable, Queueable, Stats) {

    var dispatches = [
        /**
         * Dispatched as soon as activity starts
         *
         * @event started
         * @param {Object} event
         */
        'Started',

        /**
         * Dispatched every time the state of queue changes
         *
         * @event statechanged
         * @param {Object} event
         * @param {Number} state New state
         * @param {Number} prevState Previous state
         */
        'StateChanged',

        /**
         * Dispatched as activity progresses
         *
         * @event progress
         * @param {Object} event
         * @param {Number} processed
         * @param {Number} total
         * @param {plupload.core.Stats} stats
         */
        'Progress',

        /**
         * Dispatched when activity is paused
         *
         * @event paused
         * @param {Object} event
         */
        'Paused',

        /**
         * Dispatched when there's no more items in processing
         *
         * @event done
         * @param {Object} event
         */
        'Done',

        /**
         * Dispatched as soon as activity ends
         *
         * @event stopped
         * @param {Object} event
         */
        'Stopped',

        /**
         * Dispatched when queue is destroyed
         *
         * @event destroy
         * @param {Object} event
         */
        'Destroy'
    ];

    /**
     * @class Queue
     * @constructor
     * @extends EventTarget
     */
    return (function(Parent) {
        Basic.inherit(Queue, Parent);


        function Queue(options) {
            Parent.apply(this, arguments);

            /**
            @property _queue
            @type {Collection}
            @private
            */
            this._queue = new ArrCollection();

            /**
             * Initialized when queue is started
             *
             * @property _startTime
             * @type {Date}
             * @private
             */
            this._startTime = 0;

            this.uid = Basic.guid();

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


            this._options = Basic.extend({
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                pause_before_start: true
            }, options);
        }

        Queue.IDLE = 0;
        Queue.STOPPED = 1;
        Queue.STARTED = 2;
        Queue.PAUSED = 3;
        Queue.DESTROYED = 8;


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

                if (!self._startTime) {
                    self._startTime = new Date();
                }

                self.state = Queue.STARTED;
                self.trigger('StateChanged', self.state, prevState);
                self.trigger('Started');

                processNext.call(self);
                return true;
            },


            pause: function() {
                var self = this;
                var prevState = self.state;

                if (self.state === Queue.PAUSED) {
                    return false;
                }

                this.forEachItem(function(item) {
                    if (Basic.inArray(item.state, [Queueable.PROCESSING, Queueable.RESUMED]) !== -1) {
                        self.pauseItem(item);
                    }
                });

                self.state = Queue.PAUSED;
                self.trigger('StateChanged', self.state, prevState);
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

                if (self.state === Queue.STOPPED) {
                    return false;
                }

                if (self.getOption('finish_active')) {
                    return;
                } else if (self.stats.processing || self.stats.paused) {
                    self.forEachItem(function(item) {
                        item.stop();
                    });
                }

                self._startTime = 0;

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

                item.bind('Started Resumed Paused Processed Stopped', function() {
                    calcStats.call(self);
                    Basic.delay.call(self, processNext);
                });


                item.bind('Progress', function() {
                    calcStats.call(self);
                    self.trigger('Progress', self.stats.processed, self.stats.total, self.stats);
                });

                item.bind('Failed', function() {
                    if (self.getOption('max_retries') && this.retries < self.getOption('max_retries')) {
                        this.stop();
                        this.retries++;
                    }
                });

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
             * @returns {Boolean} Result of the operation
             */
            removeItem: function(uid) {
                var item = this.extractItem(uid);
                if (item) {
                    item.destroy();
                    return true;
                }
                return false;
            },


            stopItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    var result = item.stop();
                    // after item is stopped check if queue got empty and if it did - stop it too
                    if (!hasActiveItems.call(this)) {
                        this.stop();
                    }
                    return result;
                } else {
                    return false;
                }
            },


            pauseItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    return item.pause();
                } else {
                    return false;
                }
            },


            resumeItem: function(uid) {
                var item = this._queue.get(uid);
                if (item) {
                    Basic.delay.call(this, function() {
                        this.start(); // start() will know if it needs to restart the queue
                    });
                    return item.resume();
                } else {
                    return false;
                }
            },


            splice: function(start, length) {
                return this._queue.splice(start, length);
            },


            countSpareSlots: function() {
                return Math.max(this.getOption('max_slots') - this.stats.processing, 0);
            },


            toArray: function() {
                return this._queue.toArray();
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
                    self.trigger('Destroy');

                    self.clear();

                    self.state = Queue.DESTROYED;
                    self.trigger('StateChanged', self.state, prevState);

                    self.unbindAll();
                    self._queue = self.stats = self._startTime = null;
                }
            }
        });


        /**
         * Returns another Queueable.IDLE or Queueable.RESUMED item, or null.
         */
        function getNextIdleItem() {
            var nextItem;
            this.forEachItem(function(item) {
                if (item.state === Queueable.IDLE || item.state === Queueable.RESUMED) {
                    nextItem = item;
                    return false;
                }
            });
            return nextItem ? nextItem : null;
        }


        function hasActiveItems() {
            return this.stats.processing || this.stats.paused;
        }


        function processNext() {
            var self = this;
            var item;

            if (self.state === Queue.STARTED && self.stats.processing < self.getOption('max_slots')) {
                item = getNextIdleItem.call(self);
                if (item) {
                    item.setOptions(self.getOptions());
                    item.start();
                } else if (!hasActiveItems.call(self)) { // we ran out of pending and active items too, so we are done
                    self.stop();
                    self.trigger('Done');
                    return;
                }
            }
        }


        function calcStats() {
            var self = this;
            var stats = self.stats;
            var processed = 0;
            var processedDuringThisSession = 0;

            if (!stats) {
                return; // maybe queue is destroyed
            }

            stats.reset();

            self.forEachItem(function(item) {
                switch (item.state) {
                    case Queueable.DONE:
                        stats.done++;
                        stats.uploaded = stats.done; // for backward compatibility
                        break;

                    case Queueable.FAILED:
                        stats.failed++;
                        break;

                    case Queueable.PROCESSING:
                        stats.processing++;
                        break;

                    case Queueable.PAUSED:
                        stats.paused++;
                        break;

                    default:
                        stats.queued++;
                }

                processed += item.processed;

                if (!item.processedTimestamp || item.processedTimestamp > self._startTime) {
                    processedDuringThisSession += processed;
                }

                stats.processedPerSec = Math.ceil(processedDuringThisSession / ((+new Date() - self._startTime || 1) / 1000.0));

                stats.processed = processed;
                stats.total += item.total;
                if (stats.total) {
                    stats.percent = Math.ceil(stats.processed / stats.total * 100);
                }
            });

            // for backward compatibility
            stats.loaded = stats.processed;
            stats.size = stats.total;
            stats.bytesPerSec = stats.processedPerSec;
        }

        return Queue;

    }(Optionable));
});
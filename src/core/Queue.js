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
    'plupload/core/Queueable',
    'plupload/core/Stats'
], function(Basic, ArrCollection, Queueable, Stats) {

    var dispatches = [
        /**
         * Dispatched as soon as activity starts
         *
         * @event started
         * @param {Object} event
         */
        'Started',


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
            @property stats
            @type {Stats}
            @readOnly
            */
            this.stats = new Stats();


            this._options = Basic.extend({}, this._options, {
                max_slots: 1,
                max_retries: 0,
                auto_start: false,
                finish_active: false,
                pause_before_start: false
            }, options);
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
                if (!Queue.super.start.call(this)) {
                    return false;
                }
                return processNext.call(this);
            },


            pause: function() {
                if (!Queue.super.pause.call(this)) {
                    return false;
                }

                this.forEachItem(function(item) {
                    item.pause();
                });
            },

            /**
             * Stop the queue. If `finish_active=true` the queue will wait until active items are done, before
             * stopping.
             *
             * @method stop
             */
            stop: function() {
                if (!Queue.super.stop.call(this) || this.getOption('finish_active')) {
                    return false;
                }

                if (this.stats.processing || this.stats.paused) {
                    this.forEachItem(function(item) {
                        item.stop();
                    });
                }
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

                item.bind('Started Resumed', function() {
                    self.calcStats();
                    Basic.delay.call(self, processNext);
                });

                item.bind('Paused', function() {
                    self.calcStats();
                    Basic.delay.call(self, function() {
                        if (!processNext.call(self) && !self.stats.processing) {
                            self.pause();
                        }
                    });
                });

                item.bind('Processed Stopped', function() {
                    self.calcStats();
                    Basic.delay.call(self, function() {
                        if (!processNext.call(self) && !(this.stats.processing || this.stats.paused)) {
                            self.stop();
                            self.trigger('Done');
                        }
                    });
                });

                item.bind('Progress', function() {
                    self.calcStats();
                    self.trigger('Progress', self.stats.processed, self.stats.total, self.stats);
                });

                item.bind('Failed', function() {
                    if (self.getOption('max_retries') && this.retries < self.getOption('max_retries')) {
                        this.stop();
                        this.retries++;
                    }
                });

                this._queue.add(item.uid, item);
                this.calcStats();
                item.trigger('Queued');

                if (self.getOption('auto_start') || self.state === Queueable.PAUSED) {
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
                    this.calcStats();
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
                    return item.stop();
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

                if (self.state !== Queueable.IDLE) {
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


            calcStats: function() {
                var self = this;
                var stats = self.stats;
                var processed = 0;
                var processedDuringThisSession = 0;

                if (!stats) {
                    return false; // maybe queue is destroyed
                }

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

                    if (!item.processedTimestamp || item.processedTimestamp > self.startedTimestamp) {
                        processedDuringThisSession += processed;
                    }

                    stats.processedPerSec = Math.ceil(processedDuringThisSession / ((+new Date() - self.startedTimestamp || 1) / 1000.0));

                    stats.processed = processed;
                    stats.total += item.total;
                    if (stats.total) {
                        stats.percent = Math.ceil(stats.processed / stats.total * 100);
                    }
                });

                // enable properties inherited from Queueable
                self.processed = stats.processed;
                self.total = stats.total;
                self.percent = stats.percent;

                // for backward compatibility
                stats.loaded = stats.processed;
                stats.size = stats.total;
                stats.bytesPerSec = stats.processedPerSec;

                return true;
            },


            destroy: function() {
                var self = this;

                if (self.state === Queueable.DESTROYED) {
                    return false; // already destroyed
                }

                if (self.state !== Queueable.IDLE) {
                    // stop the active queue first
                    self.bindOnce('Stopped', function() {
                        Basic.delay.call(self, self.destroy);
                    });
                    return self.stop();
                } else {
                    self.clear();
                    Queue.super.destroy.call(this);
                    self._queue = self.stats = null;
                }
                return true;
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


        function processNext() {
            var item;

            if (this.state !== Queueable.PROCESSING && this.state !== Queueable.PAUSED) {
                return false;
            }

            if (this.stats.processing < this.getOption('max_slots')) {
                item = getNextIdleItem.call(this);
                if (item) {
                    item.setOptions(this.getOptions());
                    return item.start();
                }
            }
            return false;
        }

        return Queue;

    }(Queueable));
});
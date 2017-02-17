/**
 * Queueable.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.se.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
Every queue item must have properties, implement methods and fire events defined in this class

@contsructor
@class plupload.core.Queueable
@private
@decorator
@extends EventTarget
*/
define('plupload/core/Queueable', [
    'moxie/core/utils/Basic',
    'plupload/core/Optionable'
], function(Basic, Optionable) {

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


        'resumed',


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


        'processed',

        'destroy'
    ];


    return (function(Parent) {

        function Queueable() {
            Parent.apply(this, arguments);

            /**
            Unique identifier
            @property uid
            @type {String}
            */
            this.uid = Basic.guid();

            this.state = Queueable.IDLE;

            this.processed = 0;

            this.total = 0;

            this.percent = 0;

            this.retries = 0;

            /**
             * Can be 0-Infinity - item with higher priority will have well... higher priority
             * @property [priority=0]
             * @type {Number}
             */
            this.priority = 0;

            /**
             * Set when item becomes Queueable.DONE or Queueable.FAILED.
             * Used to calculate proper processedPerSec for the queue stats.
             * @property processedTimestamp
             * @type {Number}
             */
            this.processedTimestamp = 0;
        }

        Queueable.IDLE = 0;
        Queueable.PROCESSING = 1;
        Queueable.PAUSED = 2;
        Queueable.RESUMED = 3;
        Queueable.DONE = 4;
        Queueable.FAILED = 5;
        Queueable.DESTROYED = 8;

        Basic.inherit(Queueable, Parent);

        Basic.extend(Queueable.prototype, {

            start: function() {
                if (this.state === Queueable.PROCESSING) {
                    return false;
                }

                if (this.getOption('pause_before_start') && this.state === Queueable.IDLE) {
                    this.state = Queueable.PROCESSING;
                    this.pause();
                    Basic.delay.call(this, function() {
                        if (this.trigger('beforestart')) {
                            this.resume();
                        }
                    });
                    return false;
                } else {
                    this.state = Queueable.PROCESSING;
                    this.trigger('started');
                }

                return true;
            },


            pause: function() {
                if (this.state === Queueable.PROCESSING) {
                    this.processed = this.percent = 0; // by default reset all progress
                    this.loaded = this.processed; // for backward compatibility

                    this.state = Queueable.PAUSED;
                    this.trigger('paused');
                    return true;
                } else {
                    return false;
                }
            },


            resume: function() {
                if (this.state === Queueable.PAUSED) {
                    this.state = Queueable.RESUMED;
                    this.trigger('resumed');
                    return true;
                } else {
                    return false;
                }
            },


            stop: function() {
                this.processed = this.percent = 0;
                this.loaded = this.processed; // for backward compatibility

                this.state = Queueable.IDLE;
                this.trigger('stopped');
            },


            done: function(result) {
                this.processed = this.total;
                this.loaded = this.processed; // for backward compatibility
                this.percent = 100;

                this.processedTimestamp = +new Date();

                this.state = Queueable.DONE;
                this.trigger('done', result);
                this.trigger('processed');
            },


            failed: function(result) {
                this.processed = this.percent = 0; // reset the progress
                this.loaded = this.processed; // for backward compatibility

                this.processedTimestamp = +new Date();

                this.state = Queueable.FAILED;
                this.trigger('failed', result);
                this.trigger('processed');
            },


            progress: function(processed, total) {
                if (total) {
                    this.total = total; // is this even required?
                }

                this.processed = Math.min(processed, this.total);
                this.loaded = this.processed; // for backward compatibility
                this.percent = Math.ceil(this.processed / this.total * 100);

                this.trigger({
                    type: 'progress',
                    loaded: this.processed,
                    total: this.total
                });
            },


            destroy: function() {
                if (this.state === Queueable.DESTROYED) {
                    return; // already destroyed
                }

                this.state = Queueable.DESTROYED;
                this.trigger('destroy');
                this.unbindAll();
            }

        });

        return Queueable;

    }(Optionable));
});
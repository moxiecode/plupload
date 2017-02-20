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
    'moxie/core/utils/Env',
    'moxie/core/utils/Basic',
    'plupload/core/Optionable'
], function(Env, Basic, Optionable) {

    var dispatches = [
        /**
         * Dispatched every time the state of queue changes
         *
         * @event statechanged
         * @param {Object} event
         * @param {Number} state New state
         * @param {Number} prevState Previous state
         */
        'statechanged',


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

            this.startedTimestamp = 0;

            /**
             * Set when item becomes Queueable.DONE or Queueable.FAILED.
             * Used to calculate proper processedPerSec for the queue stats.
             * @property processedTimestamp
             * @type {Number}
             */
            this.processedTimestamp = 0;

            if (MXI_DEBUG) {
                this.bind('StateChanged', function(e, state, oldState) {
                    var self = this;

                    var stateToString = function(code) {
                        switch (code) {
                            case Queueable.IDLE:
                                return 'IDLE';

                            case Queueable.PROCESSING:
                                return 'PROCESSING';

                            case Queueable.PAUSED:
                                return 'PAUSED';

                            case Queueable.RESUMED:
                                return 'RESUMED';

                            case Queueable.DONE:
                                return 'DONE';

                            case Queueable.FAILED:
                                return 'FAILED';

                            case Queueable.DESTROYED:
                                return 'DESTROYED';
                        }
                    };

                    var indent = function() {
                        switch (self.ctorName) {
                            case 'File':
                                return "\t".repeat(2);

                            case 'QueueUpload':
                            case 'QueueResize':
                                return "\t";

                            case 'FileUploader':
                                return "\t".repeat(3);

                            case 'ChunkUploader':
                                return "\t".repeat(4);

                            default:
                                return "\t";
                        }
                    };

                    Env.log("StateChanged:" + indent() + self.ctorName + '::' + self.uid + ' (' + stateToString(oldState) + ' to ' + stateToString(state) + ')');
                }, 999);
            }
        }

        Queueable.IDLE = 1;
        Queueable.PROCESSING = 2;
        Queueable.PAUSED = 6;
        Queueable.RESUMED = 7;
        Queueable.DONE = 5;
        Queueable.FAILED = 4;
        Queueable.DESTROYED = 8;

        Basic.inherit(Queueable, Parent);

        Basic.extend(Queueable.prototype, {

            start: function() {
                var prevState = this.state;

                if (this.state === Queueable.PROCESSING) {
                    return false;
                }

                if (!this.startedTimestamp) {
                    this.startedTimestamp = +new Date();
                }

                if (this.state === Queueable.IDLE) {
                    this.state = Queueable.PROCESSING;
                    this.trigger('statechanged', this.state, prevState);
                    this.pause();
                    Basic.delay.call(this, function() {
                        if (this.trigger('beforestart')) {
                            this.resume();
                        }
                    });
                    return false;
                } else {
                    this.state = Queueable.PROCESSING;
                    this.trigger('statechanged', this.state, prevState);
                    this.trigger('started');
                }

                return true;
            },


            pause: function() {
                var prevState = this.state;

                if (this.state === Queueable.PAUSED) {
                    return false;
                }

                this.processed = this.percent = 0; // by default reset all progress
                this.loaded = this.processed; // for backward compatibility

                this.state = Queueable.PAUSED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('paused');
                return true;
            },


            resume: function() {
                var prevState = this.state;

                if (this.state !== Queueable.PAUSED) {
                    return false;
                }

                this.trigger('statechanged', this.state, prevState);
                this.state = Queueable.RESUMED;
                this.trigger('resumed');
                return true;
            },


            stop: function() {
                var prevState = this.state;

                if (this.state === Queueable.IDLE) {
                    return false;
                }

                this.processed = this.percent = 0;
                this.loaded = this.processed; // for backward compatibility

                this.startedTimestamp = 0;

                this.state = Queueable.IDLE;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('stopped');
                return true;
            },


            done: function(result) {
                var prevState = this.state;

                if (this.state === Queueable.DONE) {
                    return false;
                }

                this.processed = this.total;
                this.loaded = this.processed; // for backward compatibility
                this.percent = 100;

                this.processedTimestamp = +new Date();

                this.state = Queueable.DONE;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('done', result);
                this.trigger('processed');
                return true;
            },


            failed: function(result) {
                var prevState = this.state;

                if (this.state === Queueable.FAILED) {
                    return false;
                }

                this.processed = this.percent = 0; // reset the progress
                this.loaded = this.processed; // for backward compatibility

                this.processedTimestamp = +new Date();

                this.state = Queueable.FAILED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('failed', result);
                this.trigger('processed');
                return true;
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
                var prevState = this.state;

                if (this.state === Queueable.DESTROYED) {
                    return false; // already destroyed
                }

                this.state = Queueable.DESTROYED;
                this.trigger('statechanged', this.state, prevState);
                this.trigger('destroy');
                this.unbindAll();
                return true;
            }

        });

        return Queueable;

    }(Optionable));
});
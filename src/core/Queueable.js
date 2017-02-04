/**
 * Queueable.js
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


    return (function(Parent) {
        Basic.inherit(Queueable, Parent);


        function Queueable() {
            Parent.apply(this, arguments);
        }


        Queueable.IDLE = 0;
        Queueable.PROCESSING = 1;
        Queueable.PAUSED = 2;
        Queueable.RESUMED = 3;
        Queueable.DONE = 4;
        Queueable.FAILED = 5;
        Queueable.DESTROYED = 8;


        Basic.extend(Queueable.prototype, {

            uid: Basic.guid(),

            state: Queueable.IDLE,

            processed: 0,

            total: 0,

            percent: 0,

            retries: 0,


            start: function() {
                this.state = Queueable.PROCESSING;
                this.trigger('started');
            },


            pause: function() {
                this.processed = this.percent = 0; // by default reset all progress
                this.loaded = this.processed; // for backward compatibility

                this.state = Queueable.PAUSED;
                this.trigger('paused');
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

                this.state = Queueable.DONE;
                this.trigger('done', result);
                this.trigger('processed');
            },


            failed: function(result) {
                this.processed = this.percent = 0; // reset the progress
                this.loaded = this.processed; // for backward compatibility

                this.state = Queueable.FAILED;
                this.trigger('failed', result);
                this.trigger('processed');
            },


            progress: function(processed, total) {
                if (total) {
                    this.total = total;
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
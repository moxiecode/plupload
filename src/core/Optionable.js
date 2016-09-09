/**
 * Optionable.js
 *
 * Copyright 2015, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload.core.Optionable
@private
@since 3.0
*/
define('plupload/core/Optionable', [
    'moxie/core/utils/Basic',
    'moxie/core/EventTarget'
], function(Basic, EventTarget) {

    var dispatches = [

        'OptionChanged'
    ];

    return (function(Parent) {
        Basic.inherit(Optionable, Parent);

        /**
         * @class Optionable
         * @constructor
         * @extends EventTarget
         */
        function Optionable() {
            Parent.apply(this, arguments);
            
            this.uid = Basic.guid();
            this._options = {};
        }


        Basic.extend(Optionable.prototype, {

            uid: Basic.guid(),


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

                oldValue = self._options[option];
                self._options[option] = value;

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
                    return this._options;
                }
                return this._options[option];
            },


            /**
            Set many options as once.

            @method setOptions
            @param {Object} options
            */
            setOptions: function(options) {
                if (typeof(options) !== 'object') {
                    return;
                }
                this.setOption(options);
            },


            /**
            Gets all options.

            @method getOptions
            @return {Object}
            */
            getOptions: function() {
                return this.getOption();
            }
        }); 

        return Optionable;

    }(EventTarget));

});
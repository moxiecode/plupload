/**
 * Optionable.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
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
        /**
         * Dispatched when option is being changed.
         *
         * @event OptionChanged
         * @param {Object} event
         * @param {String} name Name of the option being changed
         * @param {Mixed} value
         * @param {Mixed} oldValue
         */
        'OptionChanged'
    ];

    return (function(Parent) {

        /**
         * @class Optionable
         * @constructor
         * @extends EventTarget
         */
        function Optionable() {
            Parent.apply(this, arguments);

            this._options = {};
        }

        Basic.inherit(Optionable, Parent);

        Basic.extend(Optionable.prototype, {
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

                var value = this._options[option];
                if (Basic.inArray(Basic.typeOf(value), ['array', 'object']) > -1) {
                    return Basic.extendImmutable({}, value);
                } else {
                    return value;
                }
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
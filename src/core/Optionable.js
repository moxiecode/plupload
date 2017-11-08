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
    'plupload'
], function(plupload) {
    var EventTarget = plupload.EventTarget;

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

        plupload.inherit(Optionable, Parent);

        plupload.extend(Optionable.prototype, {
            /**
             * Set the value for the specified option(s).
             *
             * @method setOption
             * @since 2.1
             * @param {String|Object} option Name of the option to change or the set of key/value pairs
             * @param {Mixed} [value] Value for the option (is ignored, if first argument is object)
             * @param {Boolean} [mustBeDefined] if truthy, any option that is not in defaults will be ignored
             */
            setOption: function(option, value, mustBeDefined) {
                var self = this;
                var oldValue;

                if (typeof(option) === 'object') {
                    mustBeDefined = value;
                    plupload.each(option, function(value, option) {
                        self.setOption(option, value, mustBeDefined);
                    });
                    return;
                }

                if (mustBeDefined && !self._options.hasOwnProperty(option)) {
                    return;
                }

                oldValue = plupload.clone(self._options[option]);

                //! basically if an option is of type object extend it rather than replace
                if (plupload.typeOf(value) === 'object' && plupload.typeOf(self._options[option]) === 'object') {
                     // having some options as objects was a bad idea, prefixes is the way
                    plupload.extend(self._options[option], value);
                } else {
                    self._options[option] = value;
                }

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
                if (plupload.inArray(plupload.typeOf(value), ['array', 'object']) > -1) {
                    return plupload.extendImmutable({}, value);
                } else {
                    return value;
                }
            },


            /**
             * Set many options as once.
             *
             * @method setOptions
             * @param {Object} options
             * @param {Boolean} [mustBeDefined] if truthy, any option that is not in defaults will be ignored
             */
            setOptions: function(options, mustBeDefined) {
                if (typeof(options) !== 'object') {
                    return;
                }
                this.setOption(options, mustBeDefined);
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
/**
 * Extra.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
@class moxie/core/utils/Extra
@private
@static
*/

define("moxie/core/utils/Extra", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Env"
], function(o, Env) {
	/**
	Defines property with specified descriptor on an object
	
	@method defineProperty
	@static
	@param {Object} obj Object to add property to
	@param {String} prop Property name
	@param {Object} desc Set of key-value pairs defining descriptor for the property
	*/
	var defineProperty = function(obj, prop, desc)
	{
		if (o.typeOf(desc) === 'object') {
			defineGSetter.call(obj, prop, desc, 'get');

			if (!Object.defineProperty) {
				// additionally call it for setter
				defineGSetter.call(obj, prop, desc, 'set');
			}
		}
	};

	/**
	Defines getter for the property
	
	@method defineGetter
	@static
	@param {Object} obj Object to add property to
	@param {String} prop Property name
	@param {Object} desc Set of key-value pairs defining descriptor for the property
	*/
	var defineGetter = function(obj, prop, desc) {
		return defineGSetter.call(obj, prop, desc, 'get');
	};

	/**
	Defines setter for the property
	
	@method defineSetter
	@static
	@param {Object} obj Object to add property to
	@param {String} prop Property name
	@param {Object} desc Set of key-value pairs defining descriptor for the property
	*/
	var defineSetter = function(obj, prop, desc) {
		return defineGSetter.call(obj, prop, desc, 'set');
	};

	/**
	Defines getter or setter, depending on a type param
	
	@method defineGSetter
	@static
	@private
	@param {String} prop Property name
	@param {Object} desc Set of key-value pairs defining descriptor for the property
	@param {String} type Can take value of 'set' or 'get'
	*/
	var defineGSetter = function(prop, desc, type) {
		var defaults = {
			enumerable: true,
			configurable: true
		}
		, fn
		, camelType
		, self = this
		;

		type = type.toLowerCase();
		camelType = type.replace(/^[gs]/, function($1) { return $1.toUpperCase(); });

		// define function object for fallback
		if (o.typeOf(desc) === 'function') {
			fn = desc;
			desc = {};
			desc[type] = fn;
		} else if (o.typeOf(desc[type]) === 'function') {
			fn = desc[type];
		} else {
			return;
		}

		if (Env.can('define_property')) {
			if (Object.defineProperty) {
				return Object.defineProperty(this, prop, o.extend({}, defaults, desc));
			} else {
				return self['__define' + camelType + 'ter__'](prop, fn);
			}
		}
	};

	return {
		defineGetter: defineGetter,
		defineSetter: defineSetter,
		defineProperty: defineProperty
	};
});

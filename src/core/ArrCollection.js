/**
 * ArrCollection.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
@contsructor
@class plupload.core.ArrCollection
@private
*/
define('plupload/core/ArrCollection', [
    'moxie/core/utils/Basic'
], function(Basic) {

    var ArrCollection = function() {
        var _registry = [];

        Basic.extend(this, {

            count: function() {
                return _registry.length;
            },

            hasKey: function(key) {
                return this.getIdx(key) > -1;
            },


            get: function(key) {
                var idx = this.getIdx(key);
                return idx > -1 ? _registry[idx] : null;
            },

            getIdx: function(key) {
                for (var i = 0, length = _registry.length; i < length; i++) {
                    if (_registry[i].uid === key) {
                        return i;
                    }
                }
                return -1;
            },

            getByIdx: function(idx) {
                return _registry[idx]
            },

            first: function() {
                return _registry[0];
            },

            last: function() {
                return _registry[_registry.length - 1];
            },

            add: function(obj) {
                obj = arguments[1] || obj; // make it compatible with Collection.add()

                var idx = this.getIdx(obj.uid);
                if (idx > -1) {
                    _registry[idx] = obj;
                    return idx;
                }

                _registry.push(obj);
                return _registry.length - 1;
            },

            remove: function(key) {
                return !!this.extract(key);
            },

            splice: function(start, length) {
                start = Basic.typeOf(start) === 'undefinded' ? 0 : Math.max(start, 0);
                length = Basic.typeOf(length) !== 'undefinded' && start + length < _registry.length ? length : _registry.length - start;

                return _registry.splice(start, length);
            },

            extract: function(key) {
                var idx = this.getIdx(key);
                if (idx > -1) {
                    return _registry.splice(idx, 1);
                }
                return null;
            },

            shift: function() {
                return _registry.shift();
            },

            update: function(key, obj) {
                var idx = this.getIdx(key);
                if (idx > -1) {
                    _registry[idx] = obj;
                    return true;
                }
                return false;
            },

            each: function(cb) {
                Basic.each(_registry, cb);
            },

            combineWith: function() {
                return Array.prototype.concat.apply(this.toArray(), arguments);
            },

            sort: function(cb) {
                _registry.sort(cb || function(a, b) {
                    return a.priority - b.priority;
                });
            },

            clear: function() {
                _registry = [];
            },

            toObject: function() {
                var obj = {};
                for (var i = 0, length = _registry.length; i < length; i++) {
                    obj[_registry[i].uid] = _registry[i];
                }
                return obj;
            },

            toArray: function() {
                return Array.prototype.slice.call(_registry);
            }
        });
    };

    return ArrCollection;
});
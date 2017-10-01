/**
 * Collection.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */


/**
Helper collection class - in a way a mix of object and array

@contsructor
@class plupload.core.Collection
@private
*/
define('plupload/core/Collection', [
    'plupload'
], function(Basic) {

    var Collection = function() {
        var _registry = {};
        var _length = 0;
        var _last;


        plupload.extend(this, {

            count: function() {
                return _length;
            },

            hasKey: function(key) {
                return _registry.hasOwnProperty(key)
            },


            get: function(key) {
                return _registry[key];
            },


            first: function() {
                for (var key in _registry) {
                    return _registry[key];
                }
            },


            last: function() {
                return _last;
            },


            toObject: function() {
                return _registry;
            },


            add: function(key, obj) {
                var self = this;

                if (typeof(key) === 'object' && !obj) {
                    return plupload.each(key, function(obj, key) {
                        self.add(key, obj);
                    });
                }

                if (_registry.hasOwnProperty(key)) {
                    return self.update.apply(self, arguments);
                }

                _registry[key] = _last = obj;
                _length++;
            },


            remove: function(key) {
                if (this.hasKey(key)) {
                    var last = _registry[key];

                    delete _registry[key];
                    _length--;

                    // renew ref to the last added item if necessary
                    if (_last === last) {
                        _last = findLast();
                    }
                }
            },


            extract: function(key) {
                var item = this.get(key);
                this.remove(key);
                return item;
            },


            shift: function() {
                var self = this,
                    first, key;

                for (key in _registry) {
                    first = _registry[key];
                    self.remove(key);
                    return first;
                }
            },


            update: function(key, obj) {
                _registry[key] = obj;
            },


            each: function(cb) {
                plupload.each(_registry, cb);
            },


            combineWith: function() {
                var newCol = new Collection();

                newCol.add(_registry);

                plupload.each(arguments, function(col) {
                    if (col instanceof Collection) {
                        newCol.add(col.toObject());
                    }
                });
                return newCol;
            },


            clear: function() {
                _registry = {};
                _last = null;
                _length = 0;
            }
        });


        function findLast() {
            var key;
            for (key in _registry) {}
            return _registry[key];
        }

    };

    return Collection;
});
/**
 * File.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.se.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 * @class plupload.File
 * @extends plupload.core.Queueable
 * @constructor
 * @since 3.0
 * @final
 */
define('plupload/File', [
    'plupload',
    'plupload/core/Queueable',
    'plupload/FileUploader',
    'plupload/ImageResizer'
], function(plupload, Queueable, FileUploader, ImageResizer) {


    function File(fileRef, queueUpload, queueResize) {
        var _file = fileRef;

        Queueable.call(this);

        plupload.extend(this, {
            /**
             * For backward compatibility
             *
             * @property id
             * @type {String}
             * @deprecated
             */
            id: this.uid,


            /**
             When send_file_name is set to true, will be sent with the request as `name` param.
             Can be used on server-side to override original file name.

             @property name
             @type {String}
             */
            name: _file.name,

            /**
             @property target_name
             @type {String}
             @deprecated use name
             */
            target_name: null,

            /**
             * File type, `e.g image/jpeg`
             *
             * @property type
             * @type String
             */
            type: _file.type,

            /**
             * File size in bytes (may change after client-side manupilation).
             *
             * @property size
             * @type Number
             */
            size: _file.size,

            /**
             * Original file size in bytes.
             *
             * @property origSize
             * @type Number
             */
            origSize: _file.size,


            start: function() {
                if (!File.prototype.start.call(this)) {
                    return false;
                }

                if (!plupload.isEmptyObj(this._options.resize) && isImage(this.type) && runtimeCan(_file, 'send_binary_string')) {
                    this.resizeAndUpload();
                } else {
                    this.upload();
                }
            },

            /**
             * Get the file for which this File is responsible
             *
             * @method getSource
             * @returns {moxie.file.File}
             */
            getSource: function() {
                return _file;
            },

            /**
             * Returns file representation of the current runtime. For HTML5 runtime
             * this is going to be native browser File object
             * (for backward compatibility)
             *
             * @method getNative
             * @deprecated
             * @returns {File|Blob|Object}
             */
            getNative: function() {
                return this.getFile().getSource();
            },


            resizeAndUpload: function() {
                var self = this;
                var rszr = new ImageResizer(_file);

                rszr.bind('progress', function(e) {
                    self.progress(e.loaded, e.total);
                });

                rszr.bind('done', function(e, file) {
                    _file = file;
                    self.upload();
                });

                rszr.bind('failed', function() {
                    self.upload();
                });

                queueResize.addItem(rszr);
            },


            upload: function() {
                var self = this;
                var up = new FileUploader(_file, queueUpload);

                up.bind('beforestart', function() {
                    return self.trigger('beforeupload');
                });

                up.bind('resumed', function() {
                    this.start();
                });

                up.bind('started', function() {
                    self.trigger('startupload');
                });

                up.bind('progress', function(e) {
                    self.progress(e.loaded, e.total);
                });

                up.bind('done', function(e, result) {
                    self.done(result);
                });

                up.bind('failed', function(e, result) {
                    self.failed(result);
                });

                up.setOptions(self.getOptions());
                up.start();
            },



            destroy: function() {
                File.prototype.destroy.call(this);
                _file = null;
            }
        });
    }


    function isImage(type) {
        return plupload.inArray(type, ['image/jpeg', 'image/png']) > -1;
    }


    function runtimeCan(blob, cap) {
        if (blob.ruid) {
            var info = plupload.Runtime.getInfo(blob.ruid);
            if (info) {
                return info.can(cap);
            }
        }
        return false;
    }


    plupload.inherit(File, Queueable);

    return File;
});
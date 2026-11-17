/**
 * File.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define('moxie/file/File', [
	'moxie/core/utils/Basic',
	'moxie/core/utils/Mime',
	'moxie/file/Blob'
], function(Basic, Mime, Blob) {
	/**
	@class moxie/file/File
	@extends Blob
	@constructor
	@param {String} ruid Unique id of the runtime, to which this blob belongs to
	@param {Object} file Object "Native" file object, as it is represented in the runtime
	*/
	function File(ruid, file) {
		if (!file) { // avoid extra errors in case we overlooked something
			file = {};
		}

		Blob.apply(this, arguments);

		if (!this.type) {
			this.type = Mime.getFileMime(file.name);
		}

		// sanitize file name or generate new one
		var name;
		if (file.name) {
			name = file.name.replace(/\\/g, '/');
			name = name.substr(name.lastIndexOf('/') + 1);
		} else if (this.type) {
			var prefix = this.type.split('/')[0];
			name = Basic.guid((prefix !== '' ? prefix : 'file') + '_');
			
			if (Mime.extensions[this.type]) {
				name += '.' + Mime.extensions[this.type][0]; // append proper extension if possible
			}
		}
		
		
		Basic.extend(this, {
			/**
			File name

			@property name
			@type {String}
			@default UID
			*/
			name: name || Basic.guid('file_'),

			/**
			Relative path to the file inside a directory

			@property relativePath
			@type {String}
			@default ''
			*/
			relativePath: '',
			
			/**
			Date of last modification

			@property lastModifiedDate
			@type {String}
			@default now
			*/
			lastModifiedDate: file.lastModifiedDate || (new Date()).toLocaleString() // Thu Aug 23 2012 19:40:00 GMT+0400 (GET)
		});
	}

	File.prototype = Blob.prototype;

	return File;
});
/**
 * Plupload - multi-runtime File Uploader
 * v3.1.1
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 *
 * Date: 2017-10-03
 */
;var MXI_DEBUG = true;
/**
 * Inline development version. Only to be used while developing since it uses document.write to load scripts.
 */

/*jshint smarttabs:true, undef:true, latedef:true, curly:true, bitwise:true, camelcase:true */
/*globals $code */

(function(exports) {
	"use strict";

	var html = "", baseDir;
	var modules = {}, exposedModules = [], moduleCount = 0;

	var scripts = document.getElementsByTagName('script');
	for (var i = 0; i < scripts.length; i++) {
		var src = scripts[i].src;

		if (src.indexOf('/plupload.dev.js') != -1) {
			baseDir = src.substring(0, src.lastIndexOf('/'));
		}
	}

	function require(ids, callback) {
		var module, defs = [];

		for (var i = 0; i < ids.length; ++i) {
			module = modules[ids[i]] || resolve(ids[i]);
			if (!module) {
				throw 'module definition dependecy not found: ' + ids[i];
			}

			defs.push(module);
		}

		callback.apply(null, defs);
	}

	function resolve(id) {
		var target = exports;
		var fragments = id.split(/[.\/]/);

		for (var fi = 0; fi < fragments.length; ++fi) {
			if (!target[fragments[fi]]) {
				return;
			}

			target = target[fragments[fi]];
		}

		return target;
	}

	function register(id) {
		var target = exports;
		var fragments = id.split(/[.\/]/);

		for (var fi = 0; fi < fragments.length - 1; ++fi) {
			if (target[fragments[fi]] === undefined) {
				target[fragments[fi]] = {};
			}

			target = target[fragments[fi]];
		}

		target[fragments[fragments.length - 1]] = modules[id];
	}

	function define(id, dependencies, definition) {
		if (typeof id !== 'string') {
			throw 'invalid module definition, module id must be defined and be a string';
		}

		if (dependencies === undefined) {
			throw 'invalid module definition, dependencies must be specified';
		}

		if (definition === undefined) {
			throw 'invalid module definition, definition function must be specified';
		}

		require(dependencies, function() {
			modules[id] = definition.apply(null, arguments);
		});

		if (--moduleCount === 0) {
			for (var i = 0; i < exposedModules.length; i++) {
				register(exposedModules[i]);
			}
		}
	}

	function defined(id) {
		return !!modules[id];
	}

	function expose(ids) {
		exposedModules = ids;
	}

	function writeScripts() {
		document.write(html);
	}

	function load(path) {
		html += '<script type="text/javascript" src="' + baseDir + '/' + path + '"></script>\n';
		moduleCount++;
	}

	// Expose globally
	exports.define = define;
	exports.defined = defined;
	exports.require = require;

	expose(["moxie/core/utils/Basic","moxie/core/utils/Env","moxie/core/utils/Dom","moxie/core/utils/Events","moxie/core/utils/Url","moxie/core/I18n","moxie/core/utils/Mime","moxie/core/Exceptions","moxie/core/EventTarget","moxie/file/BlobRef","moxie/file/FileRef","moxie/file/FileInput","moxie/file/FileDrop","plupload","plupload/core/Collection","plupload/core/ArrCollection","plupload/core/Optionable","plupload/core/Queueable","plupload/core/Stats","plupload/core/Queue","plupload/QueueUpload","plupload/QueueResize","plupload/ChunkUploader","plupload/FileUploader","plupload/ImageResizer","plupload/File","plupload/Uploader"]);

	load('../src/moxie/src/javascript/core/utils/Basic.js');
	load('../src/moxie/src/javascript/core/utils/Env.js');
	load('../src/moxie/src/javascript/core/utils/Dom.js');
	load('../src/moxie/src/javascript/core/utils/Events.js');
	load('../src/moxie/src/javascript/core/utils/Url.js');
	load('../src/moxie/src/javascript/core/I18n.js');
	load('../src/moxie/src/javascript/core/utils/Mime.js');
	load('../src/moxie/src/javascript/core/Exceptions.js');
	load('../src/moxie/src/javascript/core/EventTarget.js');
	load('../src/moxie/src/javascript/file/BlobRef.js');
	load('../src/moxie/src/javascript/file/FileRef.js');
	load('../src/moxie/src/javascript/file/FileInput.js');
	load('../src/moxie/src/javascript/file/FileDrop.js');
	load('../src/plupload.js');
	load('../src/core/Collection.js');
	load('../src/core/ArrCollection.js');
	load('../src/core/Optionable.js');
	load('../src/core/Queueable.js');
	load('../src/core/Stats.js');
	load('../src/core/Queue.js');
	load('../src/QueueUpload.js');
	load('../src/QueueResize.js');
	load('../src/ChunkUploader.js');
	load('../src/FileUploader.js');
	load('../src/ImageResizer.js');
	load('../src/File.js');
	load('../src/Uploader.js');

	writeScripts();
})(this);

// $hash: e179384f23da62b23be51e9e6110634f
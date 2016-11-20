/**
 * FileUploader.js
 *
 * Copyright 2015, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

/**
 * @class plupload.FileUploader
 * @extends plupload.core.Queueable
 * @constructor
 * @since 3.0
 * @final
 */
define('plupload/FileUploader', [
	'moxie/core/utils/Basic',
	'plupload/core/Collection',
	'plupload/core/Queueable',
	'plupload/ChunkUploader'
], function(Basic, Collection, Queueable, ChunkUploader) {


	function FileUploader(fileRef, queue) {
		var _file = fileRef;
		var _chunks = new Collection();
		var _totalChunks = 1;

		Queueable.call(this);

		this._options = {
			url: false,
			chunk_size: 0,
			multipart: true,
			http_method: 'POST',
			params: {},
			headers: false,
			file_data_name: 'file',
			send_file_name: true,
			stop_on_fail: true
		};

		Basic.extend(this, {

			/**
			Unique identifier

			@property uid
			@type {String}
            */
			uid: Basic.guid(),

			/**
			When send_file_name is set to true, will be sent with the request as `name` param.
            Can be used on server-side to override original file name.

            @property name
			@type {String}
            */
			name: _file.name,


			start: function(options) {
				var self = this;
				var up;

				this.setOptions(options);

				FileUploader.prototype.start.call(self);

				// send additional 'name' parameter only if required or explicitly requested
				if (self._options.send_file_name) {
					self._options.params.name = self.target_name || self.name;
				}

				if (self._options.chunk_size) {
					_totalChunks = Math.ceil(_file.size / self._options.chunk_size);
					self.uploadChunk(false, false, true);
				} else {
					up = new ChunkUploader(_file, self._options);

					up.bind('progress', function(e) {
						self.progress(e.loaded, e.total);
					});

					up.bind('done', function(e, result) {
						self.done(result);
					});

					up.bind('failed', function(e, result) {
						self.failed(result);
					});

					queue.addItem(up);
				}
			},


			uploadChunk: function(seq, options, dontStop) {
				var self = this;
				var chunkSize = this.getOption('chunk_size');
				var up;
				var chunk = {};
				var _options;

				if (options) {
					// chunk_size cannot be changed on the fly
					delete options.chunk_size;
					Basic.extendImmutable(this._options, options);
				}

				chunk.seq = parseInt(seq, 10) || getNextChunk();
				chunk.start = chunk.seq * chunkSize;
				chunk.end = Math.min(chunk.start + chunkSize, _file.size);
				chunk.total = _file.size;

				// do not proceed for weird chunks
				if (chunk.start < 0 || chunk.start >= _file.size) {
					return false;
				}

				_options = Basic.extendImmutable({}, this.getOptions(), {
					params: {
						chunk: chunk.seq,
						chunks: _totalChunks
					}
				});

				up = new ChunkUploader(_file.slice(chunk.start, chunk.end, _file.type), _options);

				up.bind('progress', function(e) {
					self.progress(calcProcessed() + e.loaded, _file.size);
				});

				up.bind('failed', function(e, result) {
					_chunks.add(chunk.seq, Basic.extend({
						state: Queueable.FAILED
					}, chunk));

					self.trigger('chunkuploadfailed', Basic.extendImmutable({}, chunk, result));

					if (_options.stop_on_fail) {
						self.failed(result);
					}
				});

				up.bind('done', function(e, result) {
					_chunks.add(chunk.seq, Basic.extend({
						state: Queueable.DONE
					}, chunk));

					self.trigger('chunkuploaded', Basic.extendImmutable({}, chunk, result));

					if (calcProcessed() >= _file.size) {
						self.progress(_file.size, _file.size);
						self.done(result); // obviously we are done
					} else if (dontStop) {
						Basic.delay(function() {
							self.uploadChunk(getNextChunk(), false, dontStop);
						});
					}
				});

				up.bind('processed', function() {
					this.destroy();
				});


				_chunks.add(chunk.seq, Basic.extend({
					state: Queueable.PROCESSING
				}, chunk));
				queue.addItem(up);

				// enqueue even more chunks if slots available
				if (dontStop && queue.countSpareSlots()) {
					self.uploadChunk(getNextChunk(), false, dontStop);
				}

				return true;
			},


			setOption: function(option, value) {
				if (typeof(option) !== 'object' && !this._options.hasOwnProperty(option)) {
					return;
				}
				FileUploader.prototype.setOption.apply(this, arguments);
			},


			destroy: function() {
				FileUploader.prototype.destroy.call(this);
				queue = _file = null;
			}
		});


		function calcProcessed() {
			var processed = 0;

			_chunks.each(function(item) {
				if (item.state === Queueable.DONE) {
					processed += (item.end - item.start);
				}
			});

			return processed;
		}


		function getNextChunk() {
			var i = 0;
			while (i < _totalChunks && _chunks.hasKey(i)) {
				i++;
			}
			return i;
		}

	}


	FileUploader.prototype = new Queueable();

	return FileUploader;
});
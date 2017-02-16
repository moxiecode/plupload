/**
 * FileUploader.js
 *
 * Copyright 2017, Ephox
 * Released under AGPLv3 License.se.
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


	function FileUploader(file, queue) {
		var _chunks = new Collection();
		var _totalChunks = 1;

		Queueable.call(this);

		this._options = {
			chunk_size: 0,
			params: {},
			pause_before_start: true,
			send_file_name: true,
			stop_on_fail: true
		};

		Basic.extend(this, {
			/**
			When send_file_name is set to true, will be sent with the request as `name` param.
            Can be used on server-side to override original file name.

            @property name
			@type {String}
            */
			name: file.name,


			start: function() {
				var self = this;
				var up;

				// send additional 'name' parameter only if required or explicitly requested
				if (self._options.send_file_name) {
					self._options.params.name = self.target_name || self.name;
				}

				if (self._options.chunk_size) {
					_totalChunks = Math.ceil(file.size / self._options.chunk_size);
					self.uploadChunk(false, true);
				} else {
					up = new ChunkUploader(file);

					up.bind('progress', function(e) {
						self.progress(e.loaded, e.total);
					});

					up.bind('done', function(e, result) {
						self.done(result);
					});

					up.bind('failed', function(e, result) {
						self.failed(result);
					});

					up.setOptions(self._options);

					queue.addItem(up);
				}

				FileUploader.prototype.start.call(self);
			},


			uploadChunk: function(seq, dontStop) {
				var self = this;
				var chunkSize = this.getOption('chunk_size');
				var up;
				var chunk = {};
				var _options;

				chunk.seq = parseInt(seq, 10) || getNextChunk();
				chunk.start = chunk.seq * chunkSize;
				chunk.end = Math.min(chunk.start + chunkSize, file.size);
				chunk.total = file.size;

				// do not proceed for weird chunks
				if (chunk.start < 0 || chunk.start >= file.size) {
					return false;
				}

				_options = Basic.extendImmutable({}, this.getOptions(), {
					params: {
						chunk: chunk.seq,
						chunks: _totalChunks
					}
				});

				up = new ChunkUploader(file.slice(chunk.start, chunk.end, file.type));

				up.bind('progress', function(e) {
					self.progress(calcProcessed() + e.loaded, file.size);
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

					if (calcProcessed() >= file.size) {
						self.progress(file.size, file.size);
						self.done(result); // obviously we are done
					} else if (dontStop) {
						Basic.delay(function() {
							self.uploadChunk(getNextChunk(), dontStop);
						});
					}
				});

				up.bind('processed', function() {
					this.destroy();
				});

				up.setOptions(_options);

				_chunks.add(chunk.seq, Basic.extend({
					state: Queueable.PROCESSING
				}, chunk));

				queue.addItem(up);

				// enqueue even more chunks if slots available
				if (dontStop && queue.countSpareSlots()) {
					self.uploadChunk(getNextChunk(), dontStop);
				}

				return true;
			},

			destroy: function() {
				FileUploader.prototype.destroy.call(this);
				_chunks.clear();
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
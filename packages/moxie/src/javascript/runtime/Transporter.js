/**
 * Transporter.js
 *
 * Copyright 2013, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

define("moxie/runtime/Transporter", [
	"moxie/core/utils/Basic",
	"moxie/core/utils/Encode",
	"moxie/runtime/RuntimeClient",
	"moxie/core/EventTarget"
], function(Basic, Encode, RuntimeClient, EventTarget) {

	/**
	@class moxie/runtime/Transporter
	@private
	@constructor
	*/
	function Transporter() {
		var mod, _runtime, _data, _size, _pos, _chunk_size;

		RuntimeClient.call(this);

		Basic.extend(this, {
			uid: Basic.guid('uid_'),

			state: Transporter.IDLE,

			result: null,

			transport: function(data, type, options) {
				var self = this;

				options = Basic.extend({
					chunk_size: 204798
				}, options);

				// should divide by three, base64 requires this
				if ((mod = options.chunk_size % 3)) {
					options.chunk_size += 3 - mod;
				}

				_chunk_size = options.chunk_size;

				_reset.call(this);
				_data = data;
				_size = data.length;

				if (Basic.typeOf(options) === 'string' || options.ruid) {
					_run.call(self, type, this.connectRuntime(options));
				} else {
					// we require this to run only once
					var cb = function(e, runtime) {
						self.unbind("RuntimeInit", cb);
						_run.call(self, type, runtime);
					};
					this.bind("RuntimeInit", cb);
					this.connectRuntime(options);
				}
			},

			abort: function() {
				var self = this;

				self.state = Transporter.IDLE;
				if (_runtime) {
					_runtime.exec.call(self, 'Transporter', 'clear');
					self.trigger("TransportingAborted");
				}

				_reset.call(self);
			},


			destroy: function() {
				this.unbindAll();
				_runtime = null;
				this.disconnectRuntime();
				_reset.call(this);
			}
		});

		function _reset() {
			_size = _pos = 0;
			_data = this.result = null;
		}

		function _run(type, runtime) {
			var self = this;

			_runtime = runtime;

			//self.unbind("RuntimeInit");

			self.bind("TransportingProgress", function(e) {
				_pos = e.loaded;

				if (_pos < _size && Basic.inArray(self.state, [Transporter.IDLE, Transporter.DONE]) === -1) {
					_transport.call(self);
				}
			}, 999);

			self.bind("TransportingComplete", function() {
				_pos = _size;
				self.state = Transporter.DONE;
				_data = null; // clean a bit
				self.result = _runtime.exec.call(self, 'Transporter', 'getAsBlob', type || '');
			}, 999);

			self.state = Transporter.BUSY;
			self.trigger("TransportingStarted");
			_transport.call(self);
		}

		function _transport() {
			var self = this,
				chunk,
				bytesLeft = _size - _pos;

			if (_chunk_size > bytesLeft) {
				_chunk_size = bytesLeft;
			}

			chunk = Encode.btoa(_data.substr(_pos, _chunk_size));
			_runtime.exec.call(self, 'Transporter', 'receive', chunk, _size);
		}
	}

	Transporter.IDLE = 0;
	Transporter.BUSY = 1;
	Transporter.DONE = 2;

	Transporter.prototype = EventTarget.instance;

	return Transporter;
});
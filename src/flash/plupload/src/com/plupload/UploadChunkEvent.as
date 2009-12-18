/**
 * UploadChunkEvent.as
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.plupload {
	import flash.events.DataEvent;

	/**
	 * This class is used for uploads of chunks.
	 */
	public class UploadChunkEvent extends DataEvent {
		// Private fields
		private var _chunk:int, _chunks:int;

		/**
		 * Chunk complete event name.
		 */
		public static const UPLOAD_CHUNK_COMPLETE_DATA:String = 'uploadchunk';

		/**
		 * Chunk property.
		 */
		public function get chunk():int {
			return this._chunk;
		}

		/**
		 * Chunks property.
		 */
		public function get chunks():int {
			return this._chunks;
		}

		/**
		 * Main constructor for the UploadChunkEvent.
		 *
		 * @param	type
		 * @param	bubbles
		 * @param	cancelable
		 * @param	data
		 * @param	chunk
		 * @param	chunks
		 */
		function UploadChunkEvent(type:String, bubbles:Boolean, cancelable:Boolean, data:String, chunk:int, chunks:int) {
			super(type, bubbles, cancelable, data);
			this._chunk = chunk;
			this._chunks = chunks;
		}
	}
}
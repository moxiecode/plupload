/**
 * File.as
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.plupload {
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.DisplayObject;
	import flash.display.Stage;
	import flash.events.EventDispatcher;
	import flash.geom.Rectangle;
	import flash.geom.Matrix;
	import flash.net.FileReference;
	import flash.events.Event;
	import flash.events.IOErrorEvent;
	import flash.events.HTTPStatusEvent;
	import flash.events.ProgressEvent;
	import flash.events.SecurityErrorEvent;
	import flash.events.DataEvent;
	import flash.net.FileReferenceList;
	import flash.net.URLLoader;
	import flash.net.URLRequest;
	import flash.net.URLRequestHeader;
	import flash.net.URLRequestMethod;
	import flash.net.URLStream;
	import flash.net.URLVariables;
	import flash.utils.ByteArray;
	import flash.external.ExternalInterface;
	import flash.utils.setTimeout;
	import mx.graphics.codec.JPEGEncoder;

	/**
	 * Container class for file references, this handles upload logic for individual files.
	 */
	public class File extends EventDispatcher {
		// Private fields
		private var _fileRef:FileReference, _cancelled:Boolean;
		private var _uploadUrl:String, _uploadPath:String;
		private var _chunk:int, _chunks:int, _chunkSize:int;
		private var _id:String, _fileName:String, _size:uint, _imageData:ByteArray;

		/**
		 * Id property of file.
		 */
		public function get id():String {
			return this._id;
		}

		/**
		 * File name for the file.
		 */
		public function get fileName():String {
			return this._fileName;
		}

		/**
		 * File name for the file.
		 */
		public function set fileName(value:String):void {
			this._fileName = value;
		}

		/**
		 * File size property.
		 */
		public function get size():int {
			return this._size;
		}

		/**
		 * Constructs a new file object.
		 *
		 * @param id Unique indentifier for the file.
		 * @param file_ref File reference for the selected file.
		 */
		public function File(id:String, file_ref:FileReference) {
			this._id = id;
			this._fileRef = file_ref;
			this._size = file_ref.size;
			this._fileName = file_ref.name;
		}

		/**
		 * Uploads a the file to the specified url. This method will upload it as a normal
		 * multipart file upload if the file size is smaller than the chunk size. But if the file is to
		 * large it will be chunked into multiple requests.
		 *
		 * @param url Url to upload the file to.
		 * @param chunk_size Chunk size to use.
		 * @param width Image width to scale down to.
		 * @param height Image height to scale down to.
		 */
		public function upload(url:String, chunk_size:int, width:int, height:int, quality:int):void {
			var file:File = this;

			// Setup internal vars
			this._uploadUrl = url;
			this._chunkSize = chunk_size;
			this._chunk = 0;
			this._chunks = Math.ceil(this._fileRef.size / chunk_size);
			this._cancelled = false;

			// Force at least 4 chunks to fake progress
			if (this._chunks < 4) {
				this._chunkSize = Math.ceil(this._fileRef.size / 4);
				this._chunks = 4;
			}

			// When file is loaded start uploading
			this._fileRef.addEventListener(Event.COMPLETE, function(e:Event):void {
				var loader:flash.display.Loader;

				// Load JPEG file and scale it down if needed
				if (width || height) {
					loader = new flash.display.Loader();
					loader.contentLoaderInfo.addEventListener(Event.COMPLETE, function(e:Event):void {
						var loadedBitmapData:BitmapData = Bitmap(e.target.content).bitmapData;
						var matrix:Matrix = new Matrix();

						// Setup scale matrix
						matrix.scale(width / loadedBitmapData.width, height / loadedBitmapData.height);

						// Draw loaded bitmap into scaled down bitmap
						var outputBitmapData:BitmapData = new BitmapData(width, height);
						outputBitmapData.draw(loadedBitmapData, matrix);

						// Encode bitmap as JPEG
						var encoder:JPEGEncoder = new JPEGEncoder(quality);
						file._imageData = encoder.encode(outputBitmapData);
						file._imageData.position = 0;
						file._size = file._imageData.length;

						// Start uploading the scaled down image
						uploadNextChunk();
					});

					loader.loadBytes(file._fileRef.data);
				} else
					uploadNextChunk();
			});

			// File load IO error
			this._fileRef.addEventListener(IOErrorEvent.IO_ERROR, function(e:Event):void {
				this.dispatchEvent(e);
			});

			// Start loading local file
			this._fileRef.load();

			// Only one chunk, then do a normal upload
			// * * This was removed since Flash is to buggy when it comes to upload requests
			/*if (this._chunks == 1) {
				var req:URLRequest, data:URLVariables, k:String;

				// Setup request
				req = new URLRequest(this._uploadUrl);
				req.method = URLRequestMethod.POST;

				// Setup post arguments if there are any
				if (post_args != null) {
					data = new URLVariables();

					for (k in post_args)
						data[k] = post_args[k];

					req.data = data;
				}

				// Delegate progress event
				this._fileRef.addEventListener(ProgressEvent.PROGRESS, function(e:ProgressEvent):void {
					dispatchEvent(e);
				});

				// Delegate file upload complete event
				this._fileRef.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, function(e:DataEvent):void {
					dispatchEvent(e);
				});

				// Delegate upload IO error
				this._fileRef.addEventListener(IOErrorEvent.IO_ERROR, function(e:Event):void {
					dispatchEvent(e);
				});

				// Start singe upload
				this._fileRef.upload(req, upload_field);
			}*/
		}

		// Private methods

		/**
		 * Uploads the next chunk or terminates the upload loop if all chunks are done.
		 */
		private function uploadNextChunk():void {
			var req:URLRequest, fileData:ByteArray, chunkData:ByteArray;
			var urlStream:URLStream, url:String, file:File = this;

			// Slice out a chunk
			chunkData = new ByteArray();

			// Use image data if it exists, will exist if the image was resized
			if (this._imageData != null)
				fileData = this._imageData;
			else
				fileData = this._fileRef.data;

			fileData.readBytes(chunkData, 0, fileData.position + this._chunkSize > fileData.length ? fileData.length - fileData.position : this._chunkSize);

			// Setup URL stream
			urlStream = new URLStream();

			// Wait for response and dispatch it
			urlStream.addEventListener(Event.COMPLETE, function(e:Event):void {
				var response:String;

				// Upload is cancelled, then stop everything
				if (file._cancelled)
					return;

				response = urlStream.readUTFBytes(urlStream.bytesAvailable);

				// Fake UPLOAD_COMPLETE_DATA event
				var uploadChunkEvt:UploadChunkEvent = new UploadChunkEvent(
					UploadChunkEvent.UPLOAD_CHUNK_COMPLETE_DATA,
					false,
					false,
					response,
					_chunk,
					_chunks
				);

				dispatchEvent(uploadChunkEvt);

				// Fake progress event since Flash doesn't have a progress event for streaming data up to the server
				var pe:ProgressEvent = new ProgressEvent(ProgressEvent.PROGRESS, false, false, fileData.position, file._size);
				dispatchEvent(pe);

				// Upload next chunk
				if (++_chunk < _chunks)
					uploadNextChunk();
				else {
					// Fake UPLOAD_COMPLETE_DATA event
					var uploadEvt:DataEvent = new DataEvent(
						DataEvent.UPLOAD_COMPLETE_DATA,
						false,
						false,
						response
					);

					dispatchEvent(uploadEvt);
				}

				urlStream.close();
			});

			// Delegate upload IO errors
			urlStream.addEventListener(IOErrorEvent.IO_ERROR, function(e:IOErrorEvent):void {
				this.chunk = this.chunks; // Cancel upload of all remaining chunks
				dispatchEvent(e);
			});

			// Delegate secuirty errors
			urlStream.addEventListener(SecurityErrorEvent.SECURITY_ERROR, function(e:SecurityErrorEvent):void {
				this.chunk = this.chunks; // Cancel upload of all remaining chunks
				dispatchEvent(e);
			});

			// Setup URL
			url = this._uploadUrl;

			if (url.indexOf('?') == -1)
				url += '?';
			else
				url += '&';

			url += "chunk=" + this._chunk + "&chunks=" + this._chunks;

			// Setup request
			req = new URLRequest(url);
			req.method = URLRequestMethod.POST;
			req.data = chunkData;
			req.requestHeaders.push(new URLRequestHeader("Content-Type", "application/octet-stream"));

			// Make request
			urlStream.load(req);
		}

		/**
		 * Cancels the upload of the current file.
		 */
		public function cancelUpload():void {
			this._cancelled = true;
		}
	}
}
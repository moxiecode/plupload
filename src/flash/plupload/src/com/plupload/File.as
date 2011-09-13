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
	import com.formatlos.BitmapDataUnlimited;
	import com.formatlos.events.BitmapDataUnlimitedEvent;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.IBitmapDrawable;
	import flash.events.EventDispatcher;
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
	import com.mxi.image.events.ExifParserEvent;
	
	import com.mxi.image.Image;
	import com.mxi.image.events.ImageEvent;
	
	
	/**
	 * Container class for file references, this handles upload logic for individual files.
	 */
	public class File extends EventDispatcher {
		// Private fields
		private var _fileRef:FileReference, _cancelled:Boolean;
		private var _uploadUrl:String, _uploadPath:String, _mimeType:String;
		private var _id:String, _fileName:String, _size:Number, _imageData:ByteArray;
		private var _multipart:Boolean, _fileDataName:String, _chunking:Boolean, _chunk:int, _chunks:int, _chunkSize:int, _postvars:Object;
		private var _headers:Object, _settings:Object;

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
		public function get size():Number {
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
		 * @param settings Settings object.
		 */
		public function upload(url:String, settings:Object):void {
			this._settings = settings;

			if (this.canUseSimpleUpload(settings)) {
				this.simpleUpload(url, settings);
			} else {
				this.advancedUpload(url, settings);
			}
		}

		// Private methods

		public function canUseSimpleUpload(settings:Object):Boolean {
			var multipart:Boolean = new Boolean(settings["multipart"]);
			var resize:Boolean = (settings["width"] || settings["height"] || settings["quality"]);
			var chunking:Boolean = (settings["chunk_size"] > 0);

			// Check if it's not an image, chunking is disabled, multipart enabled and the ref_upload setting isn't forced
			return (!(/\.(jpeg|jpg|png)$/i.test(this._fileName)) || !resize) && multipart && !chunking && !settings.urlstream_upload && !settings.headers;
		}

		public function simpleUpload(url:String, settings:Object):void {
			var file:File = this, request:URLRequest, postData:URLVariables, fileDataName:String, 
				onProgress:Function, onUploadComplete:Function, onIOError:Function, onSecurityErrorEvent:Function,
				
				removeAllListeners:Function = function () : void {
					file._fileRef.removeEventListener(ProgressEvent.PROGRESS, onProgress);
					file._fileRef.removeEventListener(DataEvent.UPLOAD_COMPLETE_DATA, onUploadComplete);
					file._fileRef.removeEventListener(IOErrorEvent.IO_ERROR, onIOError);
					file._fileRef.removeEventListener(SecurityErrorEvent.SECURITY_ERROR, onSecurityErrorEvent);
				};
			
			file._postvars = settings["multipart_params"];
			file._chunk = 0;
			file._chunks = 1;

			postData = new URLVariables();
	
			file._postvars["name"] = settings["name"];

			for (var key:String in file._postvars) {
				if (key != 'Filename') { // Flash will add it by itself, so we need to omit potential duplicate
					postData[key] = file._postvars[key];
				}
			}

			request = new URLRequest();
			request.method = URLRequestMethod.POST;
			request.url = url;
			request.data = postData;

			fileDataName = new String(settings["file_data_name"]);
			
			onUploadComplete = function(e:DataEvent):void {
				removeAllListeners();
				
				var pe:ProgressEvent = new ProgressEvent(ProgressEvent.PROGRESS, false, false, file._size, file._size);
				dispatchEvent(pe);
				
				// Fake UPLOAD_COMPLETE_DATA event
				var uploadChunkEvt:UploadChunkEvent = new UploadChunkEvent(
					UploadChunkEvent.UPLOAD_CHUNK_COMPLETE_DATA,
					false,
					false,
					e.data,
					file._chunk,
					file._chunks
				);
				
				file._chunk++;
				
				dispatchEvent(uploadChunkEvt);

				dispatchEvent(e);
			};
			file._fileRef.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, onUploadComplete);

			// Delegate upload IO errors
			onIOError = function(e:IOErrorEvent):void {
				removeAllListeners();
				dispatchEvent(e);
			};
			file._fileRef.addEventListener(IOErrorEvent.IO_ERROR, onIOError);

			// Delegate secuirty errors
			onSecurityErrorEvent = function(e:SecurityErrorEvent):void {
				removeAllListeners();
				dispatchEvent(e);
			};
			file._fileRef.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onSecurityErrorEvent);

			// Delegate progress
			onProgress = function(e:ProgressEvent):void {	
				dispatchEvent(e);
			};
			file._fileRef.addEventListener(ProgressEvent.PROGRESS, onProgress);
			
			file._fileRef.upload(request, fileDataName, false);
		}

		public function advancedUpload(url:String, settings:Object):void {
			var file:File = this, width:int, height:int, quality:int, multipart:Boolean, chunking:Boolean, fileDataName:String;
			var chunk:int, chunks:int, chunkSize:int, postvars:Object;
			var onComplete:Function, onIOError:Function,
				removeAllListeneres:Function = function() : void {
					file._fileRef.removeEventListener(Event.COMPLETE, onComplete);
					file._fileRef.removeEventListener(IOErrorEvent.IO_ERROR, onIOError);
				};

			// Setup internal vars
			this._uploadUrl = url;
			this._cancelled = false;
			this._headers = settings.headers;
			this._mimeType = settings.mime;

			multipart = new Boolean(settings["multipart"]);
			fileDataName = new String(settings["file_data_name"]);
			chunkSize = settings["chunk_size"];
			chunking = chunkSize > 0;
			postvars = settings["multipart_params"];
			chunk = 0;

			// When file is loaded start uploading
			onComplete = function(e:Event):void {
				removeAllListeneres();
				
				var startUpload:Function = function() : void
				{
					if (chunking) {
						chunks = Math.ceil(file._size / chunkSize);

						// Force at least 4 chunks to fake progress. We need to fake this since the URLLoader
						// doesn't have a upload progress event and we can't use FileReference.upload since it
						// doesn't support cookies, breaks on HTTPS and doesn't support custom data so client
						// side image resizing will not be possible.
						if (chunks < 4 && file._size > 1024 * 32) {
							chunkSize = Math.ceil(file._size / 4);
							chunks = 4;
						}
					} else {
						// If chunking is disabled then upload file in one huge chunk
						chunkSize = file._size;
						chunks = 1;
					}

					// Start uploading the scaled down image
					file._multipart = multipart;
					file._fileDataName = fileDataName;
					file._chunking = chunking;
					file._chunk = chunk;
					file._chunks = chunks;
					file._chunkSize = chunkSize;
					file._postvars = postvars;

					file.uploadNextChunk();
				}
								
				if (/\.(jpeg|jpg|png)$/i.test(file._fileName) && (settings["width"] || settings["height"] || settings["quality"])) {
					var image:Image = new Image(file._fileRef.data);
					image.addEventListener(ImageEvent.COMPLETE, function(e:ImageEvent) : void 
					{
						image.removeAllEventListeners();
						if (image.imageData) {
							file._imageData = image.imageData;
							file._imageData.position = 0;
							file._size = image.imageData.length;
						}
						startUpload();
					});
					image.addEventListener(ImageEvent.ERROR, function(e:ImageEvent) : void
					{
						image.removeAllEventListeners();
						file.dispatchEvent(e);
					});
					image.addEventListener(ExifParserEvent.EXIF_DATA, function(e:ExifParserEvent) : void
					{
						file.dispatchEvent(e);
					});
					image.addEventListener(ExifParserEvent.GPS_DATA, function(e:ExifParserEvent) : void
					{
						file.dispatchEvent(e);
					});
					image.scale(settings["width"], settings["height"], settings["quality"]);
				} else {
					startUpload();
				}					
			};
			this._fileRef.addEventListener(Event.COMPLETE, onComplete);

			// File load IO error
			onIOError = function(e:Event):void {
				removeAllListeneres();
				this.dispatchEvent(e);
			};
			this._fileRef.addEventListener(IOErrorEvent.IO_ERROR, onIOError);

			// Start loading local file
			this._fileRef.load();
		}

		/**
		 * Uploads the next chunk or terminates the upload loop if all chunks are done.
		 */
		public function uploadNextChunk():Boolean {
			var req:URLRequest, fileData:ByteArray, chunkData:ByteArray;
			var urlStream:URLStream, url:String, file:File = this;

			// All chunks uploaded?
			if (this._chunk >= this._chunks) {
				// Clean up memory
				if(this._fileRef.data) {
					this._fileRef.data.clear();
				}
				this._imageData = null;

				return false;
			}

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

				response = urlStream.readUTFBytes(urlStream.bytesAvailable);

				// Fake UPLOAD_COMPLETE_DATA event
				var uploadChunkEvt:UploadChunkEvent = new UploadChunkEvent(
					UploadChunkEvent.UPLOAD_CHUNK_COMPLETE_DATA,
					false,
					false,
					response,
					file._chunk,
					file._chunks
				);

				file._chunk++;
				dispatchEvent(uploadChunkEvt);

				// Fake progress event since Flash doesn't have a progress event for streaming data up to the server
				var pe:ProgressEvent = new ProgressEvent(ProgressEvent.PROGRESS, false, false, fileData.position, file._size);
				dispatchEvent(pe);

				// Clean up memory
				urlStream.close();
				chunkData.clear();
			});

			// Delegate upload IO errors
			urlStream.addEventListener(IOErrorEvent.IO_ERROR, function(e:IOErrorEvent):void {
				dispatchEvent(e);
			});

			// Delegate secuirty errors
			urlStream.addEventListener(SecurityErrorEvent.SECURITY_ERROR, function(e:SecurityErrorEvent):void {
				dispatchEvent(e);
			});

			// Setup URL
			url = this._uploadUrl;

			// Add name and chunk/chunks to URL if we use direct streaming method
			if (!this._multipart) {
				if (url.indexOf('?') == -1)
					url += '?';
				else
					url += '&';

				url += "name=" + encodeURIComponent(this._settings["name"]);

				if (this._chunking) {
					url += "&chunk=" + this._chunk + "&chunks=" + this._chunks;
				}
			}

			// Setup request
			req = new URLRequest(url);
			req.method = URLRequestMethod.POST;

			// Add custom headers
			if (this._headers) {
				for (var headerName:String in this._headers) {
					req.requestHeaders.push(new URLRequestHeader(headerName, this._headers[headerName]));
				}
			}

			// Build multipart request
			if (this._multipart) {
				var boundary:String = '----pluploadboundary' + new Date().getTime(),
					dashdash:String = '--', crlf:String = '\r\n', multipartBlob: ByteArray = new ByteArray();

				req.requestHeaders.push(new URLRequestHeader("Content-Type", 'multipart/form-data; boundary=' + boundary));

				this._postvars["name"] = this._settings["name"];

				// Add chunking parameters if needed
				if (this._chunking) {
					this._postvars["chunk"] = this._chunk;
					this._postvars["chunks"] = this._chunks;
				}

				// Append mutlipart parameters
				for (var name:String in this._postvars) {
					multipartBlob.writeUTFBytes(
						dashdash + boundary + crlf +
						'Content-Disposition: form-data; name="' + name + '"' + crlf + crlf +
						this._postvars[name] + crlf
					);
				}

				// Add file header
				multipartBlob.writeUTFBytes(
					dashdash + boundary + crlf +
					'Content-Disposition: form-data; name="' + this._fileDataName + '"; filename="' + this._fileName + '"' + crlf +
					'Content-Type: ' + this._mimeType + crlf + crlf
				);

				// Add file data
				multipartBlob.writeBytes(chunkData, 0, chunkData.length);

				// Add file footer
				multipartBlob.writeUTFBytes(crlf + dashdash + boundary + dashdash + crlf);
				req.data = multipartBlob;
			} else {
				req.requestHeaders.push(new URLRequestHeader("Content-Type", "application/octet-stream"));
				req.data = chunkData;
			}

			// Make request
			urlStream.load(req);

			return true;
		}
	}
}

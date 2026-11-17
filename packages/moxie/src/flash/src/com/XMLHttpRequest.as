package com
{
	import com.errors.RuntimeError;
	import com.events.BlobEvent;
	import com.utils.URLStreamProgress;
	
	import flash.events.DataEvent;
	import flash.events.Event;
	import flash.events.EventDispatcher;
	import flash.events.HTTPStatusEvent;
	import flash.events.IOErrorEvent;
	import flash.events.ProgressEvent;
	import flash.events.SecurityErrorEvent;
	import flash.net.FileReference;
	import flash.net.URLRequest;
	import flash.net.URLRequestHeader;
	import flash.net.URLRequestMethod;
	import flash.net.URLStream;
	import flash.utils.ByteArray;
	import flash.utils.clearTimeout;
	import flash.utils.setTimeout;
	
	import mxi.Utils;
	import mxi.events.OErrorEvent;
	import mxi.events.OProgressEvent;
	
	public class XMLHttpRequest extends EventDispatcher
	{
		// events dispatched by this class
		public static var dispatches:Object = { 
			"LoadStart": Event.OPEN,
			"Progress": OProgressEvent.PROGRESS,
			"UploadProgress": ProgressEvent.PROGRESS,
			"Load": Event.COMPLETE,
			"Error": OErrorEvent.ERROR
		};
		
		public static const UNSENT:uint = 0;
		public static const OPENED:uint = 1;
		public static const HEADERS_RECEIVED:uint = 2;
		public static const LOADING:uint = 3;
		public static const DONE:uint = 4;
		public static const ABORTED:uint = 5;
				
		private var _methods:Object = {
			'GET': URLRequestMethod.GET,
			'POST': URLRequestMethod.POST
		};
		
		private var _options:Object;
		
		private var _multipart:Boolean = false;
		
		private var _headers:Object = {};
		
		private var _blob:*;
		
		private var _blobName:String;
		
		private var _blobFieldName:String = 'Filedata';
		
		private var _postData:Array = [];
		
		private var _conn:*;
		
		private var _response:ByteArray;
		
		private var _status:int;
		
		private var _readyState:uint = XMLHttpRequest.UNSENT;
		
		private var _onCompleteTimeout:uint = 0;
		
		private var _notCachedSize:uint = 0;
				
		
		public function append(name:String, value:*) : void
		{
			_multipart = true;
			
			if (name == 'Filename') { // Flash will add this by itself, so we need to omit potential duplicate
				return;
			}
			
			_postData.push([name, value]);
		}
		
		
		public function appendBlob(name:String, blob:*, fileName:String = null) : void
		{			
			_multipart = true;
			
			_blobName = fileName || 'blob' + new Date().getTime();
			
			if (typeof blob === 'string') {
				blob = Moxie.compFactory.get(blob);
				if (!fileName && blob is File && blob.hasOwnProperty('name')) { 
					_blobName = blob.name;
				} 
			}
			
			_blob = blob;
			_blobFieldName = name;						
		}
		
		
		public function setRequestHeader(name:String, value:String) : void
		{
			_headers[name] = value;
		}
		
				
		public function send(meta:Object, data:* = null) : void
		{	
			meta.method = meta.method.toUpperCase();
			_options = meta;
									
			if (data && typeof data === 'string') {
				var blob:* = Moxie.compFactory.get(data);
				if (blob) {
					_blob = blob;
					if (blob is File && blob.hasOwnProperty('name')) { 
						_blobName = blob.name;
					} 
				} else { // apparently a regular string
					var ba:ByteArray = new ByteArray();
					ba.writeUTFBytes(data);
					data = ba;
				}
			}
									
			if (_blob && _options.method == 'POST') 
			{		
				// make sure that blob is available for manipulation
				if (_blob.locked) {
					_blob.addEventListener(BlobEvent.UNLOCKED, function onBlobUnlock() : void {
						_blob.removeEventListener(BlobEvent.UNLOCKED, onBlobUnlock);
						send(meta);
					});
					return;
				}
				// lock the blob
				_blob.locked = true; 
				
				if (_options.transport == 'client' && _multipart && _blob.isFileRef() && Utils.isEmptyObj(_headers)) {
					_uploadFileRef(_blob);
				} else {
					_preloadBlob(_blob, _doURLStreamRequest);
				}
				return;
			}
			
			// for any other non-Blob requests GET or POST
			_doURLStreamRequest(data); 
		}
		
		public function getResponseAsBlob() : Object
		{
			var blob:Blob;
			
			if (!_response) {
				return null;
			}
			
			blob = new File([_response], { name: _options.url.replace(/^.+?\/([\w\-\.]+)(\?.*$|$)/, '$1').toLowerCase() });
			Moxie.compFactory.add(blob.uid, blob);
			return blob.toObject();
		}
		
		
		public function getStatus() : int
		{		
			return _status;
		}
		
		
		public function abort() : void 
		{	
			// mark as aborted in order to be handled as soon as possible
			_readyState = XMLHttpRequest.ABORTED; 
			
			if (_conn is FileReference) {
				_conn.cancel();
			} else if (_conn is URLStream && _conn.connected) {
				_conn.close();			
			}
			
			removeEventListeners(_conn);	
			_conn = null;
		}
		
		
		private function onOpen() : void {
			dispatchEvent(new Event(Event.OPEN));
		}
		
		
		private function onProgress(e:ProgressEvent) : void {
			dispatchEvent(new OProgressEvent(OProgressEvent.PROGRESS, e.bytesLoaded, e.bytesTotal));
		}
		
		
		private function onUploadProgress(e:ProgressEvent):void { 
			dispatchEvent(e);
		}
		
		
		private function onUploadComplete(e:*) : void {
			if (_onCompleteTimeout) {
				clearTimeout(_onCompleteTimeout);
			}
			
			// if status still equal to zero, than we are ok
			if (_status == 0) { 
				_status = 200;
			}
			
			// save response
			_response = new ByteArray;
						
			if (_conn is FileReference && e.hasOwnProperty('data')) {
				_response.writeUTFBytes(e.data);
			} else if (_conn is URLStream) {
				_conn.readBytes(_response);
			}
			
			removeEventListeners(e.target);	
			_readyState = XMLHttpRequest.DONE;
			dispatchEvent(new Event(Event.COMPLETE));
			
			// unlock the blob
			if (_blob && _blob is Blob) {
				_blob.locked = false;
			}
		}
		
		private function onComplete(e:*) : void {
			// give upload complete event a chance to fire
			_onCompleteTimeout = setTimeout(onUploadComplete, 500, e);
		}
		
		// The httpStatus event is dispatched only for upload failures.
		private function onStatus(e:HTTPStatusEvent) : void {
			_status = e.status;
		}

		private function onIOError(e:*) : void {
			if (_status == 0) { // httpStatus might have already set status to some failure code (according to livedocs)
				_status = 404; // assume that request succeeded, but url was wrong
			}
			onUploadComplete(e);
		}
		
		private function onError(e:*) : void {
			removeEventListeners(e.target);
			_readyState = XMLHttpRequest.DONE;
			dispatchEvent(new OErrorEvent(OErrorEvent.ERROR));
			
			// unlock the blob
			if (_blob && _blob is Blob) {
				_blob.locked = false;
			}
		}
		
		private function removeEventListeners(target:*) : void {
			// some of these event handlers may not even be attached, but we try to remove them all for simplicity
			target.removeEventListener(Event.OPEN, onOpen);
			target.removeEventListener(ProgressEvent.PROGRESS, onProgress);
			target.removeEventListener(ProgressEvent.PROGRESS, onUploadProgress);
			target.removeEventListener(Event.COMPLETE, onComplete);
			target.removeEventListener(DataEvent.UPLOAD_COMPLETE_DATA, onUploadComplete);
			target.removeEventListener(HTTPStatusEvent.HTTP_STATUS, onStatus);
			target.removeEventListener(IOErrorEvent.IO_ERROR, onIOError);
			target.removeEventListener(SecurityErrorEvent.SECURITY_ERROR, onError);
		}
		
		
		private function _uploadFileRef(blob:Blob) : void
		{			
			var request:URLRequest, queryString:Array = [], param:Array;
						
			request = new URLRequest();
			request.method = URLRequestMethod.POST;
			request.url = _options.url;
			
			for each (param in _postData) {
				queryString.push(encodeURIComponent(param[0]) + '=' + encodeURIComponent(param[1]));
			}
			request.data = queryString.join('&');
								
			_conn = blob.getFileRef();
			_readyState = XMLHttpRequest.OPENED;
						
			_conn.addEventListener(Event.COMPLETE, onComplete);
			_conn.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, onUploadComplete);
			_conn.addEventListener(ProgressEvent.PROGRESS, onUploadProgress);
			_conn.addEventListener(HTTPStatusEvent.HTTP_STATUS, onStatus);
			_conn.addEventListener(IOErrorEvent.IO_ERROR, onIOError);
			_conn.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onError);
			
			// _conn.addEventListener(Event.OPEN, onOpen); doesn't fire, ideas?
			onOpen(); // trigger it manually
						
			_readyState = XMLHttpRequest.LOADING;
			try {
				_conn.upload(request, _blobFieldName, false);
			} catch (ex:*) {
				onIOError({
					type: IOErrorEvent.IO_ERROR,
					target: _conn
				});
			}
		}
		
		
		private function _preloadBlob(blob:*, callback:Function) : void
		{					
			var fr:FileReader = new FileReader;
			
			fr.addEventListener(OProgressEvent.LOADSTART, function(e:Event) : void {
				if (_readyState == XMLHttpRequest.ABORTED) {
					fr.abort();
				}
			});
			
			fr.addEventListener(OProgressEvent.PROGRESS, function(e:ProgressEvent) : void {
				if (_readyState == XMLHttpRequest.ABORTED) {
					fr.abort();
				}
			});
			
			fr.addEventListener(OProgressEvent.LOAD, function() : void {	
				fr.removeAllEventsListeners();
				if (_readyState == XMLHttpRequest.ABORTED) {
					fr.abort();
				} else {
					callback(fr.result);
				}
			});
			
			//_notCachedSize = blob.realSize - blob.cachedSize;
			
			_readyState = XMLHttpRequest.OPENED;
			onOpen(); // trigger it manually
			fr.readAsByteArray(blob);
		}
		
		
		private function _doURLStreamRequest(ba:ByteArray = null) : void
		{									
			if (_readyState == XMLHttpRequest.ABORTED) {
				return;
			}
			
			var request:URLRequest,
			progress:URLStreamProgress, 
			start:Date, end:Date; // we are going to measure upload time for each piece of data and make correction to the progress watch
								
			request = new URLRequest(_options.url);
			
			// set custom headers if required
			if (!Utils.isEmptyObj(_headers)) {
				for (var name:String in _headers) {
					request.requestHeaders.push(new URLRequestHeader(name, _headers[name]));
				}
			}			
			
			// only GET/POST is supported at the moment
			if (['POST', 'GET'].indexOf(_options.method) === -1) {
				dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, RuntimeError.SYNTAX_ERR));
				return;
			}
						
			request.method = _methods[_options.method];
						
			if (_multipart) {
				request.data = _formatAsMultipart(ba, request);
			} else if (ba) {
				// set content-type manually
				if (!_headers['content-type']) { // if it wasn't already set above
					request.requestHeaders.push(new URLRequestHeader("content-type", _options.mimeType));
				}
				request.data = ba;
			}		
									
			_conn = new URLStream;
			
			_conn.addEventListener(ProgressEvent.PROGRESS, onProgress);
			_conn.addEventListener(IOErrorEvent.IO_ERROR, onIOError);
			_conn.addEventListener(SecurityErrorEvent.SECURITY_ERROR, onError);
			_conn.addEventListener(HTTPStatusEvent.HTTP_STATUS, onStatus);
			
			if (ba) { 
				progress = new URLStreamProgress({ url: _options.url });
				
				progress.addEventListener(ProgressEvent.PROGRESS, onUploadProgress);
				
				progress.addEventListener(Event.OPEN, function() : void {
					start = new Date;
					try {
					_conn.load(request);
					} catch (ex:*) {
						onIOError({
							type: IOErrorEvent.IO_ERROR,
							target: _conn
						});
					}
				});
				
				_conn.addEventListener(Event.COMPLETE, function(e:Event) : void {
					progress.stop();
					progress.removeAllEventsListeners();
					
					// correlate upload speed
					end = new Date;
					URLStreamProgress.calculateSpeed(request.data.length, end.time - start.time);
										
					onComplete(e);
				});		
				
				progress.start(request.data.length);
			}	
			else {	
				_conn.addEventListener(Event.COMPLETE, onComplete);
				
				onOpen(); // trigger it manually

				try {
				_conn.load(request);
				} catch (ex:*) {
					onIOError({
						type: IOErrorEvent.IO_ERROR,
						target: _conn
					});
				}
			}
			
			_readyState = XMLHttpRequest.LOADING;
		}
		
		
		private function _formatAsMultipart(ba:ByteArray, request:URLRequest) : ByteArray
		{
			var boundary:String = '----moxieboundary' + new Date().getTime(),
				dashdash:String = '--', crlf:String = '\r\n',
				tmpBa:ByteArray, param:Array;
			
			tmpBa = new ByteArray;
						
			request.requestHeaders.push(new URLRequestHeader("Content-Type", 'multipart/form-data; boundary=' + boundary));
			
			for each (param in _postData) {
				tmpBa.writeUTFBytes(
					dashdash + boundary + crlf +
					'Content-Disposition: form-data; name="' + param[0] + '"' + crlf + crlf +
					param[1] + crlf
				);
			}
			
			// append file if available
			if (ba) {
				tmpBa.writeUTFBytes(
					dashdash + boundary + crlf +
					'Content-Disposition: form-data; name="' + _blobFieldName + '"; filename="' + _blobName + '"' + crlf +
					'Content-Type: ' + (_options.mimeType || 'application/octet-stream') + crlf + crlf
				);
			
				tmpBa.writeBytes(ba, 0, ba.length);
				ba.clear();
				
				tmpBa.writeUTFBytes(crlf);
			}
			
			// wrap it up
			tmpBa.writeUTFBytes(dashdash + boundary + dashdash + crlf);
			
			return tmpBa;
		}
		
	}
}

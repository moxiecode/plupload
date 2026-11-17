package com
{
	import com.errors.TransporterError;
	import com.utils.Base64;
	import com.utils.OEventDispatcher;
	
	import flash.events.Event;
	import flash.utils.ByteArray;
	
	import mxi.events.OErrorEvent;
	import mxi.events.OProgressEvent;

	public class Transporter extends OEventDispatcher
	{
		// events dispatched by this class
		public static var dispatches:Object = { 
			"TransportingProgress": OProgressEvent.PROGRESS,
			"TransportingComplete": Event.COMPLETE,
			"TransportingError": OErrorEvent.ERROR
		};
				
		private var _buffer:ByteArray;
			
		public function Transporter()
		{			
			clear();
			_buffer = new ByteArray;
		}
		
		
		public function receive(chunk:String, size:uint) : void {			
			var ba:ByteArray;
												
			if (!size) {
				dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, TransporterError.UNEXPECTED_SIZE));
				return;
			}
						
			ba = Base64.decode(chunk);
			_buffer.writeBytes(ba);
			
			if (_buffer.length >= size) {
				dispatchEvent(new Event(Event.COMPLETE));
			} else {
				dispatchEvent(new OProgressEvent(OProgressEvent.PROGRESS, _buffer.length, size));
			}
		}	
		
		
		public function send(ba:ByteArray) : void {
			
		}
		
		
		
		public function clear() : void {
			if (_buffer) {
				_buffer.clear();
			}
		}
		
		
		public function getAsBlob(type:String = '') : Object 
		{
			var blob:Blob = new Blob([_buffer], { type: type });
			Moxie.compFactory.add(blob.uid, blob);
			return blob.toObject();
		}
	
			
	}
}
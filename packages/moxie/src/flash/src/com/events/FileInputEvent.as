package com.events
{
	import flash.events.Event;
	
	public class FileInputEvent extends Event
	{
		public static const SELECT:String = 'fileinputselect';
		public static const CANCEL:String = 'fileinputcancel';
		
		public var data:*;
		
		public function FileInputEvent(type:String, data:* = false)
		{
			this.data = data;
			super(type, false, false);
		}
		
		
	}
}
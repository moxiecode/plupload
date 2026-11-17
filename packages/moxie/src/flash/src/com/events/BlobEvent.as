package com.events
{
	import flash.events.Event;
	
	public class BlobEvent extends Event
	{
		public static const UNLOCKED:String = 'blobunlocked';
		
		public function BlobEvent(type:String, bubbles:Boolean=false, cancelable:Boolean=false)
		{
			super(type, bubbles, cancelable);
		}
		
		public override function clone() : Event {
			return new BlobEvent(type);
		}
	}
}

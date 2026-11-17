package com.events
{
	import flash.events.Event;
	
	public class ImageEditorEvent extends Event
	{
		public static const COMMIT_COMPLETE:String = 'commitcomplete';
		public static const DRAW_COMPLETE:String = 'drawcomplete';
		public static const COMPLETE:String = 'complete';
		
		public function ImageEditorEvent(type:String, bubbles:Boolean=false, cancelable:Boolean=false)
		{
			super(type, bubbles, cancelable);
		}
	}
}
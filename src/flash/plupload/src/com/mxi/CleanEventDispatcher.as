/**
 *
 * Copyright 2011, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.mxi 
{
	import flash.events.EventDispatcher;
	
	public class CleanEventDispatcher extends EventDispatcher
	{
		protected var events:Array = [];
		
		override public function addEventListener(type:String, callback:Function, useCapture:Boolean = false, priority:int = 0, useWeak:Boolean = false) : void
		{
			events.push({
				type: type,
				callback: callback
			});
			
			/* we pass only required params for simplicity of removal operation, if you need to use other params
			you will need something more intricate then this one */
			super.addEventListener(type, callback); 
		}
		
		
		/* anyone any idea why Flash doesn't have a call like this?.. */
		public function removeAllEventListeners() : void
		{
			var i:int,
			max:int = events.length; 
			for (i=0; i<max; i++) { 
				removeEventListener(events[i].type, events[i].callback);
			}
			events = [];
		}
	}
}
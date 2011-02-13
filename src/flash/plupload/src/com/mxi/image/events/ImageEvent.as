/**
 * Copyright 2011, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.mxi.image.events {
	import flash.events.Event;

	/**
	 * This class is used for uploads of chunks.
	 */
	public class ImageEvent extends Event {
				
		public static const COMPLETE:String = 'imagecomplete';
		public static const ERROR:String = 'imageerror';
		
		public static const WRONG_FORMAT:String = '-700';
		public static const OUT_OF_MEMORY:String = '-701';
		public static const OUT_OF_DIMENSIONS:String = '-702';
		
		public var code:String;

		function ImageEvent(type:String, code:String = null) {
			this.code = code;
			super(type, false, false);
		}
		
		override public function clone() : Event 
		{ 
			return new ImageEvent(type, code); 
		}
	}
}
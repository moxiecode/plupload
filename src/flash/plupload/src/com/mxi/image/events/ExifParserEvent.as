/**
 * Copyright 2011, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.mxi.image.events {
	import flash.events.Event;

	public class ExifParserEvent extends Event {
		
		public var exif:Object;
		
		public var gps:Object;
		
		public static const EXIF_PARSER_DATA:String = 'exifparserdata';

		function ExifParserEvent(type:String, data:Object) {
			super(type);
			this.exif = data.exif;
			this.gps = data.gps;
		}
	}
}
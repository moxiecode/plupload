/**
 * Copyright 2011, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.mxi.image 
{
	import com.mxi.BinaryReader;
	import flash.external.ExternalInterface;
	import flash.utils.ByteArray;

	public class JPEG 
	{		
		protected var _br:BinaryReader;
		
		public function JPEG(binData:ByteArray) 
		{
			_br = new BinaryReader;
			_br.init(binData);
		}
		
		static public function test(binData:ByteArray) : Boolean
		{
			var sign:Array = [ 255, 216 ];
						
			for (var i:int = sign.length - 1; i >= 0 ; i--) {
				if (binData[i] != sign[i]) {
					return false;
				}
			}
			return true;
		}
		
		public function info() : Object 
		{
			var idx:uint = 0, marker:uint, length:uint;
									
			while (idx <= 65536) {
				marker = _br.SHORT(idx += 2);
				if (marker >= 0xFFC0 && marker <= 0xFFC3) { // SOFn
					idx += 5; // marker (2 bytes) + length (2 bytes) + Sample precision (1 byte)
					return {
						height: _br.SHORT(idx),
						width: _br.SHORT(idx += 2)
					};
				}
				length = _br.SHORT(idx += 2);
				idx += length - 2;			
			}
			
			return null;
		}	
	}

}
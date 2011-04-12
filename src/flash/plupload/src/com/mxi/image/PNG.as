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
	import flash.utils.ByteArray;
	
	public class PNG 
	{		
		protected var _br:BinaryReader;
		
		public function PNG(binData:ByteArray)
		{
			_br = new BinaryReader;
			_br.init(binData);
		}
		
		
		static public function test(binData:ByteArray) : Boolean
		{
			var sign:Array = [ 137, 80, 78, 71, 13, 10, 26, 10 ];
			
			for (var i:int = sign.length - 1; i >= 0 ; i--) {
				if (binData[i] != sign[i]) {
					return false;
				}
			}
			return true;
		}
		
		
		public function info() : Object
		{
			var chunk:Object, idx:uint;
			
			chunk = _getChunkAt(8);
			
			if (chunk.type == 'IHDR') {
				idx = chunk.start;
				return {
					width: _br.LONG(idx),
					height: _br.LONG(idx += 4)
				};
			}
				
			return null;
		}
		
		
		private function _getChunkAt(idx:uint) : Object
		{
			var length:uint, type:String, start:uint, CRC:uint;
			
			length = _br.LONG(idx);
			type = _br.STRING(idx += 4, 4);
			start = idx += 4;	
			CRC = _br.LONG(idx + length);
			
			return {
				length: length,
				type: type,
				start: start,
				CRC: CRC
			};
		}
		
		
		
	}

}
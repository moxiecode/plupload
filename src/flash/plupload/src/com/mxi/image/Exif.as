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

	public class Exif 
	{		
		private const END_MARKERS:Array = [0xFFD9, 0xFFDA];
		
		protected var _br:BinaryReader;
		
		public function Exif(binData:ByteArray) 
		{
			_br = new BinaryReader;
			_br.init(binData);
		}
		
		public function info() : Object 
		{
			var idx:uint = 0, marker:uint, length:uint, limit:uint;
			
			limit = Math.min(1048576, _br.length);
			
			while (idx <= limit) {
				marker = _br.SHORT(idx += 2);
				if (marker == 0xFFE1) { // Exif header marker
					try {
						return getExifDimensions(idx); // try extract dimensions from exif
					}
					catch (e:Error)	{
						return null;
					}
				}
				else if (isEndMarker(marker)) { // encountered end marker
					return null;
				}
				length = _br.SHORT(idx += 2);
				idx += length - 2;			
			}
			
			return null;
		}
		
		private function getExifDimensions(start:uint) : Object
		{
			return {
				height: getExifWidth(start),
				width: getExifHeight(start)
			};			
		}
		
		private function getExifWidth(start:uint) : uint
		{
			return getExifTagValue(start, 0xA003);
		}
		
		private function getExifHeight(start:uint) : uint
		{
			return getExifTagValue(start, 0xA002);
		}
		
		private function getExifTagValue(start:uint, token:uint) : uint
		{
			var idx:uint, marker:uint, length:uint, limit:uint, type:uint;
			
			idx = start;
			
			limit = Math.min(1048576, _br.length);
			
			while (idx <= limit) { // make sure we examine just enough data
				marker = _br.SHORT(idx += 2);
				
				if (marker == token) {
					type = _br.SHORT(idx + 2); // data type
					
					if (type == 3) { // 3 = short
						return _br.SHORT(idx + 8);
					}
					else if (type == 4) { // 4 = long
						return _br.LONG(idx + 8);
					}
					else { // unsupported type / invalid data
						throw new Error("Unsupported type " + type);
					}						
				}
			}
			
			throw new Error("Token " + token.toString(16) + " not found");
		}
		
		private function isEndMarker(m:uint) : Boolean
		{
			return (END_MARKERS.indexOf(m) != -1);
		}
	}

}
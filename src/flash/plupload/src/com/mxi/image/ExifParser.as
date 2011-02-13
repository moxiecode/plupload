/**
 * Copyright 2011, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.mxi.image {
	import flash.events.EventDispatcher;
	import flash.utils.ByteArray;
	import com.mxi.BinaryReader;
	
	public class ExifParser extends EventDispatcher {
		
		private var TIFFHeader_offset:int = 10;
		private var IFD0_offset:int, gpsIFD_offset:int, exifIFD_offset:int;
		private var Tiff:Object, Exif:Object, Gps:Object; 
		private var app0:ByteArray, app1:ByteArray; 
		private var app0_offset:int, app0_length:int, app1_offset:int, app1_length:int;
		private var data:BinaryReader = new BinaryReader();
		
		private var tiffTags:Object = {
			0x0112: 'Orientation',				
			0x8769: 'ExifIFDPointer',
			0x8825:	'GPSInfoIFDPointer'
		},
			
		exifTags:Object = {
			0x9000: 'ExifVersion',
			0xA001: 'ColorSpace',
			0xA002: 'PixelXDimension',
			0xA003: 'PixelYDimension',
			0x9003: 'DateTimeOriginal',
			0x829A: 'ExposureTime',
			0x829D: 'FNumber',
			0x8827: 'ISOSpeedRatings',
			0x9201: 'ShutterSpeedValue',
			0x9202: 'ApertureValue'	,
			0x9207: 'MeteringMode',
			0x9208: 'LightSource',
			0x9209: 'Flash',
			0xA402: 'ExposureMode',
			0xA403: 'WhiteBalance',
			0xA406: 'SceneCaptureType',
			0xA404: 'DigitalZoomRatio',
			0xA408: 'Contrast',
			0xA409: 'Saturation',
			0xA40A: 'Sharpness'
		},
		
		gpsTags:Object = {
			0x0000: 'GPSVersionID',
			0x0001: 'GPSLatitudeRef',
			0x0002: 'GPSLatitude',
			0x0003: 'GPSLongitudeRef',
			0x0004: 'GPSLongitude'
		},
		
		tagDescs:Object = {			
			'ColorSpace': {
				1: 'sRGB',
				0: 'Uncalibrated'
			},
			'MeteringMode': {
				0: 'Unknown',
				1: 'Average',
				2: 'CenterWeightedAverage',
				3: 'Spot',
				4: 'MultiSpot',
				5: 'Pattern',
				6: 'Partial',
				255: 'Other'
			},
			'LightSource': {
				1: 'Daylight',
				2: 'Fliorescent',
				3: 'Tungsten',
				4: 'Flash',
				9: 'Fine weather',
				10: 'Cloudy weather',
				11: 'Shade',
				12: 'Daylight fluorescent (D 5700 - 7100K)',
				13: 'Day white fluorescent (N 4600 -5400K)',
				14: 'Cool white fluorescent (W 3900 - 4500K)',
				15: 'White fluorescent (WW 3200 - 3700K)',
				17: 'Standard light A',
				18: 'Standard light B',
				19: 'Standard light C',
				20: 'D55',
				21: 'D65',
				22: 'D75',
				23: 'D50',
				24: 'ISO studio tungsten',
				255: 'Other'
			},
			'Flash': {
				0x0000: 'Flash did not fire.',
				0x0001: 'Flash fired.',	
				0x0005: 'Strobe return light not detected.',
				0x0007: 'Strobe return light detected.',
				0x0009: 'Flash fired, compulsory flash mode',
				0x000D: 'Flash fired, compulsory flash mode, return light not detected',
				0x000F: 'Flash fired, compulsory flash mode, return light detected',
				0x0010: 'Flash did not fire, compulsory flash mode',
				0x0018: 'Flash did not fire, auto mode',
				0x0019: 'Flash fired, auto mode',
				0x001D: 'Flash fired, auto mode, return light not detected',
				0x001F: 'Flash fired, auto mode, return light detected',
				0x0020: 'No flash function',
				0x0041: 'Flash fired, red-eye reduction mode',
				0x0045: 'Flash fired, red-eye reduction mode, return light not detected',
				0x0047: 'Flash fired, red-eye reduction mode, return light detected',
				0x0049: 'Flash fired, compulsory flash mode, red-eye reduction mode',
				0x004D: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
				0x004F: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
				0x0059: 'Flash fired, auto mode, red-eye reduction mode',
				0x005D: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
				0x005F: 'Flash fired, auto mode, return light detected, red-eye reduction mode'
			},
			'ExposureMode': {
				0: 'Auto exposure',
				1: 'Manual exposure',
				2: 'Auto bracket'
			},
			'WhiteBalance': {
				0: 'Auto white balance',
				1: 'Manual white balance'
			},
			'SceneCaptureType': {
				0: 'Standard',
				1: 'Landscape',
				2: 'Portrait',
				3: 'Night scene'	
			},
			'Contrast': {
				0: 'Normal',
				1: 'Soft',
				2: 'Hard'
			},
			'Saturation': {
				0: 'Normal',
				1: 'Low saturation',
				2: 'High saturation'
			},
			'Sharpness': {
				0: 'Normal',
				1: 'Soft',
				2: 'Hard'
			},
			
			// GPS related
			'GPSLatitudeRef': {
				N: 'North latitude',
				S: 'South latitude'
			},
			'GPSLongitudeRef': {
				E: 'East longitude',
				W: 'West longitude'
			}	
		};
		
		public function init(jpegData:ByteArray):Boolean {
			
			TIFFHeader_offset = 10;
			Tiff = Exif = Gps = new Object();
			app0 = app1 = new ByteArray();
			app0_offset = app0_length = app1_offset = app1_length = IFD0_offset = exifIFD_offset = gpsIFD_offset = -1;	
			
			data.init(jpegData);
			
			if (!isJPEG()) return false;
			
			switch (data.SHORT(2)) {
				
				// app0
				case 0xFFE0:
					app0_offset = 2;
					app0_length = data.SHORT(4) + 2;
					
					// check if app1 follows
					if (data.SHORT(app0_length) == 0xFFE1) {
						app1_offset = app0_length;
						app1_length = data.SHORT(app0_length + 2) + 2;
					}
					break; 
				
				// app1	
				case 0xFFE1: 
					app1_offset = 2;
					app1_length = data.SHORT(4) + 2;
					break;
				
				default: return false;
			}
			
			(app1_length !== -1 && getIFDOffsets()); 
			return true;
		}
		
		
		public function APP1(args:Object = null):ByteArray {
			if (app1_offset === -1 && app1_length === -1) 
				return new ByteArray();
			app1 = data.SEGMENT(app1_offset, app1_length, false);
			// if requested alter width/height tags in app1
			(args !== null && args.hasOwnProperty('width') && args.hasOwnProperty('height') && setNewWxH(args.width, args.height));
			return app1;
		}
		
		public function EXIF():Object {	
			// populate EXIF hash
						
			if (exifIFD_offset === -1) return {};
						
			Exif = extractTags(exifIFD_offset, exifTags);
			
			// fix formatting of some tags
			if (Exif.hasOwnProperty('ExifVersion'))
				Exif.ExifVersion = String.fromCharCode(
					Exif.ExifVersion[0], 
					Exif.ExifVersion[1], 
					Exif.ExifVersion[2], 
					Exif.ExifVersion[3]
				);
			return Exif;	 
		}
		
		public function GPS():Object {
			if (gpsIFD_offset === -1) return {};
			
			Gps = extractTags(gpsIFD_offset, gpsTags);	
			if (Gps.hasOwnProperty('GPSVersionID'))
				Gps.GPSVersionID = Gps.GPSVersionID.join('.');
			return Gps;
		}
		
		
		public function setAPP1(data_app1:ByteArray):Boolean {
			if (app1_offset !== -1) 
				return false;
			data.SEGMENT((app0_offset !== -1 ? app0_offset + app0_length : 2), data_app1);
			return true;
		}
		
		public function getBinary():ByteArray {
			return data.SEGMENT();
		}
		
		
		
		
		private function isJPEG():Boolean {
			return data.SHORT(0) == 0xFFD8;
		}
		
		
		private function getIFDOffsets():Boolean {
			// fix TIFF header offset
			TIFFHeader_offset+= app1_offset;
			
			var idx:int = app1_offset + 4;
						
			// check if that's EXIF we are reading
			if (data.STRING(idx, 4).toUpperCase() != 'EXIF' || data.SHORT(idx+=4) != 0) return false;
			
			// set read order of multi-byte data		
			data.II(data.SHORT(idx+=2) == 0x4949);
						
			// check if always present bytes are indeed present
			if (data.SHORT(idx+=2) != 0x002A) return false;
									
			IFD0_offset = TIFFHeader_offset + data.LONG(idx+=2);
			Tiff = extractTags(IFD0_offset, tiffTags);	
						
			exifIFD_offset = (Tiff.hasOwnProperty('ExifIFDPointer') ? 
				TIFFHeader_offset + Tiff.ExifIFDPointer : null);
			
			gpsIFD_offset = (Tiff.hasOwnProperty('GPSInfoIFDPointer') ? 
				TIFFHeader_offset + Tiff.GPSInfoIFDPointer : null);
			
			return true;
		}
		
		private function extractTags(IFD_offset:int, tags2extract:Object):Object {
			var length:int = data.SHORT(IFD_offset),
				tag:int, tagName:String, type:int, count:int, tagOffset:int, offset:int, values:Array, tags:Object = {},
				ii:uint;
						
			for (var i:uint = 0; i < length; i++) {
				
				// set binary reader pointer to beginning of the next tag
				offset = tagOffset = IFD_offset + 12*i + 2;
				
				tag = data.SHORT(offset);
								
				if (!tags2extract.hasOwnProperty(tag)) continue; // not the tag we requested
												
				tagName = tags2extract[tag];
											
				type = data.SHORT(offset+=2);
				count = data.LONG(offset+=2);
				
				offset +=4;
				
				values = new Array();
				
				switch (type) {
					
					case 1: // BYTE
					case 7: // UNDEFINED
						if  (count > 4) offset = data.LONG(offset) + TIFFHeader_offset;
						for (ii = 0; ii < count; ii++)
							values[ii] = data.BYTE(offset + ii);
						break;
					
					case 2: // STRING
						if  (count > 4) offset = data.LONG(offset) + TIFFHeader_offset;
						tags[tagName] = data.STRING(offset, count - 1);
						continue;
						
					case 3: // SHORT 
						if (count > 2) offset = data.LONG(offset) + TIFFHeader_offset;
						for (ii = 0; ii < count; ii++)
							values[ii] = data.SHORT(offset + ii*2);
						break;
					
					case 4: // LONG
						if (count > 1) offset = data.LONG(offset) + TIFFHeader_offset;
						for (ii = 0; ii < count; ii++)
							values[ii] = data.LONG(offset + ii*4);
						break;
					
					case 5: // RATIONAL
						offset = data.LONG(offset) + TIFFHeader_offset;
						for (ii = 0; ii < count; ii++)
							values[ii] = data.LONG(offset + ii*4) / data.LONG(offset + ii*4 + 4);
						break;
					
					case 9: // SLONG
						offset = data.LONG(offset) + TIFFHeader_offset;
						for (ii = 0; ii < count; ii++)
							values[ii] = data.SLONG(offset + ii*4);
						break;
					
					case 10: // SRATIONAL
						offset = data.LONG(offset) + TIFFHeader_offset;
						for (ii = 0; ii < count; ii++)
							values[ii] = data.SLONG(offset + ii*4) / data.SLONG(offset + ii*4 + 4);
						break;
					
					default: continue;
				}
				
				if (tagDescs.hasOwnProperty(tagName) && typeof(values[0]) != 'object')
					tags[tagName] = tagDescs[tagName][values[0]];
				else
					tags[tagName] = (count == 1 ? values[0] : values);
			}
			return tags;
		}
		
		private function setNewWxH(width:int, height:int):Boolean {				
			var w_offset:uint, h_offset:uint,
				offset:uint = exifIFD_offset !== -1 ? exifIFD_offset - app1_offset : -1,
				data_app1:BinaryReader = new BinaryReader();
			
			data_app1.init(app1);	
			data_app1.II(data.II()); 	
			
			if (offset === -1) return false;
			
			// find offset for PixelXDimension tag
			w_offset = findTagValueOffset(data_app1, 0xA002, offset);
			if (w_offset !== -1) 
				data_app1.LONG(w_offset, width);
			
			// find offset for PixelYDimension tag	
			h_offset = findTagValueOffset(data_app1, 0xA003, offset);
			if (h_offset !== -1) 
				data_app1.LONG(h_offset, height);	
			
			app1 = data_app1.SEGMENT();
			return true;
		}
			
		private function findTagValueOffset(data_app1:BinaryReader, tegHex:int, offset:int):int {
			var length:uint = data_app1.SHORT(offset),
				tagOffset:uint;
			
			for (var i:uint = 0; i < length; i++) {
				tagOffset = offset + 12*i + 2;	
				if (data_app1.SHORT(tagOffset) == tegHex) 
					return tagOffset + 8;
			}	
			return -1;
		}
		
	}
	
}

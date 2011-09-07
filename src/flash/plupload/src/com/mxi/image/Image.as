/**
 * Copyright 2011, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.mxi.image 
{
	import com.formatlos.BitmapDataUnlimited;
	import com.formatlos.events.BitmapDataUnlimitedEvent;
	import com.mxi.CleanEventDispatcher;
	import com.mxi.image.events.ExifParserEvent;
	import flash.display.BitmapData;
	import flash.display.IBitmapDrawable;
	import flash.display.Loader;
	import flash.events.Event;
	import flash.geom.Matrix;
	import flash.utils.ByteArray;
	import flash.utils.getQualifiedClassName;
	import mx.graphics.codec.JPEGEncoder;
	import mx.graphics.codec.PNGEncoder;
	import com.mxi.image.events.ImageEvent;
	import flash.system.System;
	import flash.external.ExternalInterface;
	
	public class Image extends CleanEventDispatcher
	{
		private var _source:ByteArray;
		
		private var _info:Object = null;
		
		private var _width:Number;
		private var _height:Number;
		private var _quality:Number;
		
		public static const MAX_WIDTH:uint = 8191;
		public static const MAX_HEIGHT:uint = 8191;
		
		private var _loader:Loader;
		private var _image:*;
		
		public var imageData:ByteArray;
	
		
		public function Image(source:ByteArray) 
		{
			_source = source;
			super();
		}
		
		public function scale(width:* = null, height:* = null, quality:* = null) : void
		{
			var info:Object, scale:Number;
			
			info = _getImageInfo();
			if (!info) {
				dispatchEvent(new ImageEvent(ImageEvent.ERROR, ImageEvent.WRONG_FORMAT));
				return;
			}
						
			if (info.width > Image.MAX_WIDTH || info.height > Image.MAX_HEIGHT) {
				dispatchEvent(new ImageEvent(ImageEvent.ERROR, ImageEvent.OUT_OF_DIMENSIONS));
				return;
			}
			
			_width = width || info.width;
			_height = height || info.height;
			_quality = quality || 90;
						
			// we might not need to scale 
			scale = Math.min(_width / info.width, _height / info.height);							
			if (scale > 1 || (scale == 1 && info.type !== "JPEG")) {
				dispatchEvent(new ImageEvent(ImageEvent.COMPLETE));
				return;
			}
			
			// scale
			_loader = new Loader;
			_loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onBitmapDataReady);
			_loader.loadBytes(_source);				
		}
		
		
		protected function _getImageInfo() : Object
		{
			var type:String;
			
			if (_info) return _info;
			
			if (JPEG.test(_source)) {
				_image = new JPEG(_source);		
			}
			else if (PNG.test(_source)) {
				_image = new PNG(_source);
			}
			
			if (_image) {
				_info = _image.info();
				if (_info) {
					_info['type'] = getQualifiedClassName(_image).replace(/^.*::/, '');
				}	
			}
			return _info;
		}
		
		
		protected function onBitmapDataReady(e:Event) : void
		{
			var bitmapSource:IBitmapDrawable, output:BitmapData, width:Number, height:Number, scale:Number;
			
			_loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, onBitmapDataReady);
			
			bitmapSource = e.target.content as IBitmapDrawable;
			
			width = _info.width;
			height = _info.height;
			
			// re-calculate width/height proportionally
			scale = Math.min(_width / width, _height / height);
			_width = Math.round(width * scale);
			_height = Math.round(height * scale);
			
			var prepareBitmap:Function = function(width:Number, height:Number, callback:Function) : void
			{
				var bitmapCreator:BitmapDataUnlimited = new BitmapDataUnlimited;
				bitmapCreator.addEventListener(BitmapDataUnlimitedEvent.COMPLETE, function(e:BitmapDataUnlimitedEvent) : void 
				{
					callback(bitmapCreator.bitmapData);
				});
				bitmapCreator.addEventListener(BitmapDataUnlimitedEvent.ERROR, function(e:BitmapDataUnlimitedEvent) : void 
				{
					dispatchEvent(new ImageEvent(ImageEvent.ERROR, ImageEvent.OUT_OF_MEMORY));
				});
				bitmapCreator.create(width, height, true);
			};
			
			var outputScale:Function = function(width:Number, height:Number) : void
			{				
				prepareBitmap(width, height, function(bitmapData:BitmapData) : void 
				{
					var scale:Number, matrix:Matrix;
					
					scale = Math.min(width / output.width, height / output.height);

					matrix = new Matrix;
					matrix.scale(scale, scale);
					
					bitmapData.draw(output, matrix, null, null, null, true);
					output.dispose();
					
					output = bitmapData;
				});
			};
			
			prepareBitmap(width, height, function(bitmapData:BitmapData) : void 
			{
				output = bitmapData;				
				output.draw(bitmapSource, null, null, null, null, true);
				
				while (output.width / 2 > _width) {
					outputScale(output.width / 2, output.height / 2); // modifies output internally
				}
				
				// finalize
				outputScale(_width, _height);
				
				// encode
				if (_info.type == "JPEG") {
					var headers:Array, exifParser:ExifParser;
					
					imageData = new JPEGEncoder(_quality).encode(output);
					
					// transfer headers
					_image.extractHeaders();
					
					headers = _image.getHeaders('exif');
					if (headers.length) {
						exifParser = new ExifParser;
						if (exifParser.init(headers[0])) {						
							
							exifParser.setExif('PixelXDimension', _width);
							exifParser.setExif('PixelYDimension', _height);
							
							dispatchEvent(new ExifParserEvent(ExifParserEvent.EXIF_DATA, exifParser.EXIF()));
							dispatchEvent(new ExifParserEvent(ExifParserEvent.GPS_DATA, exifParser.GPS()));
							
							_image.setHeaders('exif', exifParser.getBinary());
														
							try {
								imageData  = _image.insertHeaders(imageData);
							} catch (e:Error) {}							
						}
					}					
				} else {
					imageData = new PNGEncoder().encode(output);
				}
				
				dispatchEvent(new ImageEvent(ImageEvent.COMPLETE));
			});
			
		}
		
		
	}

}
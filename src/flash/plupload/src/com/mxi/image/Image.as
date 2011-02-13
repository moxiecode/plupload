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
	import flash.display.BitmapData;
	import flash.display.IBitmapDrawable;
	import flash.display.Loader;
	import flash.events.Event;
	import flash.events.EventDispatcher;
	import flash.geom.Matrix;
	import flash.utils.ByteArray;
	import mx.graphics.codec.JPEGEncoder;
	import mx.graphics.codec.PNGEncoder;
	import flash.external.ExternalInterface;
	import com.mxi.image.events.ImageEvent;
	import flash.system.System;
	
	public class Image extends EventDispatcher
	{
		private var _source:ByteArray;
		
		private var _info:Object = null;
		
		private var _width:Number;
		private var _height:Number;
		private var _quality:Number;
		
		public static const MAX_WIDTH:uint = 8191;
		public static const MAX_HEIGHT:uint = 8191;
		
		public var imageData:ByteArray;
	
		
		public function Image(source:ByteArray) 
		{
			_source = source;
			super();
		}
		
		public function scale(width:Number, height:Number, quality:Number = 90) : void
		{
			var loader:Loader, info:Object, scale:Number;
			
			info = _getImageInfo();
			if (!info) {
				dispatchEvent(new ImageEvent(ImageEvent.ERROR, ImageEvent.WRONG_FORMAT));
				return;
			}
						
			if (info.width > Image.MAX_WIDTH || info.height > Image.MAX_HEIGHT) {
				dispatchEvent(new ImageEvent(ImageEvent.ERROR, ImageEvent.OUT_OF_DIMENSIONS));
				return;
			}
			
			// we might not need to scale 
			scale = Math.min(width / info.width, height / info.height);							
			if (scale >= 1) {
				dispatchEvent(new ImageEvent(ImageEvent.COMPLETE));
				return;
			}
			
			_width = width;
			_height = height;
			_quality = quality;

			// scale
			loader = new Loader;
			loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onBitmapDataReady);
			loader.loadBytes(_source);				
		}
		
		
		protected function _getImageInfo() : Object
		{
			if (_info) return _info;
			
			if (JPEG.test(_source)) {
				var jpeg:JPEG = new JPEG(_source);
				_info = jpeg.info();
				if (_info) {
					_info['type'] = 'JPEG';
				}			
			}
			else if (PNG.test(_source)) {
				var png:PNG = new PNG(_source);
				_info = png.info();
				if (_info) {
					_info['type'] = 'PNG';
				}
			}
			return _info;
		}
		
		
		protected function onBitmapDataReady(e:Event) : void
		{
			var bitmapSource:IBitmapDrawable, output:BitmapData, width:Number, height:Number, scale:Number;
			
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
				if (_info.type == "JPEG")
					imageData = new JPEGEncoder(_quality).encode(output);
				else
					imageData = new PNGEncoder().encode(output);
				
				dispatchEvent(new ImageEvent(ImageEvent.COMPLETE));
			});
			
		}
		
		
	}

}
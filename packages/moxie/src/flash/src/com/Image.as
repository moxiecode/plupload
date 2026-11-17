package com
{	
	import com.errors.ImageError;
	import com.errors.RuntimeError;
	import com.events.BlobEvent;
	import com.events.ImageEvent;
	import com.events.ImageEditorEvent;
	import com.utils.OEventDispatcher;
	
	import flash.display.BitmapData;
	import flash.display.IBitmapDrawable;
	import flash.display.JPEGEncoderOptions;
	import flash.display.Loader;
	import flash.display.PNGEncoderOptions;
	import flash.events.Event;
	import flash.events.IOErrorEvent;
	import flash.geom.Matrix;
	import flash.geom.Point;
	import flash.geom.Rectangle;
	import flash.system.System;
	import flash.utils.ByteArray;
	
	import mxi.Utils;
	import mxi.events.OErrorEvent;
	import mxi.events.OProgressEvent;
	import mxi.image.JPEG;
	import mxi.image.PNG;
	
		
	public class Image extends OEventDispatcher
	{
		// events dispatched by this class
		public static var dispatches:Object = { 
			"Progress": OProgressEvent.PROGRESS,
			"Load": OProgressEvent.LOAD,
			"Error": OErrorEvent.ERROR,
			"Resize": ImageEvent.RESIZE,
			"ResizeProgress": OProgressEvent.PROGRESS
		};
		
		private var _img:*;
		
		private var _bd:BitmapData;
		
		public var size:uint = 0;
		
		public var name:String = '';
		
		public var width:uint = 0;
		
		public var height:uint = 0;
		
		public var type:String = '';
				
		public var meta:Object = {}; // misc meta info (for JPEG it will be for example Exif and Gps)
		
		private var _preserveHeaders:Boolean = true;
		
		
		public function loadFromImage(image:*, takeEncoded:Boolean = false) : void
		{			
			if (typeof image === 'string') {
				image = Moxie.compFactory.get(image);
			}
			
			if (!image) {
				dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, ImageError.WRONG_FORMAT));
				return;
			}
			
			if (takeEncoded) {
				var ba:ByteArray = image.getAsEncodedByteArray();
				if (!ba) {
					dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, ImageError.WRONG_FORMAT));
					return;
				}					
				loadFromByteArray(ba);
			}
			else {
				var bd:BitmapData = image.getAsBitmapData();
				if (!bd) {
					dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, ImageError.WRONG_FORMAT));
					return;
				}
				
				size = image.size;
				name = image.name;
				width = image.width;
				height = image.height;
				type = image.type;
				meta = image.meta;
												
				loadFromBitmapData(bd);
			}
		}
		
		
		public function loadFromBlob(blob:*) : void
		{
			var fr:FileReader; 
			
			if (typeof blob === 'string') {
				blob = Moxie.compFactory.get(blob);
			}
						
			if (!blob) {
				dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, ImageError.WRONG_FORMAT));
				return;
			}
			
			if (blob.locked) {
				blob.addEventListener(BlobEvent.UNLOCKED, function onBlobUnlock() : void {
					blob.removeEventListener(BlobEvent.UNLOCKED, onBlobUnlock);
					loadFromBlob(blob);
				});
				return;
			}
			
			// lock the blob
			blob.locked = true;
			
			if (blob.hasOwnProperty('name')) {
				name = blob.name;
			}
								
			fr = new FileReader;
			
			fr.addEventListener(OProgressEvent.PROGRESS, function(e:OProgressEvent) : void {
				dispatchEvent(e);
			});
			
			fr.addEventListener(OProgressEvent.LOAD, function(e:OProgressEvent) : void {
				fr.removeAllEventsListeners();
				loadFromByteArray(fr.result);
				blob.purge();
				blob.locked = false; // unlock
			});
			
			fr.addEventListener(OErrorEvent.ERROR, function(e:Event) : void {
				blob.locked = false;
			});
			
			fr.readAsByteArray(blob);
		}
		
		
		public function loadFromBitmapData(bd:BitmapData) : void
		{						
			_bd = bd;
			
			// in case we were not able to extract the width/height directly from byte array
			if (!width || !height) {
				width = bd.width;
				height = bd.height;
			}
			
			dispatchEvent(new OProgressEvent(OProgressEvent.LOAD));
		}
				
		
		public function loadFromByteArray(ba:ByteArray) : void
		{
			var callback:Function, info:Object, loader:Loader;
			
			if (JPEG.test(ba)) {
				_img = new JPEG(ba);		
				_img.extractHeaders(); // preserve headers for later
				meta = _img.metaInfo();
				
				// save thumb as Blob
				if (meta.hasOwnProperty('thumb') && meta.thumb) {
					var blob:Blob = new Blob([meta.thumb.data], { type: 'image/jpeg' });
					Moxie.compFactory.add(blob.uid, blob);
					meta.thumb.data = blob.toObject();
				}
			} else if (PNG.test(ba)) {
				_img = new PNG(ba);
			} else {
				dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, ImageError.WRONG_FORMAT));
				return;
			}
			
			Utils.extend(this, _img.info());
			size = ba.length;
			
			loader = new Loader;
			
			loader.contentLoaderInfo.addEventListener(Event.COMPLETE, function(e:Event) : void 
			{					
				loader.contentLoaderInfo.removeEventListener(Event.COMPLETE, arguments.callee);
				
				try {
					var bd:BitmapData = new BitmapData(loader.width, loader.height);
					bd.draw(loader.content as IBitmapDrawable, null, null, null, null, true);
					loadFromBitmapData(bd);	
				} catch (ex:*) {
					dispatchEvent(new OErrorEvent(OErrorEvent.ERROR, RuntimeError.OUT_OF_MEMORY));
				}
					
				_img.purge();
				loader.unload();
				ba.clear();
			});
			
			loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, function(e:*) : void {
				ba.clear();
				//Moxie.log(e);
			});
			
			try {
				loader.loadBytes(ba);
			} catch (ex:*) {
				//Moxie.log(ex);	
			}
		}
		
		
		public function getInfo() : Object
		{
			return { 
				size: size,
				width: width,
				height: height,
				type: type,
				name: name, 
				meta: _preserveHeaders ? meta : null
			};
		}
			
		
		public function resize(srcRect:Object, scale:Number, options:Object) : void
		{
			var self:Image = this;
			var imgEditor:ImageEditor;
			var rect:Rectangle = new Rectangle(srcRect.x, srcRect.y, srcRect.width, srcRect.height);
			var bd:BitmapData = new BitmapData(srcRect.width, srcRect.height);
									
			options = Utils.extend({
				multipass: true,
				resample: 'default',
				preserveHeaders: false
			}, options);
			
			_preserveHeaders = options.preserveHeaders; // memorize if we should preserve meta headers on JPEGs on save
			
			bd.copyPixels(_bd, rect, new Point(0, 0));
						
			
			imgEditor = new ImageEditor(bd);
						
			imgEditor.addEventListener(OProgressEvent.PROGRESS, function(e:OProgressEvent) : void {
				dispatchEvent(e);
			});
			
			imgEditor.addEventListener(ImageEditorEvent.COMPLETE, function() : void {				
				bd.dispose();
				
				_bd.dispose();
				_bd = imgEditor.bitmapData;
				imgEditor.destroy();
				
				if (self.type == 'image/jpeg') 
				{
					// if we are to strip the exif information, we have to orient the image manually
					if (!_preserveHeaders) 
					{
						// take into account Orientation tag
						var orientation:uint = 1;
						if (self.type == 'image/jpeg' && meta.hasOwnProperty('tiff') && meta.tiff.hasOwnProperty('Orientation')) {
							orientation = parseInt(meta.tiff.Orientation, 10);
						}
						_rotateToOrientation(orientation);
					} 
					else if (_img) 
					{ 	// insert new values into exif headers
						_img.updateDimensions(_bd.width, _bd.height);
						// update image info
						meta = _img.metaInfo();
					} 
				}
				
				self.width = _bd.width;
				self.height = _bd.height;
				
				dispatchEvent(new ImageEvent(ImageEvent.RESIZE));
			});
			
			imgEditor
				.modify('scale', scale, options.resample)
				.commit();
		}
			
		
		public function getAsBitmapData() : BitmapData
		{
			if (!_bd) {
				return null;
			}
			return _bd.clone();
		}
		
		
		public function getAsEncodedByteArray(type:String = null, quality:uint = 90) : ByteArray 
		{
			var ba:ByteArray, bd:BitmapData;
			
			bd = getAsBitmapData();
			if (!bd) {
				return null;
			}
			
			if (!type) {
				type = this.type !== '' ? this.type : 'image/jpeg';
			} 
			
			if (type == 'image/png') {
				ba = bd.encode(bd.rect, new PNGEncoderOptions(quality < 60));
			} else {
				ba = bd.encode(bd.rect, new JPEGEncoderOptions(quality));
				
				if (_img && _img is JPEG) {
					// strip off any headers that might be left by encoder, etc
					_img.stripHeaders(ba);
					// restore the original headers if requested
					if (_preserveHeaders) {
						_img.insertHeaders(ba);
					}
				}
			}			
			return ba;
		}
		
		
		public function getAsByteArray() : ByteArray
		{
			var bd:BitmapData = getAsBitmapData();
			
			if (!bd) {
				return null;
			}
			
			return bd.getPixels(bd.rect);
		}
		
		
		public function getAsBlob(type:String = null, quality:uint = 90) : Object
		{
			var ba:ByteArray, blob:File;
			
			ba = getAsEncodedByteArray(type, quality);	
			if (!ba) {
				return null;
			}

			blob = new File([ba], { type: type, name: name });
			Moxie.compFactory.add(blob.uid, blob);
			return blob.toObject();
		}
		
		
		public function destroy() : void
		{
			if (_img) {
				_img.purge();					
			}
			
			if (_bd) {
				_bd.dispose();
				_bd = null;
			}
			
			// one call to mark any dereferenced objects and sweep away old marks, 			
			flash.system.System.gc();
			// ...and the second to now sweep away marks from the first call.
			flash.system.System.gc();
		}
		
		
		private function _rotateToOrientation(orientation:uint) : void
		{
			var imageEditor:ImageEditor = new ImageEditor(_bd);
			
			switch (orientation) {
				case 2:
					// horizontal flip
					imageEditor.modify("flipH");
					break;
				case 3:
					// 180 rotate left
					imageEditor.modify("rotate", 180);
					break;
				case 4:
					// vertical flip
					imageEditor.modify("flipV");
					break;
				case 5:
					// vertical flip + 90 rotate right
					imageEditor.modify("flipV");
					imageEditor.modify("rotate", 90);
					break;
				case 6:
					// 90 rotate right
					imageEditor.modify("rotate", 90);
					break;
				case 7:
					// horizontal flip + 90 rotate right
					imageEditor.modify("flipH");
					imageEditor.modify("rotate", 90);
					break;
				case 8:
					// 90 rotate left
					imageEditor.modify("rotate", -90);
					break;
			}
			
			imageEditor.commit(true);
			
			_bd.dispose();
			_bd = imageEditor.bitmapData;
			imageEditor.destroy();
		}
		
	}
}
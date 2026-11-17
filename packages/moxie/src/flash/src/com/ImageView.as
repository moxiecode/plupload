package com
{
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.Sprite;
	import flash.events.Event;
	import flash.geom.Matrix;
	
	import mxi.events.OProgressEvent;

	public class ImageView extends Sprite
	{
		// events dispatched by this class
		public static var dispatches:Object = { 
			"Embedded": Event.COMPLETE
		};
		
		
		public function display(blob:*, width:uint, height:uint) : void 
		{
			var image:Image, bm:Bitmap, self:* = this;
						
			if (Moxie.stageOccupied) {
				return;	
			}
			Moxie.stageOccupied = true; // occupies runtime's stage
						
			image = new Image;
			
			image.addEventListener(OProgressEvent.LOAD, function() : void {
				var bd:BitmapData, tmpBd:BitmapData, m:Matrix;
				
				image.removeAllEventsListeners();
				
				// stage resizes with the container and content should match it's intial dimensions to scale with it
				m = new Matrix;
				m.scale(stage.stageWidth / width, stage.stageHeight / height);
				bd = new BitmapData(stage.stageWidth, stage.stageHeight, true);
				bd.draw(image.getAsBitmapData(), m, null, null, null, true);
				bm = new Bitmap(bd, "auto", true);
								
								
				self.addChild(bm);			
				dispatchEvent(new Event(Event.COMPLETE));				
			});
			
			var button:Sprite = new Sprite;
			
			image.loadFromBlob(blob);
		}
	}
}
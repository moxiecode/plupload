package mxi
{
	public class Extend
	{
		
		public function addEventListener(): void {} // dummy
		public function removeEventListener(): void {} // dummy
		
		public function Event() : void {
			var _events:Array = [],
				addEventListener:Function = this.addEventListener,
				removeEventListener:Function = this.removeEventListener;
			
			Utils.extend(this, {
				
				addEventListener: function(type:String, callback:Function, useCapture:Boolean = false, priority:int = 0, useWeak:Boolean = false) : void
				{
					if (this.hasEventListener(type, callback, useCapture)) {
						return;
					}
					
					_events.push({
						type: type,
						callback: callback,
						useCapture: useCapture
					});
					
					addEventListener(type, callback, useCapture); 
				},
				
				removeEventListener: function (type:String, callback:Function, useCapture:Boolean=false):void
				{			
					var index:uint, e:Object;
					
					index = this.hasEventListener(type, callback, useCapture);
					if (index === false) {
						return;
					}
					
					e = _events.splice(index, 1);
					removeEventListener(e.type, e.callback, e.useCapture);
				},
				
				
				hasEventListener: function(type:String, callback:Function = null, useCapture:Boolean = false): Boolean
				{
					for (var i:uint = 0, length:uint = _events.length; i < length; i++) {
						if (type == _events[i].type && callback == _events[i].callback && _events[i].useCapture == useCapture) {
							return i;
						}
					} 
					return false;
				},
				
				/* anyone any idea why Flash doesn't have a call like this?.. */
				removeAllEvents: function() : void
				{
					for (var i:uint = 0, length:uint = _events.length; i < length; i++) { 
						removeEventListener(_events[i].type, _events[i].callback, _events[i].useCapture);
					}
					_events = [];
				}
				
			});
		}
	}
}
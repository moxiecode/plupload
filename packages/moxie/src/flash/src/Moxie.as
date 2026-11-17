package
{
	import com.*;
	import com.errors.RuntimeError;
	import com.events.*;
	
	import flash.display.LoaderInfo;
	import flash.display.Sprite;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.events.Event;
	import flash.events.ProgressEvent;
	import flash.external.ExternalInterface;
	import flash.system.ApplicationDomain;
	import flash.system.Security;
	import flash.utils.*;
	
	import mxi.Extend;
	import mxi.Utils;
	import mxi.events.ODataEvent;
	import mxi.events.OErrorEvent;
	import mxi.events.OProgressEvent;
	
	[SWF(width='500', height='500')] 
	public class Moxie extends Sprite
	{		
		public static var uid:String;
		
		private var eventDispatcher:String = "moxie.core.EventTarget.instance.dispatchEvent";
				
		public static var compFactory:ComponentFactory;
		
		public static var stageOccupied:Boolean = false; // whether a display facility is already occupied
				
						
		/**
		 * Main constructor for the Plupload class.
		 */
		public function Moxie()
		{
			if (stage) {
				_init();
			} else {
				addEventListener(Event.ADDED_TO_STAGE, init);
			}
		}
		
		
		/**
		 * Initialization event handler.
		 *
		 * @param e Event object.
		 */
		private function _init(e:Event = null):void 
		{			
			removeEventListener(Event.ADDED_TO_STAGE, _init);
						
			// Allow scripting on swf loaded from another domain
			if (MXI::EnableCSS) {
				Security.allowDomain("*");
			}
			
			// Align and scale stage
			stage.align = StageAlign.TOP_LEFT;
			stage.scaleMode = StageScaleMode.EXACT_FIT;
						
			// use only FlashVars, ignore QueryString			
			var params:Object = root.loaderInfo.parameters;
			var url:String = root.loaderInfo.url;				
			var pos:int = url.indexOf('?');
			
			if (pos !== -1 && !/^\?[\d\.ab]+$/.test(url.substr(pos))) {
				return; // we do not allow anything from query sring, except the version (for caching purposes)
			}
									
			// Setup id
			if (!params.hasOwnProperty("uid")) {
				return; // we do not have uid, so we cannot fire error event - lets simply wait until it timeouts
			}
			
			Moxie.uid = Utils.sanitize(params["uid"]);	
			
			// Event dispatcher
			if (params.hasOwnProperty("target") && /^[\w\.]+$/.test(params["target"])) {
				eventDispatcher = params["target"];
			}
			
			//ExternalInterface.marshallExceptions = true; // propagate AS exceptions to JS and vice-versa
			ExternalInterface.addCallback('exec', exec);
			ExternalInterface.addCallback('isOccupied', isOccupied);
			
			// initialize component factory
			Moxie.compFactory = new ComponentFactory;
						
			_fireEvent(Moxie.uid + "::Init");			
		}
		
		
		public function exec(uid:String, compName:String, action:String, args:* = null) : *
		{			
			// Moxie.log([uid, compName, action, args]);
			
			uid = Utils.sanitize(uid); // make it safe
			
			var comp:* = Moxie.compFactory.get(uid);	
			
			// Moxie.log([compName, action]);
									
			try {
				// initialize corresponding com 
				if (!comp) { 
					comp = Moxie.compFactory.create(this, uid, compName);	
				}		
			
				// execute the action if available
				if (comp.hasOwnProperty(action)) {	
					return comp[action].apply(comp, args as Array);
				}
			} catch(err:*) { // re-route exceptions thrown by components (TODO: check marshallExceptions feature)
				_fireEvent(Moxie.uid + "::Exception", { 
					name: err.name,
					code: err.errorID,
					message: compName + "::" + action
				});
			}
		}
		
		
		public function isOccupied() : Boolean {
			return Moxie.stageOccupied;
		}
		
		
		/**
		 * Intercept component events and do some operations if required
		 * 
		 * @param uid String unique identifier of the component throwing the event
		 * @param e mixed Event object
		 * @param exType String event type in mOxie format
		 */
		public function onComponentEvent(uid:String, e:*, exType:String) : void 
		{
			var evt:Object = {};
			var data:* = e.hasOwnProperty('data') ? e.data : null;
			
			switch (e.type) 
			{						
				case ProgressEvent.PROGRESS:
				case OProgressEvent.PROGRESS:
					evt.loaded = e.bytesLoaded;
					evt.total = e.bytesTotal;
					break;
				
				case OErrorEvent.ERROR:
					data = e.code;
					break;
			}
									
			evt.type = [uid, exType].join('::');
									
			_fireEvent(evt, data);
		}
		
		
		
		/**
		 * Fires an event from the flash movie out to the page level JS.
		 *
		 * @param uid String unique identifier of the component throwing the event
		 * @param type Name of event to fire.
		 * @param obj Object with optional data.
		 */
		private function _fireEvent(evt:*, obj:* = null):void {
			try {
				ExternalInterface.call(eventDispatcher, evt, obj);
			} catch(err:*) {
				//_fireEvent("Exception", { name: 'RuntimeError', message: 4 });
				
				// throwing an exception would be better here
			}
		}
		
		
		public static function log(obj:*) : void {
			ExternalInterface.call('console.info', obj);
		}

	}
}
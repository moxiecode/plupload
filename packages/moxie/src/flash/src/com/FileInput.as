package com
{
	import com.events.FileInputEvent;
	
	import flash.display.Sprite;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.net.FileFilter;
	import flash.net.FileReference;
	import flash.net.FileReferenceList;
	
	import mxi.Utils;
	
	public class FileInput extends Sprite
	{
		public static var dispatches:Object = { // hash of events dispatched by this class
			"Cancel": FileInputEvent.CANCEL,
			"Change": FileInputEvent.SELECT,
			"MouseEnter": MouseEvent.ROLL_OVER,
			"MouseLeave": MouseEvent.ROLL_OUT,
			"MouseDown": MouseEvent.MOUSE_DOWN,
			"MouseUp": MouseEvent.MOUSE_UP
		}; 
						
		protected var _options:Object = {
			multiple: false,
			accept: null
		};
		
		protected var _disabled:Boolean = false;
		
		protected var _picker:*;
		
		protected var _button:Sprite;
		
		protected var _files:Array = [];
		
		public function init(options:Object = null) : void {			
			if (Moxie.stageOccupied) {
				return;	
			}
			Moxie.stageOccupied = true; // occupies runtime's stage
					
			setOptions(options);
									
			_button = new Sprite;
						
			_button.graphics.beginFill(0x000000, 0); // Fill with transparent color
			_button.graphics.drawRect(0, 0, stage.stageWidth, stage.stageHeight);
			_button.graphics.endFill();
			_button.buttonMode = true;
			_button.useHandCursor = true;
			
			_button.addEventListener(MouseEvent.CLICK, onClick);
			_button.addEventListener(MouseEvent.ROLL_OVER, onEvent);
			_button.addEventListener(MouseEvent.ROLL_OUT, onEvent);
			_button.addEventListener(MouseEvent.MOUSE_DOWN, onEvent);
			_button.addEventListener(MouseEvent.MOUSE_UP, onEvent);
			
			addChild(_button);
		}
		
		
		private function setOptions(options:Object = null) : void {
			if (options !== null) {
				for (var key:String in options) {
					setOption(key, options[key]);
				}
			}
		}
		
		
		public function setOption(name:String, value:*) : void {
			if (name == 'accept') {
				_options.accept = generateFilters(value);
			} else if (_options.hasOwnProperty(name)) {
				_options[name] = value;
			}
		}
		
		
		public function disable(disabled:Boolean = true) : void {
			_disabled = disabled;
			_button.useHandCursor = !disabled;
		}
		
		
		public function destroy() : void {
			Moxie.stageOccupied = false;
		}
		
		
		private function onEvent(e:MouseEvent) : void {			
			e.stopPropagation();
						
			if (_disabled) {
				return;
			}
						
			dispatchEvent(e);
		}
		
		
		private function onClick(e:MouseEvent) : void {			
			if (_disabled) {
				return;
			}
						
			_picker = _options.multiple ? new FileReferenceList : new FileReference;
			
			_picker.addEventListener(Event.CANCEL, onDialogEvent);
			_picker.addEventListener(Event.SELECT, onDialogEvent);
			_picker.browse(_options.accept);
		}
		
		
		public function getFiles() : Array {
			var files:Array = [];
			
			for each (var file:File in _files) {
				Moxie.compFactory.add(file.uid, file);
				files.push(file.toObject());
			}
			return files;
		}
		
		
		private function generateFilters(value:*) : Array {
			var filters:Array = [];
			
			if (value is Array) {								
				for (var i:int = 0; i < value.length; i++) {
					filters.push(new FileFilter(
						value[i].title,
						'*.' + value[i].extensions.replace(/,/g, ";*."),
						value.mac_types
					));
				}
			}
			return filters;
		}
	
		
		private function onDialogEvent(e:Event) : void {
			_picker.removeEventListener(Event.CANCEL, onDialogEvent);
			_picker.removeEventListener(Event.SELECT, onDialogEvent);
			
			switch (e.type) {
					
				case Event.CANCEL:
					dispatchEvent(new FileInputEvent(FileInputEvent.CANCEL));
					break;
				
				case Event.SELECT:
					var fileRefList:Array = [];
					
					if (!_options.multiple) {
						fileRefList.push(_picker);
					} else {
						fileRefList = _picker.fileList;
					}
					
					_files = [];
					
					for (var i:uint = 0; i < fileRefList.length; i++) {
						_files.push(new File([fileRefList[i]]));
					}
																				
					dispatchEvent(new FileInputEvent(FileInputEvent.SELECT));
					break;
			}
		}
	}
}
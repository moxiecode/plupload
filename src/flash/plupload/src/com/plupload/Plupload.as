/**
 * Plupload.as
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

package com.plupload {
	import flash.display.LoaderInfo;
	import flash.display.Sprite;
	import flash.errors.IOError;
	import flash.net.FileReferenceList;
	import flash.net.FileReference;
	import flash.net.FileFilter;
	import flash.net.URLLoader;
	import flash.net.URLRequest;
	import flash.net.URLRequestMethod;
	import flash.net.URLVariables;
	import flash.net.URLStream;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.events.FocusEvent;
	import flash.events.ProgressEvent;
	import flash.events.IOErrorEvent;
	import flash.events.SecurityErrorEvent;
	import flash.events.DataEvent;
	import flash.display.MovieClip;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.external.ExternalInterface;
	import flash.utils.ByteArray;
	import flash.utils.Dictionary;
	import flash.errors.IllegalOperationError;
	import flash.system.Security;
	import com.mxi.image.events.ImageEvent;
	import com.mxi.image.events.ExifParserEvent;

	/**
	 * This is the main class of the Plupload package.
	 */
	public class Plupload extends Sprite {
		// Private fields
		private var clickArea:MovieClip;
		private var fileRefList:FileReferenceList;
		private var files:Dictionary;
		private var idCounter:int = 0;
		private var currentFile:File;
		private var id:String;
		private var fileFilters:Array;
		private var multipleFiles:Boolean;
		private var fileRefArray:Array = [];
		private var fileRef:FileReference;

		/**
		 * Main constructor for the Plupload class.
		 */
		public function Plupload():void {
			if (stage)
				init();
			else
				addEventListener(Event.ADDED_TO_STAGE, init);
		}

		/**
		 * Initialization event handler.
		 *
		 * @param e Event object.
		 */
		private function init(e:Event = null):void {
			removeEventListener(Event.ADDED_TO_STAGE, init);

			// Allow upload cross domain upload
			Security.allowDomain("*");

			// Setup id
			this.id = this.stage.loaderInfo.parameters["id"];

			// Setup file reference list
			this.fileRefList = new FileReferenceList();
			this.fileRefList.addEventListener(Event.CANCEL, cancelEvent);
			this.fileRefList.addEventListener(Event.SELECT, selectEvent);

			initSingleFileReference();

			this.files = new Dictionary();

			// Align and scale stage
			this.stage.align = StageAlign.TOP_LEFT;
			this.stage.scaleMode = StageScaleMode.NO_SCALE;

			// Add something to click on
			this.clickArea = new MovieClip();
			this.clickArea.graphics.beginFill(0x000000, 0); // Fill with transparent color
			this.clickArea.graphics.drawRect(0, 0, 1024, 1024);
			this.clickArea.x = 0;
			this.clickArea.y = 0;
			this.clickArea.width = 1024;
			this.clickArea.height = 1024;
			this.clickArea.graphics.endFill();
			this.clickArea.buttonMode = true;
			this.clickArea.useHandCursor = true;
			addChild(this.clickArea);

			// Register event handlers
			this.clickArea.addEventListener(MouseEvent.ROLL_OVER, this.stageEvent);
			this.clickArea.addEventListener(MouseEvent.ROLL_OUT, this.stageEvent);
			this.clickArea.addEventListener(MouseEvent.CLICK, this.stageClickEvent);
			this.clickArea.addEventListener(MouseEvent.MOUSE_DOWN, this.stageEvent);
			this.clickArea.addEventListener(MouseEvent.MOUSE_UP, this.stageEvent);
			this.clickArea.addEventListener(FocusEvent.FOCUS_IN, this.stageEvent);
			this.clickArea.addEventListener(FocusEvent.FOCUS_OUT, this.stageEvent);

			// Add external callbacks
			ExternalInterface.addCallback('uploadFile', this.uploadFile);
			ExternalInterface.addCallback('removeFile', this.removeFile);
			ExternalInterface.addCallback('clearQueue', this.clearFiles);
			ExternalInterface.addCallback('setFileFilters', this.setFileFilters);
			ExternalInterface.addCallback('uploadNextChunk', this.uploadNextChunk);

			this.fireEvent("Init");
		}
		
		
		/**
		 * In case of multipleFiles=false FileReference needs to be reinitialized for every file select dialog
		 */
		private function initSingleFileReference() : void {
			if (this.fileRef) {
				this.fileRef = null;
			}
			
			this.fileRef = new FileReference();
			this.fileRef.addEventListener(Event.CANCEL, cancelEvent);
			this.fileRef.addEventListener(Event.SELECT, selectEvent);
		}

		/**
		 * Event handler for selection cancelled. This simply fires the event out to the page level JS.
		 *
		 * @param e Event object.
		 */
		private function cancelEvent(e:Event):void {
			this.fireEvent("CancelSelect");
		}
		
		/**
		 * Event handler for when the user select files to upload. This method builds up a simpler object
		 * representation and passes this back to the page level JS.
		 *
		 * @param e Event object.
		 */
		private function selectEvent(e:Event):void {
			var selectedFiles:Array = [], files:Dictionary = this.files;

			function processFile(file:File):void {
				// Add progress listener
				file.addEventListener(ProgressEvent.PROGRESS, function(e:ProgressEvent):void {
					var file:File = e.target as File;

					fireEvent("UploadProcess", {
						id : file.id,
						loaded : e.bytesLoaded,
						size : e.bytesTotal
					});
				});

				// Add error listener
				file.addEventListener(IOErrorEvent.IO_ERROR, function(e:IOErrorEvent):void {
					var file:File = e.target as File;

					fireEvent("IOError", {
						id : file.id,
						message : e.text.replace(/\\/g, "\\\\")
					});
				});

				// Add error listener
				file.addEventListener(SecurityErrorEvent.SECURITY_ERROR, function(e:SecurityErrorEvent):void {
					var file:File = e.target as File;

					fireEvent("SecurityError", {
						id : file.id,
						message : e.text.replace(/\\/g, "\\\\")
					});
				});
				
				file.addEventListener(ExifParserEvent.EXIF_DATA, function(e:ExifParserEvent) : void {
					var file:File = e.target as File;

					fireEvent("ExifData", {
						id : file.id,
						data : e.data
					});
				});
				
				
				file.addEventListener(ExifParserEvent.GPS_DATA, function(e:ExifParserEvent) : void
				{
					var file:File = e.target as File;

					fireEvent("GpsData", {
						id : file.id,
						data : e.data
					});
				});
				

				file.addEventListener(ImageEvent.ERROR, function(e:ImageEvent) : void {
					var file:File = e.target as File;
					
					fireEvent("ImageError", {
						id : file.id,
						code: e.code
					});
				});
				
				
				// Add response listener
				file.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, function(e:DataEvent):void {
					var file:File = e.target as File;

					fireEvent("UploadComplete", {
						id : file.id,
						text : e.text.replace(/\\/g, "\\\\")
					});
				});

				// Add chunk response listener
				file.addEventListener(UploadChunkEvent.UPLOAD_CHUNK_COMPLETE_DATA, function(e:UploadChunkEvent):void {
					var file:File = e.target as File;

					fireEvent("UploadChunkComplete", {
						id : file.id,
						text : e.text.replace(/\\/g, "\\\\"),
						chunk : e.chunk,
						chunks : e.chunks
					});
				});

				files[file.id] = file;

				// Setup selected files object to pass page to page level js
				selectedFiles.push({id : file.id, name : file.fileName, size : file.size, loaded : 0});
			}

			if (this.multipleFiles) {
				for (var i:Number = 0; i < this.fileRefList.fileList.length; i++) {
					processFile(new File("file_" + (this.idCounter++), this.fileRefList.fileList[i]));
				}
			} else {
				processFile(new File("file_" + (this.idCounter++), this.fileRef));
				this.fileRefArray.push(this.fileRef);
				initSingleFileReference();
			}

			this.fireEvent("SelectFiles", selectedFiles);
		}

		/**
		 * Sefnd out all stage events to page level JS inorder to fake click, hover etc.
		 *
		 * @param e Event object.
		 */
		private function stageEvent(e:Event):void {
			this.fireEvent("StageEvent:" + e.type);
		}

		/**
		 * Event handler that get executed when the user clicks the state. This will bring up
		 * the file browser dialog.
		 *
		 * @param e Event object.
		 */
		private function stageClickEvent(e:Event):void {
			var filters:Array = [], i:int;

			if (this.fileFilters != null) {
				for (i = 0; i < this.fileFilters.length; i++) {
					filters.push(new FileFilter(
						this.fileFilters[i].title,
						'*.' + this.fileFilters[i].extensions.replace(/,/g, ";*."),
						this.fileFilters[i].mac_types
					));
				}
			}

			try {
				if (this.multipleFiles) {
					if (filters.length > 0)
						this.fileRefList.browse(filters);
					else
						this.fileRefList.browse();
				} else {
					if (filters.length > 0)
						this.fileRef.browse(filters);
					else
						this.fileRef.browse();
				}
			} catch (ex1:IllegalOperationError) {
				this.fireEvent("SelectError", ex1.message);
			} catch (ex2:ArgumentError) {
				this.fireEvent("SelectError", ex2.message);
			}
		}

		/**
		 * External interface function. This can be called from page level JS to start the upload of a specific file.
		 *
		 * @param id File id to upload.
		 * @param url Url to upload the file to.
		 * @param settings Settings object.
		 */
		private function uploadFile(id:String, url:String, settings:Object):void {
			var file:File = this.files[id] as File;

			if (file) {
				this.currentFile = file;
				file.upload(url, settings);
			}
		}

		/**
		 * Uploads the next chunk of the current file will return false when all chunks are uploaded.
		 * 
		 * @return true/false if there is chunks left to upload.
		 */
		private function uploadNextChunk():Boolean {
			if (this.currentFile) {
				return this.currentFile.uploadNextChunk();
			}

			return false;
		}

		/**
		 * File id to remove form upload queue.
		 *
		 * @param id Id of the file to remove.
		 */
		private function removeFile(id:String):void {
			if (this.files[id] != null)
				delete this.files[id];
		}

		/**
		 * Remove all files from upload queue.
		 *
		 * @param id Id of the file to remove.
		 */
		private function clearFiles():void {
			this.files = new Dictionary();
		}

		/**
		 * Sets file filters to be used for selection.
		 *
		 * @param filters Id of the file to remove.
		 * @param multi Bool state if multiple files is to be selected.
		 */
		private function setFileFilters(filters:Array, multi:Boolean):void {
			this.fileFilters = filters;
			this.multipleFiles = multi;
		}

		/**
		 * Fires an event from the flash movie out to the page level JS.
		 *
		 * @param type Name of event to fire.
		 * @param obj Object with optional data.
		 */
		private function fireEvent(type:String, obj:Object = null):void {
			ExternalInterface.call("plupload.flash.trigger", this.id, type, obj);
		}

		/**
		 * Debugs out a message to Firebug.
		 *
		 * @param msg Message to output to firebug.
		 */
		public static function debug(msg:String):void {
			ExternalInterface.call("console.log", msg);
		}
	}
}

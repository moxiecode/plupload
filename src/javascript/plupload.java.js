(function(plupload){

  var uploadInstances = {};

  plupload.applet = {
		trigger : function(id, name, obj) {
			// Detach the call so that error handling in the browser is presented correctly
      // Why is that?
			setTimeout(function() {
				var uploader = uploadInstances[id], i, args;
				if (uploader) {
					uploader.trigger('applet:' + name, obj);
				}
			}, 0);
		},
    // inspired by pulpCore http://code.google.com/p/pulpcore/
    getObjectHTML: function(attrs) {
      var appletHTML = "";

      // Applet attributes and parameters
      var code         = attrs.code;
      var width        = attrs.width;
      var height       = attrs.height;
      var archive      = attrs.archive;
      var codebase     = attrs.codebase;
      var id           = attrs.id;

      // Create the object tag parameters
      var objectParams ='\
<param name="codebase" value="' + codebase + '" />\
<param name="archive" value="' + archive + '" />\
<param name="id" value="' + id + '" />\
<param name="mayscript" value="true" />\
<param name="code" value="' + code + '" />\
<param name="scriptable" value="true" />';
      
      // Create the Object tag.
      if (navigator.appName == 'Microsoft Internet Explorer') {
        var extraAttributes = '';
        // Use the <object> tag instead of <applet>. IE users without Java can get the
        // latest JRE without leaving the page or restarting the browser.
        appletHTML = '\
<object \
classid="clsid:8AD9C840-044E-11D1-B3E9-00805F499D93" \
codebase="http://java.sun.com/products/plugin/1.4/jinstall-14-win32.cab#Version=1,4,0,mn" \
width="' + width + '" height="' + height + '">' +
objectParams + '\
</object>';
      }
      else {
        appletHTML = '\
<applet code="' + code + '" codebase="' + codebase + '" archive="' + archive + '" \
width="' + width + '" height="' + height + '">' +
objectParams + '\
</applet>';
      }
      return appletHTML; 
    }
 };

  plupload.runtimes.Applet = plupload.addRuntime("java", {
    getFeatures : function() {
			return {
				// jpgresize: true,
				// pngresize: true,
				chunks: true,
				progress: true
				// multipart: true
			};
		},		
    init : function(uploader, callback) {
			var browseButton, 
          appletContainer, 
          appletVars, 
          initialized, 
          waitCount = 0, 
          container = document.body;

			uploadInstances[uploader.id] = uploader;

			// Find browse button and set to to be relative
			browseButton = document.getElementById(uploader.settings.browse_button);

			appletContainer = document.createElement('div');
			appletContainer.id = uploader.id + '_applet_container';

			plupload.extend(appletContainer.style, {
				position : 'absolute',
				top : '0px',
				background : uploader.settings.shim_bgcolor || 'transparent',
				zIndex : 99999,
				width : '100%', // Chrome doesn't init the app when zero
				height : '100%'
			});

			appletContainer.className = 'plupload applet';

			if (uploader.settings.container) {
				container = document.getElementById(uploader.settings.container);
				container.style.position = 'relative';
			}

			container.appendChild(appletContainer);
      
      var url = uploader.settings.java_applet_url;
      var base_url = url.slice(0, url.lastIndexOf('/'));
      // disable cache for now
      var archive = url.slice(url.lastIndexOf('/') + 1) + '?v=' + new Date().getTime();

      // archive += ',' + uploader.settings.java_applet_base_url + '/libs/httpclient-4.0.1.jar';
      // archive += ',' + uploader.settings.java_applet_base_url + '/libs/httpcore-4.0.1.jar';
      // archive += ',' + uploader.settings.java_applet_base_url + '/libs/commons-logging-1.1.1.jar';

      var attributes = {
        codebase:base_url,
        code: "plupload.Plupload",
        archive: archive, 
        width: "100%",
        height: "100%",
        id: uploader.id
      };
      appletContainer.innerHTML =  plupload.applet.getObjectHTML(attributes);

			function getAppletObj() {
				return document.getElementById(uploader.id + '_applet');
			}

			function waitLoad() {
				// Wait for 5 sec
				if (waitCount++ > 5000) {
					callback({success : false});
					return;
				}

				if (!initialized) {
					setTimeout(waitLoad, 1);
				}
			}

			waitLoad();

			// Fix IE memory leaks
			browseButton = appletContainer = null;

			// Wait for Applet to send init event
			uploader.bind("Applet:Init", function() {
				var lookup = {}, i, resize = uploader.settings.resize || {};

				initialized = true;
        // FIXME
				// getAppletObj().setFileFilters(uploader.settings.filters, uploader.settings.multi_selection);

				uploader.bind("UploadFile", function(up, file) {
					var settings = up.settings;
					getAppletObj().uploadFile(
            lookup[file.id], settings.url, {
					    chunk_size : settings.chunk_size,
					    retries: settings.retries || 3
					  });
				});

				uploader.bind("Applet:UploadProcess", function(up, applet_file) {
					var file = up.getFile(lookup[applet_file.id]);

					if (file.status != plupload.FAILED) {
						file.loaded = applet_file.loaded;
						file.size = applet_file.size;
            
						up.trigger('UploadProgress', file);
					}
          else{
            alert("uploadProcess status failed");
          }
				});

				uploader.bind("Applet:UploadChunkComplete", function(up, java_file) {
					var chunkArgs, 
              file = up.getFile(lookup[java_file.id]),
              finished = java_file.chunk === java_file.chunks;

				  chunkArgs = {
						chunk : java_file.chunk,
						chunks : java_file.chunks// ,
						// response : java_file.text
					};

					up.trigger('ChunkUploaded', file, chunkArgs);

					// Stop upload if file is marked as failed
					if (file.status != plupload.FAILED && !finished) {
						getAppletObj().uploadNextChunk();	
				  }

					// Last chunk then dispatch FileUploaded event
					if (finished) {
						file.status = plupload.DONE;

						up.trigger('FileUploaded', file, {
							response : "File uploaded"//java_file.text
						});
					}
				});

				uploader.bind("Applet:SkipUploadChunkComplete", function(up, java_file) {
					var chunkArgs, file = up.getFile(lookup[java_file.id]);

				  chunkArgs = {
						chunk : java_file.chunk,
						chunks : java_file.chunks//,
						// response : info.text
					};

					up.trigger('ChunkUploaded', file, chunkArgs);

					// Stop upload if file is marked as failed
					if (file.status != plupload.FAILED) {
            var applet = getAppletObj();
            if(java_file.chunk <= java_file.chunk_server){
						  applet.skipNextChunk();	
            }
            else{
            	var is_valid = applet.checkIntegrity();
              if(is_valid){
                applet.uploadNextChunk();	
              }
              else{
                // file changed, reupload everything
                java_file.overwrite = true;
                applet.upload();
              }
            }
				  }
				});

				uploader.bind("Applet:SelectFiles", function(up, selected_files) {
					var file, i, files = [], id;

					// Add the selected files to the file queue
					for (i = 0; i < selected_files.length; i++) {
						file = selected_files[i];

						// Store away flash ref internally
            // FIXME: WHAT is this?
						id = plupload.guid();
						lookup[id] = file.id;
						lookup[file.id] = id;

						files.push(new plupload.File(id, file.name, file.size));
					}

					// Trigger FilesAdded event if we added any
					if (files.length) {
						uploader.trigger("FilesAdded", files);
					}
				});

				uploader.bind("Applet:SecurityError", function(up, err) {
					uploader.trigger('Error', {
						code : plupload.SECURITY_ERROR,
						message : 'Security error.',
						details : err.message,
						file : uploader.getFile(lookup[err.id])
					});
				});

				uploader.bind("Applet:GenericError", function(up, err) {
					uploader.trigger('Error', {
						code : plupload.GENERIC_ERROR,
						message : 'Generic error.',
						details : err.message,
						file : uploader.getFile(lookup[err.id])
					});
				});

				uploader.bind("Applet:IOError", function(up, err) {
					uploader.trigger('Error', {
						code : plupload.IO_ERROR,
						message : 'IO error.',
						details : err.message,
						file : uploader.getFile(lookup[err.id])
					});
				});

				uploader.bind("QueueChanged", function(up) {
					uploader.refresh();
				});

				uploader.bind("FilesRemoved", function(up, files) {
					var i;

					for (i = 0; i < files.length; i++) {
						getAppletObj().removeFile(lookup[files[i].id]);
					}
				});

				uploader.bind("StateChanged", function(up) {
					uploader.refresh();
				});

				uploader.bind("Refresh", function(up) {
					var browseButton, browsePos, browseSize;

					// Set file filters incase it has been changed dynamically
					//getAppletObj().setFileFilters(uploader.settings.filters, uploader.settings.multi_selection);

					browseButton = document.getElementById(up.settings.browse_button);
					browsePos = plupload.getPos(browseButton, document.getElementById(up.settings.container));
					browseSize = plupload.getSize(browseButton);

          // reposition applet
					plupload.extend(document.getElementById(up.id + '_applet_container').style, {
						top : browsePos.y + 'px',
						left : browsePos.x + 'px',
						width : browseSize.w + 'px',
						height : browseSize.h + 'px'
					});
				}); // end refresh

				callback({success : true});
      });    //  end init
    }// end object arg
  });// end add runtime
})(plupload);


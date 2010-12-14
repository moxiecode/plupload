// JSLint defined globals
/*global plupload:false, dojo:false, alert:false */

dojo.require("dojo.NodeList-html"); // NodeList::html()
dojo.require("dojo.NodeList-traverse"); // NodeList::children()
dojo.require("dojo.NodeList-manipulate"); // NodeList::val()

(function(d){
  var $ = d.query;

  var uploaders = {};
  
  function _(str) {
    return plupload.translate(str) || str;
  }

  function renderUI(id, target) {
    // Remove all existing non plupload items
    // Skip -- we don't have anything inside
    target.innerHTML = '<div class="plupload_wrapper plupload_scroll">' +
      '<div id="' + id + '_container" class="plupload_container">' +
       '<div class="plupload">' +
        '<div class="plupload_header">' +
          '<div class="plupload_header_content">' +
           '<div class="plupload_header_title">' + _('Select files') + '</div>' +
           '<div class="plupload_header_text">' + _('Add files to the upload queue and click the start button.') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="plupload_content">' +
          '<div class="plupload_filelist_header">' +
           '<div class="plupload_file_name">' + _('Filename') + '</div>' +
           '<div class="plupload_file_action">&nbsp;</div>' +
           '<div class="plupload_file_status"><span>' + _('Status') + '</span></div>' +
           '<div class="plupload_file_size">' + _('Size') + '</div>' +
           '<div class="plupload_clearer">&nbsp;</div>' +
          '</div>' +

          '<ul id="' + id + '_filelist" class="plupload_filelist"></ul>' +

          '<div class="plupload_filelist_footer">' +
           '<div class="plupload_file_name">' +
            '<span class="plupload_upload_status"></span>' +
           '</div>' +
           '<div class="plupload_file_action"></div>' +
           '<div class="plupload_file_status"><span class="plupload_total_status">0%</span></div>' +
           '<div class="plupload_file_size"><span class="plupload_total_file_size">0 b</span></div>' +
           '<div class="plupload_progress">' +
            '<div class="plupload_progress_container">' +
              '<div class="plupload_progress_bar"></div>' +
            '</div>' +
           '</div>' +
           '<div class="plupload_clearer">&nbsp;</div>' +
           '<div class="plupload_buttons">' +
            '<a href="#" class="plupload_button plupload_add">' + _('Add files') + '</a>' +
            '<a href="#" class="plupload_button plupload_start">' + _('Start upload') + '</a>' +
           '</div>' +
          '</div>' +
        '</div>' +
       '</div>' +
      '</div>' +
      '<input type="hidden" id="' + id + '_count" name="' + id + '_count" value="0" />' +
    '</div>';
  }// renderUI

  function pluploadQueue(target, settings){
  
    var uploader, id;
    id = d.attr(target, 'id');
    if(settings.loader_url){
      target.innerHTML = '<div style="width:100%;text-align:center"><img src="' + settings.loader_url + '" /></div>';
    }

    if(!id){
      id = plupload.guid();
      d.attr(target, 'id', id);
    }

    uploader = new plupload.Uploader(plupload.extend({
      dragdrop : true,
      container : id
    }, settings));
    
    window.uploader = uploader;

    // Call preinit function
    if (settings.preinit) {
      settings.preinit(uploader);
    }
    
    uploaders[id] = uploader;

    function handleStatus(file) {
     var actionClass, title;

     if (file.status == plupload.DONE) {
      actionClass = 'plupload_done';
      title = "done";
     }

     if (file.status == plupload.FAILED) {
      actionClass = 'plupload_failed';
      title = "failed: " + file.error_message;
     }
     
     if (file.status == plupload.QUEUED) {
      actionClass = 'plupload_delete';
      title = "queued";
     }

     if (file.status == plupload.UPLOADING) {
      actionClass = 'plupload_uploading';
      title = "uploading";
     }
     var status_elms = $('#' + file.id).attr('class', actionClass);
     status_elms.query('a').style('display', 'block').attr('title', title);
    }

    function updateTotalProgress() {
     // removed target here
     $('div.plupload_progress').style('display', 'block');
     $('span.plupload_total_status').html(uploader.total.percent + '%');
     $('div.plupload_progress_bar').style('width', uploader.total.percent + '%');
     $('span.plupload_upload_status').html('Uploaded ' + uploader.total.uploaded + '/' + uploader.files.length + ' files');
     
     // All files are uploaded
     if (uploader.total.uploaded == uploader.files.length) {
      uploader.stop();
     }
    }

    function updateList() {
      var fileList = $('ul.plupload_filelist', target), 
      inputCount = 0, 
      inputHTML,
      hasQueuedFiles = false;

      fileList.html('');
      
      plupload.each(uploader.files, function(file) {
        inputHTML = '';
        
        if (file.status == plupload.DONE) {
          if (file.target_name) {
            inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_tmpname" value="' + plupload.xmlEncode(file.target_name) + '" />';
          }
          inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_name" value="' + plupload.xmlEncode(file.name) + '" />';
          inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_status" value="' + (file.status == plupload.DONE ? 'done' : 'failed') + '" />';
          inputCount++;
          $('#' + id + '_count').val(inputCount);
        } else if(file.status == plupload.QUEUED){
          hasQueuedFiles = true;
        }
                      
        fileList.addContent(
         '<li id="' + file.id + '">' +
          '<div class="plupload_file_name"><span>' + file.name + '</span></div>' +
          '<div class="plupload_file_action"><a href="#"></a></div>' +
          '<div class="plupload_file_status">' + file.percent + '%</div>' +
          '<div class="plupload_file_size">' + plupload.formatSize(file.size) + '</div>' +
          '<div class="plupload_clearer">&nbsp;</div>' +
          inputHTML +
        '</li>');
        
        handleStatus(file);
        
        $('#' + file.id + '.plupload_delete a').onclick(function(e) {
          $('#' + file.id).empty();
          uploader.removeFile(file);
          e.preventDefault();
        });
      });

      $('a.plupload_start', target).toggleClass('plupload_disabled', !hasQueuedFiles || uploader.state === plupload.STARTED);
      $('span.plupload_total_file_size', target).html(plupload.formatSize(uploader.total.size));
      
      // What plupload_add_text?
      // if (uploader.total.queued === 0) {
      //  $('span.plupload_add_text', target).text(_('Add files.'));
      // } else {
      //  $('span.plupload_add_text', target).text(uploader.total.queued + ' files queued.');
      // }
       
      // Scroll to end of file list
      fileList[0].scrollTop = fileList[0].scrollHeight;
      
      updateTotalProgress();
      
      // Re-add drag message if there is no files
      if (!uploader.files.length && uploader.features.dragdrop && uploader.settings.dragdrop) {
       d.place('<li class="plupload_droptext">' + _("Drag files here.") + '</li>', id + '_filelist', 'last');
      }
    }//updateList

    // Event handlers
    uploader.bind('Init', function(up, res) {
      renderUI(id, target);
      
      $('a.plupload_add', target).attr('id', id + '_browse');
      
      up.settings.browse_button = id + '_browse';
      
      // Enable drag/drop
      if (up.features.dragdrop && up.settings.dragdrop) {
        up.settings.drop_element = id + '_filelist';
        d.place('<li class="plupload_droptext">' + _("Drag files here.") + '</li>', id + '_filelist', 'last');
      }
      
      $('#' + id + '_container').attr('title', 'Using runtime: ' + res.runtime);
      
      $('a.plupload_add', target).onclick(function(e){ 
        var old_files = [];
        plupload.each(uploader.files, function(file){
          if(file.status == plupload.DONE || file.status == plupload.FAILED){
            old_files.push(file);
          }
        });  
        plupload.each(old_files, function(file){
          $('#' + file.id).empty();
          uploader.removeFile(file);
        });
        uploader.selectFiles();           
        e.preventDefault();
      });
    
      $('a.plupload_start', target).onclick(function(e) {
        if (!d.hasClass(target, 'plupload_disabled')) {
          uploader.start();
          $('a.plupload_start', target).toggleClass('plupload_disabled', true);
        }
        e.preventDefault();
      });
      
      $('a.plupload_stop', target).onclick(function(e) {
        var finished = true;
        uploader.stop();
        $('a.plupload_start', target).toggleClass('plupload_disabled', !finished);
        e.preventDefault();
      });
      
      // Initially start button is disabled.
      $('a.plupload_start', target).addClass('plupload_disabled');
    
    });// end uploader.bind('Init',...

    uploader.init();
    
    uploader.bind("Error", function(up, err) {
      var file = err.file, message;
    
      if (file) {
        message = err.message;
       
        if (err.details) {
          message += " (" + err.details + ")";
          alert(_("Error: ") + message); 
        }
       
        if (err.code == plupload.FILE_SIZE_ERROR) {
          alert(_("Error: File to large: ") + file.name);
        }
        
        if (err.code == plupload.FILE_EXTENSION_ERROR) {
          alert(_("Error: Invalid file extension: ") + file.name);
        }
      }
    });

    uploader.bind('StateChanged', function() {
      if (uploader.state === plupload.STARTED) {
         // $('li.plupload_delete a,div.plupload_buttons', target).style('display', 'none');
         // removed target so we can have the progressbar several place
         $('span.plupload_upload_status,div.plupload_progress,a.plupload_stop', target).style('display', 'block');
         $('span.plupload_upload_status', target).html('Uploaded 0/' + uploader.files.length + ' files');
      } 
      else {
        $('a.plupload_stop,div.plupload_progress', target).style('display', 'none');
        $('a.plupload_delete', target).style('display', 'block');
      }
    });
  
    uploader.bind('QueueChanged', updateList);
    
    uploader.bind('StateChanged', function(up) {
      if (up.state == plupload.STOPPED) {
        updateList();
      }
    });
    
    uploader.bind('FileUploaded', function(up, file) {
      handleStatus(file);
    });
    
    uploader.bind("UploadProgress", function(up, file) {
      // Set file specific progress
      $('#' + file.id + ' div.plupload_file_status', target).html(file.percent + '%');
      
      handleStatus(file);
      updateTotalProgress();
    });
    
    // Call setup function
    if (settings.setup) {
      settings.setup(uploader);
    }
  }//pluploadQueue

  dojo.extend(dojo.NodeList, {
    pluploadQueue: dojo.NodeList._adaptAsForEach(pluploadQueue)
  });

})(dojo);
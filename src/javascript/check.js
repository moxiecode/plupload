(function($){

   // note: navigator.mimeTypes in safari only includes 'application/x-java-applet
   var versions = ['1.4.2', '1.5','1.6','1.7'],
       java_url = 'http://java.com/en/download/manual.jsp',
       has_java,
       _version = "-1";

   function set_highest_version(potential_new_version){
     if(potential_new_version > _version){
       _version = potential_new_version;
     }
   }
   
   function populateVersions(){
     if(navigator.userAgent.indexOf("MSIE") != -1){
       populateVersionsIE();
     }
     else{
       populateVersionsNotIE();
     }
   }
   
   function populateVersionsIE(){

     // 1.5 -> 1.5.0.0
     function pad(version){
       var max_dots = 3;
       var dots = version.replace(/[^.]/g, '').length;
       for(; dots < max_dots; dots++){
         version = version + ".0";
       }
       return version;
     }
     
     for(var i = 0; i < versions.length; i++){
       var version = pad(versions[i]);
       
       try{
         if(new ActiveXObject('JavaWebStart.isInstalled.' + version) != null){
           set_highest_version(version);
         }
       }
       catch(e){
       }
     }
   }
   
   function populateVersionsNotIE(){
      if(navigator.mimeTypes){
        for(var i = 0; i < versions.length; i++){
          var version = versions[i];
          if(navigator.mimeTypes['application/x-java-applet;version=' + version]){      
            set_highest_version(version);
          }
        }
        // add the general one under ''
        if(navigator.mimeTypes['application/x-java-applet']){      
          set_highest_version("");
        }
      }
   }

   function isEnabled(min_version){

     if(navigator.vendor && navigator.vendor.indexOf("Apple")){
       // safari
       return has_java;
     }
     
     if(min_version !== undefined){
       return min_version <= _version;
     }
     else{
       return has_java;
     }
   }

   // init
   populateVersions();       
   has_java = (_version === "-1") ? false : true;

   $.javaplugin = {
     isEnabled: isEnabled,
     java_url: java_url,
     version: _version,
     present: has_java
   };

 })(window);

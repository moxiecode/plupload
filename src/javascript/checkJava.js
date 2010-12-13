(function(window){

   // hardcoding to min 1.5 for now
   // safari doesn't append versions to mimeTypes!
   var versions = ['', '1.5','1.6','1.7'],
       java_url = 'http://java.com/en/download/manual.jsp',
       has_java;
   
   function javaIETest(){
     for(var i = 0; i < versions.length; i++){
       version = versions[i];
       try{
         if(new ActiveXObject('JavaWebStart.isInstalled.' + version + '.0.0') != null){
           return true;
         }
       }
       catch(e){}
     }
     return false;
   }
   
   function javaNotIETest(){
      if(navigator.mimeTypes){
        for(var i = 0; i < versions.length; i++){
          version = versions[i];
          if(navigator.mimeTypes['application/x-java-applet;version=' + version]){      
            return true;
          }
        }
      }
      return false;                     
   }
   
   function isEnabled(){
     if(has_java !== undefined){
       return has_java;
     }
     if(navigator.userAgent.indexOf("MSIE") != -1){
       has_java = javaIETest();
     }
     else{
       has_java = javaNotIETest();
     }
     return has_java;
   }

   window.java = {
     isEnabled: isEnabled,
     java_url: java_url
   };
   
 })(window);

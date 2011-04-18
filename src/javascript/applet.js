(function($){

  function paramify(key, value){
    return '  <param name="' + key + '" value="' + value + '" />';      
  }

  function hasJava(){
    if(!$.javaplugin.present){
      return false;
    }
    return true;
  }

  $.applet = {

    inject: function(node, args){

      if(!hasJava()){
        return;
      }
      var id = args.id,
          width = args.width || "1",
          heigth = args.heigth || "1",
          params = [];

      for(var k in args){
        params.push(paramify(k, args[k]));
      }

      var t = [
        '<object id="' + id + '" type="application/x-java-applet" width="' + width + '" height="' + heigth + '">',
        '  <param name="mayscript" value="true" />',
        params.join('\n'),
        '</object>'].join('\n');
      setTimeout(function(){
        node.innerHTML = t;
      }, 0);
    }
  };

})(window);
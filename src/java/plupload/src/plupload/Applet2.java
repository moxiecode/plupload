package plupload;
import netscape.javascript.JSObject;

public class Applet2 extends java.applet.Applet{
	
	private JSObject js;
	private String callback;
	
	public void init(){
		js = JSObject.getWindow(this);
		callback = getRequiredParameter("callback");
	}
	
	protected String getParameter(String name, String default_value){
		String value = getParameter(name);
		if(value == null){
			return default_value;
		}
		else{
			return value;
		}
	}

	protected String getRequiredParameter(String name){
		String value = getParameter(name);
		if(value == null){
			throw new RuntimeException("Missing required parameter: " + name);			
		}
		return value;
	}
	
	protected void publishEvent(Object event, Object ... args){
		String js_args = "'" + event + "'";
		for(Object a : args){
			js_args += ", '" + a.toString() + "'"; 
		}		
		js.eval(callback + "(" + js_args + ")");
	}
}

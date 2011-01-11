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
		try{
			return getParameter(name);
		}
		catch(NullPointerException e){
			return default_value;
		}
	}

	protected String getRequiredParameter(String name){
		String value = null;
		try{
			value = getParameter(name);
		}
		catch(NullPointerException e){}
		
		if(value == null){
			throw new RuntimeException("Missing required parameter: " + name);
		}
		return value;
	}
	
	protected void publishEvent(String event, Object ... args){
		String js_args = "'" + event + "'";
		for(Object a : args){
			js_args += ", '" + a.toString() + "'"; 
		}		
		js.eval(callback + "(" + js_args + ")");
	}
}

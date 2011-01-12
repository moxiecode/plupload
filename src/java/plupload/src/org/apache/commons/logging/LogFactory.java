package org.apache.commons.logging;

public class LogFactory {

	private static Log log;
	
	public static Log getLog(Class c) {
		if(log == null){
			log = new SystemLog();
		}
		return log;
	}
	
	public static Log getLog(String s) {
		if(log == null){
			log = new SystemLog();
		}
		return log;
	}

}

package plupload;

import java.util.HashMap;
import java.util.Map;

import org.apache.http.HttpVersion;
import org.apache.http.client.HttpClient;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.CoreProtocolPNames;
import org.apache.http.params.HttpParams;


public class HttpUtil {

	private static HttpClient httpclient;
	
	public static Map<String, String> parse_qs(String qs){
		// i.d, not handling the general case where a list is possible
		Map<String, String> map = new HashMap<String, String>();  
		for (String param : qs.split("&")){  
			String[] split = param.split("=");
			String name = split[0];  
			String value = split[1];  
			map.put(name, value);  
		}  
		return map;
	}
	
	public static HttpClient getHttpClient(){
		if(httpclient != null){
			return httpclient;
		}
		HttpParams params = new BasicHttpParams();
		// Reuse connections. Very important for performance! 
		params.setParameter(CoreProtocolPNames.PROTOCOL_VERSION,
				HttpVersion.HTTP_1_1);
		
		httpclient = new DefaultHttpClient(params);
		return httpclient;
	}
}

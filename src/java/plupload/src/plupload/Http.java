package plupload;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.HttpVersion;
import org.apache.http.NameValuePair;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.entity.InputStreamEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.CoreProtocolPNames;
import org.apache.http.params.HttpParams;
import org.apache.http.util.EntityUtils;

public class Http {

	public static HttpClient httpclient;

	public static int CHUNK_SIZE = 10 * (int) Math.pow(2, 20);
	public static int CHUNK_RETRIES = 3;

	static {
		HttpParams params = new BasicHttpParams();
		// Reuse connections. Very important for performance! 
		params.setParameter(CoreProtocolPNames.PROTOCOL_VERSION,
				HttpVersion.HTTP_1_1);
		httpclient = new DefaultHttpClient(params);
	}

	public static String getQueryParams(long chunk, long chunks, int chunk_size, String md5hex_total,
			String md5hex_chunk, String name) {
		List<NameValuePair> q = new ArrayList<NameValuePair>();
		q.add(new BasicNameValuePair("chunk", Long.toString(chunk)));
		q.add(new BasicNameValuePair("chunks", Long.toString(chunks)));
		q.add(new BasicNameValuePair("chunk_size", Integer.toString(chunk_size)));
		q.add(new BasicNameValuePair("md5chunk", md5hex_chunk));
		q.add(new BasicNameValuePair("md5total", md5hex_total));
		q.add(new BasicNameValuePair("name", name));
		return URLEncodedUtils.format(q, "UTF-8");
	}

	public static int sendChunk(byte[] data, int len, int chunk, long chunks,
			String name, URI uri) throws NoSuchAlgorithmException, URISyntaxException,
			ClientProtocolException, IOException {
		
		InputStreamEntity entity = new InputStreamEntity(
				new ByteArrayInputStream(data), len);
		entity.setContentType("application/octet-stream");

		HttpPost httppost = new HttpPost(uri);
		httppost.setEntity(entity);

		HttpResponse response = httpclient.execute(httppost);

		HttpEntity resEntity = response.getEntity();
		int status_code = response.getStatusLine().getStatusCode();

		if (resEntity != null) {
			resEntity.consumeContent();
		}

		if (status_code != 200) {
			if (CHUNK_RETRIES > 0) {
				CHUNK_RETRIES--;
				sendChunk(data, len, chunk, chunks, name, uri);
			} else {
				throw new IOException(Integer.toString(status_code));
			}
		}
		return status_code;
	}
	
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
	
	public static Map<String, String> probe(URI uri) throws ClientProtocolException, IOException{
		HttpGet get = new HttpGet(uri);
		HttpResponse response = httpclient.execute(get);
		String body = EntityUtils.toString(response.getEntity());
		return parse_qs(body);
	}

//	public static void sendFile(PluploadFile file)
//			throws NoSuchAlgorithmException, ClientProtocolException,
//			URISyntaxException, IOException {
//		InputStream in = new BufferedInputStream(
//				new FileInputStream(file.file), CHUNK_SIZE);
//		String name = file.name;
//
//		long chunks = (file.size + CHUNK_SIZE - 1) / CHUNK_SIZE;
//		byte[] buffer = new byte[CHUNK_SIZE];
//		int chunk = 0;
//		while (true) {
//			if (-1 == in.read(buffer)) {
//				break;
//			}
//			MessageDigest md5 = MessageDigest.getInstance("MD5");
//			md5.update(buffer);
//			String md5hex = hexdigest(md5);
//			String params = getQueryParams(chunk, chunks, md5hex, name);
//			URI uri = URIUtils.createURI("http", "localhost", 5000, "/", params, null);
//			sendChunk(buffer, chunk, chunks, name, uri);
//			chunk++;
//		}
//	}

//	public static void main(String[] args) throws Exception {
//		if (args.length != 1) {
//			System.out.println("File path not given");
//			System.exit(1);
//		}
//
//		PluploadFile file = new PluploadFile(0, new File(args[0]));
//		sendFile(file);

		// FileEntity entity = new FileEntity(file, "application/octet-stream");
		// MultipartEntity entity = new MultipartEntity();
		// entity.addPart("file", new FileBody(file,
		// "application/octet-stream"));

		// reqEntity.setChunked(true);
		// It may be more appropriate to use FileEntity class in this particular
		// instance but we are using a more generic InputStreamEntity to
		// demonstrate
		// the capability to stream out data from any arbitrary source
		// 
		// FileEntity entity = new FileEntity(file, "binary/octet-stream");

		// When HttpClient instance is no longer needed,
		// shut down the connection manager to ensure
		// immediate deallocation of all system resources
//		httpclient.getConnectionManager().shutdown();
//	}
}

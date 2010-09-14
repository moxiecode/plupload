package plupload;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.HttpVersion;
import org.apache.http.NameValuePair;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.URIUtils;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.entity.InputStreamEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.CoreProtocolPNames;
import org.apache.http.params.HttpParams;

public class Uploader {

	public static HttpClient httpclient;

	public static int CHUNK_SIZE = 10 * (int) Math.pow(2, 20);
	public static int CHUNK_RETRIES = 3;

	static {
		HttpParams params = new BasicHttpParams();
		params.setParameter(CoreProtocolPNames.PROTOCOL_VERSION,
				HttpVersion.HTTP_1_1);
		System.out.println("after setParameter http version");

		httpclient = new DefaultHttpClient(params);
	}

	public static String getQueryParams(long chunk, long chunks, String md5,
			String name) {
		List<NameValuePair> q = new ArrayList<NameValuePair>();
		q.add(new BasicNameValuePair("chunk", Long.toString(chunk)));
		q.add(new BasicNameValuePair("chunks", Long.toString(chunks)));
		q.add(new BasicNameValuePair("md5", md5));
		q.add(new BasicNameValuePair("name", name));
		return URLEncodedUtils.format(q, "UTF-8");
	}

	public static String hexdigest(byte[] data) {
		try {
			byte[] md5 = MessageDigest.getInstance("MD5").digest(data);
			StringBuffer hex = new StringBuffer();
			for (int i = 0; i < md5.length; i++) {
				hex.append(Integer.toHexString((md5[i] >> 4) & 0x0f));
				hex.append(Integer.toHexString(md5[i] & 0x0f));
			}
			return hex.toString();
		} catch (NoSuchAlgorithmException e) {
			throw new RuntimeException("What doesn't have MD5???");
		}
	}

	public static int sendChunk(byte[] data, int chunk, long chunks,
			String name, URI uri) throws NoSuchAlgorithmException, URISyntaxException,
			ClientProtocolException, IOException {
		
		System.out.println("Uploader.sendChunk");
		
		InputStreamEntity entity = new InputStreamEntity(
				new ByteArrayInputStream(data), data.length);
		entity.setContentType("application/octet-stream");

		HttpPost httppost = new HttpPost(uri);
		httppost.setEntity(entity);

//		long b = System.currentTimeMillis();
//		Main.log("before execute");
		HttpResponse response = httpclient.execute(httppost);
//		System.out.println("Execute duration: "
//				+ (System.currentTimeMillis() - b) + "ms");

		HttpEntity resEntity = response.getEntity();
		int status_code = response.getStatusLine().getStatusCode();

		if (resEntity != null) {
			resEntity.consumeContent();
		}

		if (status_code != 200) {
			if (CHUNK_RETRIES > 0) {
				CHUNK_RETRIES--;
				sendChunk(data, chunk, chunks, name, uri);
			} else {
				return status_code;
			}
		}
		return status_code;
	}

	public static void sendFile(PluploadFile file)
			throws NoSuchAlgorithmException, ClientProtocolException,
			URISyntaxException, IOException {
		InputStream in = new BufferedInputStream(
				new FileInputStream(file.file), CHUNK_SIZE);
		String name = file.name;

		long chunks = (file.size + CHUNK_SIZE - 1) / CHUNK_SIZE;
		byte[] buffer = new byte[CHUNK_SIZE];
		int chunk = 0;
		while (true) {
			if (-1 == in.read(buffer)) {
				break;
			}
			String md5 = hexdigest(buffer);
			String params = getQueryParams(chunk, chunks, md5, name);
			URI uri = URIUtils.createURI("http", "localhost", 5000, "/", params, null);
			sendChunk(buffer, chunk, chunks, name, uri);
			chunk++;
		}
	}

	public static void main(String[] args) throws Exception {
		if (args.length != 1) {
			System.out.println("File path not given");
			System.exit(1);
		}

		PluploadFile file = new PluploadFile(0, new File(args[0]));
		sendFile(file);

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
		httpclient.getConnectionManager().shutdown();
	}
}

package plupload;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import netscape.javascript.JSObject;

import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.utils.URIUtils;

public class PluploadFile {

	private List<FileUploadListener> file_upload_listeners = new ArrayList<FileUploadListener>();

	public int id;
	public String name;
	public long size;
	public long chunks;
	public int chunk;
	public int server_chunk;
	public File file;
	public int chunk_size;
	public byte[] buffer;
	public InputStream stream;
	public URI uri;
	public int loaded;
	public String md5hex_server_total;
	public String md5hex_chunk;
	public String md5hex_total;
	MessageDigest md5_total;

	public PluploadFile(int id, File file) {
		this.id = id;
		this.name = file.getName();
		this.size = file.length();
		this.file = file;
		try {
			md5_total = MessageDigest.getInstance("MD5");
		} catch (NoSuchAlgorithmException e) {
			System.err.println("What, no MD5?");
		}
	}

	public void upload(String upload_uri, JSObject settings)
			throws IOException, NoSuchAlgorithmException, URISyntaxException {
		uri = new URI(upload_uri);

		chunk_size = (Integer) settings.getMember("chunk_size");
		stream = new BufferedInputStream(new FileInputStream(file), chunk_size);
		chunks = (size + chunk_size - 1) / chunk_size;
		buffer = new byte[chunk_size];
		chunk = 0;
		loaded = 0;

		Map<String, String> result = Uploader.probe(getProbeUri());

		if (result.get("status").equals("uploading")) {
			server_chunk = Integer.parseInt(result.get("chunk"));
			md5hex_server_total = result.get("md5");
			skipNextChunk();
		} else if (result.get("status").equals("finished")) {
			throw new IOException("File is already uploaded to server!");
		} else{
			uploadNextChunk();	
		}
	}
	
	public void skipNextChunk() throws IOException{
		int bytes_read = stream.read(buffer);
		// the finished check is done in JS
		
		md5_total.update(buffer, 0, bytes_read);
		
		loaded += bytes_read;
		chunk++;

		uploadProcessAction();
		skipChunkCompleteAction();
	}
	
	public boolean checkIntegrity(){
		return Uploader.hexdigest(md5_total).equals(md5hex_server_total);
	}

	public void uploadNextChunk() throws NoSuchAlgorithmException,
			ClientProtocolException, URISyntaxException, IOException {

		int bytes_read = stream.read(buffer);
		// the finished check is done in JS
		
		MessageDigest md5_chunk = MessageDigest.getInstance("MD5");
		md5_chunk.reset();
		
		md5_chunk.update(buffer, 0, bytes_read);
		md5_total.update(buffer, 0, bytes_read);

		md5hex_total = Uploader.hexdigest(md5_total);
		md5hex_chunk = Uploader.hexdigest(md5_chunk);

		Uploader.sendChunk(buffer, bytes_read, chunk, chunks, name, getUploadUri());

		loaded += bytes_read;
		chunk++;

		chunkCompleteAction();
		uploadProcessAction();
	}

	public URI getUploadUri() throws URISyntaxException {
		String params = Uploader.getQueryParams(chunk, chunks, chunk_size,
				md5hex_total, md5hex_chunk, name);
		String query = uri.getQuery() != null ? uri.getQuery() + "&" + params
				: params;
		URI upload_uri = URIUtils.createURI(uri.getScheme(), uri.getHost(), uri
				.getPort(), uri.getPath(), query, null);
		return upload_uri;
	}

	public URI getProbeUri() throws URISyntaxException, UnsupportedEncodingException {
		String params = "name=" + URLEncoder.encode(name, "UTF-8");
		String query = uri.getQuery() != null ? uri.getQuery() + "&" + params
				: params;
		return URIUtils.createURI(uri.getScheme(), uri.getHost(),
				uri.getPort(), uri.getPath(), query, null);
	}

	public void addFileUploadListener(FileUploadListener listener) {
		file_upload_listeners.add(listener);
	}

	private void skipChunkCompleteAction() {
		for (FileUploadListener f : file_upload_listeners) {
			f.skipChunkComplete(this);
		}
		
	}
	private void chunkCompleteAction() {
		for (FileUploadListener f : file_upload_listeners) {
			f.uploadChunkComplete(this);
		}
	}

	private void uploadProcessAction() {
		for (FileUploadListener f : file_upload_listeners) {
			f.uploadProcess(this);
		}
	}

}

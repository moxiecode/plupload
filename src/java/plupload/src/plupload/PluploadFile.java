package plupload;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
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

	// accessible from JS
	public int id;
	public byte[] buffer;
	public int chunk;			// current chunk number
	public int chunk_size;
	public long chunks;			// chunks uploaded at client
	public int chunk_server; 	// chunks uploaded at server
	public File file;
	public long loaded;			// bytes uploaded
	public String name;
	public boolean overwrite = false;
	public long size;			

	private URI uri;
	private String md5hex_server_total;
	private String md5hex_total;
	private MessageDigest md5_total;
	private String md5hex_chunk;
	private List<FileUploadListener> file_upload_listeners = new ArrayList<FileUploadListener>();
	private InputStream stream;

	public PluploadFile(int id, File file) {
		this.id = id;
		this.name = file.getName();
		this.size = file.length();
		this.file = file;
		try {
			md5_total = MessageDigest.getInstance("MD5");
		} catch (NoSuchAlgorithmException e) {
			throw new RuntimeException("WTF, no MD5?");
		}
	}

	private void prepare(String upload_uri, JSObject settings)
			throws URISyntaxException, FileNotFoundException {
		uri = new URI(upload_uri);
		chunk_size = (Integer) settings.getMember("chunk_size");
		stream = new BufferedInputStream(new FileInputStream(file), chunk_size);
		chunks = (size + chunk_size - 1) / chunk_size;
		buffer = new byte[chunk_size];
		chunk = 0;
		loaded = 0;
		Http.CHUNK_SIZE = chunk_size;
		// TODO: set from JS
		Http.CHUNK_RETRIES = 3;
	}

	public void upload(String upload_uri, JSObject settings)
			throws IOException, NoSuchAlgorithmException, URISyntaxException {

		prepare(upload_uri, settings);

		if (!overwrite) {
			Map<String, String> result = Http.probe(getProbeUri());
			String status = result.get("status");

			if (status.equals("uploading")) {
				chunk_server = Integer.parseInt(result.get("chunk"));
				int server_chunks = Integer.parseInt(result.get("chunks"));
				if (server_chunks == chunks) { 
					md5hex_server_total = result.get("md5");
					skipNextChunk();
				} else {
					// file is modified for sure, so don't run through all the chunks
					// start over
					uploadNextChunk();
				}
			} else if (status.equals("unknown")) {
				uploadNextChunk();
			} else if (status.equals("finished")) {
				throw new IOException("A file with that name is already uploaded to server!");
			} else {
				System.err.println("WTF?");
			}
		}
		else{
			uploadNextChunk();
		}
	}

	public void skipNextChunk() throws IOException {
		int bytes_read = stream.read(buffer);
		// the finished check and integrity check is done in JS

		md5_total.update(buffer, 0, bytes_read);

		loaded += bytes_read;
		chunk++;

		uploadProcessAction();
		skipChunkCompleteAction();
	}

	public boolean checkIntegrity() {
		return HashUtil.hexdigest(md5_total).equals(md5hex_server_total);
	}

	public void uploadNextChunk() throws NoSuchAlgorithmException,
			ClientProtocolException, URISyntaxException, IOException {

		int bytes_read = stream.read(buffer);
		// the finished check is done in JS

		MessageDigest md5_chunk = MessageDigest.getInstance("MD5");
		md5_chunk.update(buffer, 0, bytes_read);
		md5_total.update(buffer, 0, bytes_read);

		md5hex_total = HashUtil.hexdigest(md5_total, true);
		md5hex_chunk = HashUtil.hexdigest(md5_chunk);

		Http.sendChunk(buffer, bytes_read, chunk, chunks, name,
				getUploadUri());

		loaded += bytes_read;
		chunk++;

		chunkCompleteAction();
		uploadProcessAction();
	}

	public URI getUploadUri() throws URISyntaxException {
		String params = Http.getQueryParams(chunk, chunks, chunk_size,
				md5hex_total, md5hex_chunk, name);
		String query = uri.getQuery() != null ? uri.getQuery() + "&" + params
				: params;
		URI upload_uri = URIUtils.createURI(uri.getScheme(), uri.getHost(), uri
				.getPort(), uri.getPath(), query, null);
		return upload_uri;
	}

	public URI getProbeUri() throws URISyntaxException,
			UnsupportedEncodingException {
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

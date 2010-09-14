package plupload;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;

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
	public File file;
	public int chunk_size;
	public byte[] buffer;
	public InputStream stream;
	public URI uri;
	public int loaded;

	public PluploadFile(int id, File file) {
		this.id = id;
		this.name = file.getName();
		this.size = file.length();
		this.file = file;
	}

	public byte[] getNextChunk(byte[] buffer) {
		return new byte[] {};
	}

	public void upload(String url, JSObject settings) throws IOException,
			NoSuchAlgorithmException, URISyntaxException {
		chunk_size = (Integer) settings.getMember("chunk_size");
		stream = new BufferedInputStream(new FileInputStream(file), chunk_size);
		chunks = (size + chunk_size - 1) / chunk_size;
		buffer = new byte[chunk_size];
		chunk = 0;
		loaded = 0;
		uploadNextChunk();
	}

	public boolean uploadNextChunk() throws NoSuchAlgorithmException,
			ClientProtocolException, URISyntaxException, IOException {
		try {
			int bytes_read = stream.read(buffer);
			if (bytes_read == -1) {
				return true;
			}
			Plupload.log("Java:uploadNextChunk" + chunk, chunks, name);

			String md5 = Uploader.hexdigest(buffer);
			String params = Uploader.getQueryParams(chunk, chunks, md5, name);
			URI uri = URIUtils.createURI("http", "localhost", 5000, "/",
					params, null);
			Uploader.sendChunk(buffer, chunk, chunks, name, uri);

			loaded += bytes_read;
			chunk++;

			chunkCompleteAction();
			uploadProcessAction();

			return false;
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}
	}

	public void addFileUploadListener(FileUploadListener listener) {
		file_upload_listeners.add(listener);
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

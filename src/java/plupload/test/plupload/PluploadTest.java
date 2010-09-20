package plupload;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.apache.http.client.ClientProtocolException;
import org.junit.Test;


public class UploaderTest {

	@Test
	public void testGetQueryParams() {
		String query = Http.getQueryParams(1, 1, 1024, "abc", "dfg", "file.img");
		System.out.println(query);
		assertEquals(query, "chunk=1&chunks=1&chunk_size=1024&md5chunk=dfg&md5total=abc&name=file.img");
	}

	@Test
	public void testHexdigest() throws NoSuchAlgorithmException, IOException {
		File file = new File(getClass().getResource("/resources/Lenna.png").getFile());
		InputStream stream = new BufferedInputStream(new FileInputStream(file));
		MessageDigest md5 = MessageDigest.getInstance("MD5");
		byte[] buffer = new byte[1024];
		while (true) {
			int bytes_read = stream.read(buffer);
			if (-1 == bytes_read) {
				break;
			}
			md5.update(buffer, 0, bytes_read);
		}
		String hexdigest = HashUtil.hexdigest(md5);
		assertEquals(hexdigest, "55fb6115c4ce1b41af858f56da5d729d");
	}

//	@Test
//	public void testSendChunk() throws NoSuchAlgorithmException, ClientProtocolException, URISyntaxException, IOException {
//		byte[] data = new byte[]{1,2,3};
//		MessageDigest md5 = MessageDigest.getInstance("MD5");
//		md5.update(data);
//        String digest = Uploader.hexdigest(md5);
//		URI uri = new URI("http://localhost:5000/?name=foo&chunk=0&chunks=1&md5=" + digest);
//		int status_code = Uploader.sendChunk(data, 0, 1, "foo", uri);
//		assertEquals(200, status_code);
//	}


}

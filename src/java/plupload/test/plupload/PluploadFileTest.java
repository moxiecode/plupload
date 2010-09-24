package plupload;

import static org.junit.Assert.*;

import java.io.File;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URISyntaxException;

import netscape.javascript.JSObject;

import org.junit.Test;

public class PluploadFileTest {

	@Test
	public void testGetUploadUri() throws URISyntaxException, IOException {
		PluploadFile file = new PluploadFile(1, new File(getClass().getResource("/resources/upload_button.png").getFile()));
		file.prepare("http://localhost", 1024, 10, "");
		assertEquals(file.getUploadUri().toString(), "http://localhost/?chunk=0&chunks=2&chunk_size=1024&md5chunk=&md5total=&name=upload_button.png");
	}

	@Test
	public void testGetProbeUri() throws URISyntaxException, IOException {
		PluploadFile file = new PluploadFile(1, new File(getClass().getResource("/resources/upload_button.png").getFile()));
		file.prepare("http://localhost", 1024, 10, "");
		assertEquals(file.getProbeUri().toString(), "http://localhost/?name=upload_button.png");
	}

}

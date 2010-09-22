package plupload;

import static org.junit.Assert.assertEquals;

import org.junit.Test;


public class HttpUploaderTest {
	
	@Test
	public void testGetQueryParams() {
		String query = HttpUploader.getQueryParams(1, 1, 1024, "abc", "dfg", "file.img");
		System.out.println(query);
		assertEquals(query, "chunk=1&chunks=1&chunk_size=1024&md5chunk=dfg&md5total=abc&name=file.img");
	}
}

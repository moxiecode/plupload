package plupload;

import static org.junit.Assert.assertEquals;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.junit.Test;

public class HashUtilTest {

//	@Test
//	public void testHexdigest() throws NoSuchAlgorithmException, IOException {
//		File file = new File(getClass().getResource("/resources/upload_button.png").getFile());
//		InputStream stream = new BufferedInputStream(new FileInputStream(file));
//		MessageDigest md5 = MessageDigest.getInstance("MD5");
//		byte[] buffer = new byte[1024];
//		while (true) {
//			int bytes_read = stream.read(buffer);
//			if (-1 == bytes_read) {
//				break;
//			}
//			md5.update(buffer, 0, bytes_read);
//		}
//		String hexdigest = HashUtil.hexdigest(md5);
//		assertEquals(hexdigest, "4a78bcd801cc07a306ec100a6a804663");
//	}
}

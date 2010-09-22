package plupload;
import static org.junit.Assert.*;

import java.util.Map;

import org.junit.Test;


public class HttpUtilTest {

	@Test
	public void testParse_qs() {
		Map<String, String> query = HttpUtil.parse_qs("foo=bar&bar=foo");
		assertEquals(query.get("foo"), "bar");
		assertEquals(query.get("bar"), "foo");
	}

}

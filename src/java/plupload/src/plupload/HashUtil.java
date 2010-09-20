package plupload;

import java.security.MessageDigest;

public class HashUtil {

	public static String hexdigest(MessageDigest md5, boolean clone) {
		StringBuffer hex = new StringBuffer();
		byte[] digest = null;
		try{
			// clone so we can continue using the digest object
			if(clone){
				md5 = (MessageDigest)md5.clone();
			}
			digest = md5.digest();		
		}
		catch(CloneNotSupportedException e){}
		for (int i = 0; i < digest.length; i++) {
			hex.append(Integer.toHexString((digest[i] >> 4) & 0x0f));
			hex.append(Integer.toHexString(digest[i] & 0x0f));
		}
		return hex.toString();
	}

	public static String hexdigest(MessageDigest md5){
		return hexdigest(md5, false);
	}

}

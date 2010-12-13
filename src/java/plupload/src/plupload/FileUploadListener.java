package plupload;

import java.io.IOException;

public interface FileUploadListener {
	
	public void uploadProcess(PluploadFile file);

	public void ioError(IOException e);
	
	public void genericError(Exception e);
	
}

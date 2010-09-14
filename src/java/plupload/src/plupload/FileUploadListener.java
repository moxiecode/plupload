package plupload;

public interface FileUploadListener {

	public void uploadChunkComplete(PluploadFile file);
	
	public void uploadProcess(PluploadFile file);
	
}

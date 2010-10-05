package plupload;

public class PluploadError {

	public String message;
	public String id;
	
	public PluploadError(String message, String fileId){
		this.message = message;
		this.id = fileId;
	}
	
	public String toString(){
		return "{\"message\":\"" + message + "\",\"id\":\"" + id + "\"}";
	}
}

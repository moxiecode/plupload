package plupload;

import java.io.File;
import java.io.IOException;
import java.security.AccessControlException;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.security.PrivilegedActionException;
import java.security.PrivilegedExceptionAction;
import java.util.HashMap;
import java.util.Map;

import javax.swing.JApplet;
import javax.swing.JFileChooser;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;

import netscape.javascript.JSException;
import netscape.javascript.JSObject;

public class Plupload extends JApplet {

	// window.console
	static JSObject console;

	// events
	static final String CLICK = "Click";
	static final String SELECT_FILE = "SelectFiles"; // we only select one at a
	static final String UPLOAD_PROCESS = "UploadProcess";
	static final String UPLOAD_CHUNK_COMPLETE = "UploadChunkComplete";
	static final String SKIP_UPLOAD_CHUNK_COMPLETE = "SkipUploadChunkComplete";
	static final String IO_ERROR = "IOError";

	// plupload.applet
	private PluploadFile current_file;
	private JFileChooser dialog;
	private boolean dialogOpen = false;
	
	private String dom_id;
	private Map<String, PluploadFile> files;
	private int id_counter = 0;

	public JSObject plupload;

	public static void log(Object... args) {
		if (console != null) {
			console.call("log", args);
		}
	}

	@Override
	public void init() {
		System.out.println("version 20");
		
		try {
			UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		try {
			console = (JSObject) JSObject.getWindow(this).getMember("console");
		} catch (JSException e) {
			System.err.println("console not available");
		}
		files = new HashMap<String, PluploadFile>();
		dom_id = getParameter("id");
		plupload = (JSObject)JSObject.getWindow(this).eval("plupload.applet");
		if(plupload == null){
			throw new RuntimeException("plupload is null");
		}
		// callback to JS
		try{
			dialog = new JFileChooser();
			fireEvent("Init");
		}
		catch(AccessControlException e){
			JSObject.getWindow(this).eval("alert('Please approve the digital signature of the applet. Close the browser and start over')");
		}
	}
	
	@SuppressWarnings("unchecked")
	public void setFileFilters(final String filters){
		System.out.println("setting filters" + filters);
		try {
			AccessController.doPrivileged(new PrivilegedExceptionAction() {
				public Object run() throws IOException, Exception {
					dialog.setFileFilter(new javax.swing.filechooser.FileFilter() {
						
						@Override
						public String getDescription() {
							// TODO Auto-generated method stub
							return null;
						}
						
						@Override
						public boolean accept(File f) {
							if(f.isDirectory()){
								return true;
							}
							for(String filter : filters.split(",")){
								if(f.getName().toLowerCase().endsWith(filter.toLowerCase())){
									return true;
								}
							}
							return false;
						}
					});
					return null;
				}
			});
		} catch (PrivilegedActionException e) {
			Exception ex = e.getException();
			if (ex instanceof IOException) {
				sendIOError(ex);
			} else if (ex instanceof Exception) {
				sendError(ex);
			}
		}
		
	}

	// LiveConnect calls from JS
	@SuppressWarnings("unchecked")
	public void uploadFile(final String id, final String url, final String cookie,
			final int chunk_size, final int retries) {
		final PluploadFile file = files.get(id);
		if (file != null) {
			this.current_file = file;
		}
		
		try {
			// Because of LiveConnect our security privileges are degraded
			// elevate them again.
			AccessController.doPrivileged(new PrivilegedExceptionAction() {
				public Object run() throws IOException, Exception {
					file.upload(url, chunk_size, retries, cookie);
					return null;
				}
			});
		} catch (PrivilegedActionException e) {
			Exception ex = e.getException();
			if (ex instanceof IOException) {
				sendIOError(ex);
			} else {
				sendError(ex);
			}
		}
	}

	public void removeFile(String id) {
		files.remove(id);
	}

	public void clearFiles() {
		files.clear();
	}
	
	@SuppressWarnings("unchecked")
	public void openFileDialog(){
		if(dialogOpen){
			// FIXME: bring openDialog to front
			return;
		}
		dialogOpen = true;
		AccessController.doPrivileged(new PrivilegedAction() {
			public Object run() {			
				SwingUtilities.invokeLater(new Runnable() {		
					@Override
					public void run() {
						
						int file_chose_return_value = dialog.showOpenDialog(Plupload.this);
						
						// blocks until file selected
						if (file_chose_return_value == JFileChooser.APPROVE_OPTION) {
							PluploadFile file = new PluploadFile(id_counter++, dialog.getSelectedFile());
							selectEvent(file);
						}
						dialogOpen = false;
					}
				});
				return null;
			}
		});
	}

	public void fireEvent(String event) {
		fireEvent(event, "null");
	}

	public boolean checkIntegrity() {
		return this.current_file.checkIntegrity();
	}

	// actions

	// fires event to JS
	public void fireEvent(String event, Object o) {
		Object[] args = { dom_id, event, o.toString() };
		plupload.call("pluploadjavatrigger", args);
	}

	public void sendIOError(Exception e) {
		fireEvent(IO_ERROR, new PluploadError(e.getMessage(), Integer
				.toString(this.current_file.id)));
	}
	
	public void sendSecurityError(Exception e){
		fireEvent("SecurityError", new PluploadError(e.getMessage(), null));
	}

	public void sendError(Exception e) {
		fireEvent("GenericError", new PluploadError(e.getMessage(), Integer
				.toString(this.current_file.id)));
	}

	public void sendFileModifiedError(Exception e) {
		fireEvent("FileChangedError", new PluploadError(e.getMessage(), Integer
				.toString(this.current_file.id)));
	}

	private void selectEvent(PluploadFile file) {
		// handles file add from file chooser
		files.put(file.id + "", file);

		file.addFileUploadListener(new FileUploadListener() {

			@Override
			public void uploadProcess(PluploadFile file) {
				fireEvent(UPLOAD_PROCESS, file);
			}

			@Override
			public void ioError(IOException e) {
				sendIOError(e);
				
			}

			@Override
			public void genericError(Exception e) {
				sendError(e);
			}
		});

		fireEvent(SELECT_FILE, file.toString());
	}
	
}

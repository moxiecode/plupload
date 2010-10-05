package plupload;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.File;
import java.io.FileFilter;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.AccessController;
import java.security.NoSuchAlgorithmException;
import java.security.PrivilegedAction;
import java.security.PrivilegedActionException;
import java.security.PrivilegedExceptionAction;
import java.text.ParseException;
import java.util.HashMap;
import java.util.Map;

import javax.swing.JApplet;
import javax.swing.JFileChooser;
import javax.swing.UIManager;
import javax.swing.UnsupportedLookAndFeelException;

import netscape.javascript.JSException;
import netscape.javascript.JSObject;

import org.apache.http.client.ClientProtocolException;

public class Plupload extends JApplet {

	// window.console
	static JSObject console;

	// events
	static final String CLICK = "Click";
	static final String SELECT_FILE = "SelectFiles"; // we only select one at a
	// time
	static final String UPLOAD_PROCESS = "UploadProcess";
	static final String UPLOAD_CHUNK_COMPLETE = "UploadChunkComplete";
	static final String SKIP_UPLOAD_CHUNK_COMPLETE = "SkipUploadChunkComplete";

	// plupload.applet
	private PluploadFile current_file;
	private JFileChooser dialog;
	private String dom_id;
	private int file_chose_return_value;
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
		System.out.println("version 15");
		try {
			UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		} catch (InstantiationException e) {
			e.printStackTrace();
		} catch (IllegalAccessException e) {
			e.printStackTrace();
		} catch (UnsupportedLookAndFeelException e) {
			e.printStackTrace();
		}
		
		try {
			console = (JSObject) JSObject.getWindow(this).getMember("console");
		} catch (JSException e) {
			System.err.println("console not available");
		}
		files = new HashMap<String, PluploadFile>();
		dom_id = getParameter("id");
		
		// Mozilla: nested getMember is broken, e.g., getMember("plupload").getMember("applet")
		// eval does the trick
		// Safari: any access to non-primitivate types is broken
		plupload = (JSObject)JSObject.getWindow(this).eval("plupload.applet");
		dialog = new JFileChooser();
		dialog.addActionListener(getFileChooserActionListener());

		// callback to JS
		fireEvent("Init");
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
	

	@SuppressWarnings("unchecked")
	public void uploadNextChunk() throws NoSuchAlgorithmException,
			ClientProtocolException, URISyntaxException, IOException {
		try {
			if (this.current_file != null) {
				final PluploadFile file = this.current_file;
				file.uploadNextChunk();
			}
		} catch (IOException e) {
			sendIOError(e);
		} catch (Exception e) {
			sendError(e);
		}
	}

	@SuppressWarnings("unchecked")
	public void skipNextChunk() throws IOException {
		try {
			if (this.current_file != null) {
				final PluploadFile file = this.current_file;
				file.skipNextChunk();
			}
		} catch (IOException e) {
			sendIOError(e);
		} catch (Exception e) {
			sendError(e);
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
		final JApplet a = this;
		// won't access look and feel otherwise
		AccessController.doPrivileged(new PrivilegedAction() {
			public Object run() {
				file_chose_return_value = dialog.showOpenDialog(a);
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
		fireEvent("IOError", new PluploadError(e.getMessage(), Integer
				.toString(this.current_file.id)));
	}

	public void sendError(Exception e) {
		fireEvent("GenericError", new PluploadError(e.getMessage(), Integer
				.toString(this.current_file.id)));
	}

	public void sendFileModifiedError(Exception e) {
		fireEvent("FileChangedError", new PluploadError(e.getMessage(), Integer
				.toString(this.current_file.id)));
	}

	public ActionListener getFileChooserActionListener() {
		return new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (file_chose_return_value == JFileChooser.APPROVE_OPTION) {
					PluploadFile file = new PluploadFile(id_counter++, dialog
							.getSelectedFile());
					selectEvent(file);
				} else {
					// Save command cancelled.
				}
			}
		};
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
			public void uploadChunkComplete(PluploadFile file) {
				fireEvent(UPLOAD_CHUNK_COMPLETE, file);
			}

			@Override
			public void skipChunkComplete(PluploadFile file) {
				fireEvent(SKIP_UPLOAD_CHUNK_COMPLETE, file);
			}
		});

		fireEvent(SELECT_FILE, file.toString());
	}
	
}

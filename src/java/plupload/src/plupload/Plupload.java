package plupload;

import java.awt.Cursor;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.net.URISyntaxException;
import java.security.AccessController;
import java.security.NoSuchAlgorithmException;
import java.security.PrivilegedAction;
import java.security.PrivilegedActionException;
import java.security.PrivilegedExceptionAction;
import java.util.HashMap;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.JApplet;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.UIManager;
import javax.swing.UnsupportedLookAndFeelException;

import org.apache.http.client.ClientProtocolException;

import netscape.javascript.JSException;
import netscape.javascript.JSObject;

public class Plupload extends JApplet implements MouseListener {

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
	private Map<Integer, PluploadFile> files;
	private int id_counter = 0;
	private JSObject plupload;

	public static void log(Object... args) {
		if (console != null) {
			console.call("log", args);
		}
	}

	@Override
	public void init() {
		System.out.println("version 6");
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
		plupload = (JSObject) ((JSObject) JSObject.getWindow(this).getMember(
				"plupload")).getMember("applet");
		files = new HashMap<Integer, PluploadFile>();
		dom_id = getParameter("id");

		try {
			console = (JSObject) JSObject.getWindow(this).getMember("console");
		} catch (JSException e) {
			System.err.println("console not available");
		}

		dialog = new JFileChooser();
		dialog.addActionListener(getFileChooserActionListener());

		ImageIcon icon = new ImageIcon(getClass().getResource(
				"/resources/upload_button.png"));
		JButton add_file_button = new JButton("Add files", icon);

		add_file_button.setContentAreaFilled(false);
		getContentPane().add(add_file_button);
		add_file_button.addMouseListener(this);

		// callback to JS
		fireEvent("Init");
	}

	// LiveConnect calls from JS
	@SuppressWarnings("unchecked")
	public void uploadFile(final Integer id, final String url,
			final JSObject settings) {
		final PluploadFile file = files.get(id);
		final int chunk_size = (Integer) settings.getMember("chunk_size");
		final int retries = (Integer) settings.getMember("retries");
		if (file != null) {
			this.current_file = file;
		}
		try {
			// Because of LiveConnect our security privileges are degraded
			// elevate them again.
			AccessController.doPrivileged(new PrivilegedExceptionAction() {
				public Object run() throws IOException, Exception {
					file.upload(url, chunk_size, retries);
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

	public void fireEvent(String event) {
		fireEvent(event, null);
	}

	public void setFileFilters(String[] filters, boolean multi) {
		// TODO:
	}

	public boolean checkIntegrity() {
		return this.current_file.checkIntegrity();
	}

	// actions

	// fires event to JS
	public void fireEvent(String event, Object obj) {
		Object[] args = { dom_id, event, obj };
		plupload.call("trigger", args);
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
		files.put(file.id, file);

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

		fireEvent(SELECT_FILE, new Object[] { file });
	}

	@Override
	public void mouseClicked(MouseEvent e) {
		file_chose_return_value = dialog.showOpenDialog(this);
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		// change cursor to hand when entering applet.
		e.getComponent().setCursor(
				Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
	}

	@Override
	public void mouseExited(MouseEvent e) {
	}

	@Override
	public void mousePressed(MouseEvent e) {
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}
}

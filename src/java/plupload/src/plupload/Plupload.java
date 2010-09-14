package plupload;

import java.awt.Color;
import java.awt.Cursor;
import java.awt.Graphics;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.io.IOException;
import java.net.URISyntaxException;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.JApplet;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.UIManager;
import javax.swing.UnsupportedLookAndFeelException;

import netscape.javascript.JSObject;

import org.apache.http.client.ClientProtocolException;

public class Plupload extends JApplet implements MouseListener,
		FileUploadListener {

	static JSObject log;

	JSObject plupload;
	String dom_id;
	int id_counter = 0;
	JFileChooser dialog;
	int file_chose_return_value;
	Map<Integer, PluploadFile> files;
	PluploadFile current_file;

	// events
	String click = "Click";
	String select_files = "SelectFiles";
	String upload_process = "UploadProcess";
	String upload_chunk_complete = "UploadChunkComplete";

	public static void log(Object... args) {
		log.call("log", args);
	}

	@Override
	public void init() {
		try {
			UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (InstantiationException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IllegalAccessException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (UnsupportedLookAndFeelException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		plupload = (JSObject) ((JSObject) JSObject.getWindow(this).getMember(
				"plupload")).getMember("applet");
		files = new HashMap<Integer, PluploadFile>();
		dom_id = getParameter("id");
		log = (JSObject) JSObject.getWindow(this).getMember("console");
		
		dialog = new JFileChooser();
		dialog.addActionListener(getFileChooserActionListener());
		
		ImageIcon icon = new ImageIcon(getClass().getResource("/resources/upload_button.png"));
		JButton add_file = new JButton("Add files", icon);
		
		//add_file.setBackground(new Color(255, 255, 255));  
		//add_file.setForeground(new Color(100, 100, 100));  
		
		add_file.setContentAreaFilled(false);
		//add_file.setBorder(null);

		this.add(add_file);
		
		add_file.addMouseListener(this);
		fireEvent("Init");
	}

	public void selectEvent(PluploadFile file) {
		// can only select one file in the dialog
		files.put(file.id, file);

		file.addFileUploadListener(new FileUploadListener() {

			@Override
			public void uploadProcess(PluploadFile file) {
				System.out.println("uploadProcess event");
				fireEvent(upload_process, file);
			}

			@Override
			public void uploadChunkComplete(PluploadFile file) {
				fireEvent(upload_chunk_complete, file);
			}
		});

		fireEvent(select_files, new Object[] { file });
	}

	public void uploadFile(Integer id, String url, JSObject settings)
			throws NoSuchAlgorithmException, IOException, URISyntaxException {
		try {
			PluploadFile file = files.get(id);
			if (file != null) {
				this.current_file = file;
				file.upload(url, settings);
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public boolean uploadNextChunk() throws NoSuchAlgorithmException,
			ClientProtocolException, URISyntaxException, IOException {
		System.out.println("uploadNextChunk");
		if (this.current_file != null) {
			return this.current_file.uploadNextChunk();
		}
		return false;
	}

	public void removeFile(String id) {
		files.remove(id);
	}

	public void clearFiles() {
		files.clear();
	}

	public void setFileFilters(String[] filters, boolean multi) {

	}

	public void fireEvent(String event) {
		fireEvent(event, null);
	}

	public void fireEvent(String event, Object obj) {
		Object[] args = { dom_id, event, obj };
		plupload.call("trigger", args);
	}

	public void paint(Graphics g) {
	}

	public ActionListener getFileChooserActionListener() {
		return new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (file_chose_return_value == JFileChooser.APPROVE_OPTION) {
					PluploadFile file = new PluploadFile(id_counter++, dialog
							.getSelectedFile());
					System.out.println("Selected: " + file.name + "." + "\n");
					selectEvent(file);
				} else {
					System.out.println("Save command cancelled by user.\n");
				}

			}
		};
	}

	@Override
	public void mouseClicked(MouseEvent e) {
		fireEvent("Click");
		file_chose_return_value = dialog.showOpenDialog(this);
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		e.getComponent().setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
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

	@Override
	public void uploadChunkComplete(PluploadFile file) {
		fireEvent("UploadChunkComplete", file);
	}

	@Override
	public void uploadProcess(PluploadFile file) {
		fireEvent("UploadProcess", file);
	}

}

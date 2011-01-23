/**
 * Page.xaml.cs
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Windows.Browser;
using System.Net;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using Moxiecode.Plupload;

namespace Moxiecode.Plupload {
	/// <summary>
	///  Partial page class for the Silverlight page.
	/// </summary>
	public partial class Page : UserControl {
		#region private fields
		private Dictionary<string, FileReference> files;
		private int idCount = 0;
		private FileReference currentFile;
		private string id, filter;
		private bool multiselect;
		#endregion

		/// <summary>
		///  Main constructor.
		/// </summary>
		/// <param name="init_params">Silverlight init params.</param>
		public Page(IDictionary<string, string> init_params) {
			InitializeComponent();

			HtmlPage.RegisterScriptableObject("Upload", this);

			this.files = new Dictionary<string, FileReference>();
			this.id = init_params["id"];
			this.filter = init_params["filter"];
			this.multiselect = Convert.ToBoolean(init_params["multiselect"]);

			this.FireEvent("Init");
			this.MouseLeftButtonUp += new MouseButtonEventHandler(OnClick);
			
			this.MouseLeftButtonDown += new MouseButtonEventHandler(OnMouseLeftButtonDown);
			this.MouseEnter += new MouseEventHandler(OnMouseEnter);
			this.MouseLeave += new MouseEventHandler(OnMouseLeave);
		}

		private void OnClick(object sender, MouseEventArgs e) {
			OpenFileDialog dlg = new OpenFileDialog();

			this.FireEvent("StartSelectFiles");

			try {
				dlg.Multiselect = this.multiselect;
				dlg.Filter = this.filter;

				if ((bool) dlg.ShowDialog()) {
					foreach (FileInfo file in dlg.Files) {
						FileReference uploadFile = new FileReference("u" + this.idCount++, file);

						uploadFile.UploadChunkComplete += delegate(object up_sender, UploadEventArgs args) {
							FileReference evtFile = (FileReference) up_sender;

							this.FireEvent("UploadChunkSuccessful", evtFile.Id, args.Chunk, args.Chunks, args.Response);
						};

						uploadFile.UploadComplete += delegate(object up_sender, UploadEventArgs args) {
							FileReference evtFile = (FileReference) up_sender;

							this.FireEvent("UploadSuccessful", evtFile.Id, args.Response);
						};

						uploadFile.Error += delegate(object up_sender, ErrorEventArgs args) {
							FileReference evtFile = (FileReference) up_sender;

							this.FireEvent("UploadChunkError", evtFile.Id, args.Chunk, args.Chunks, args.Message);
						};

						uploadFile.Progress += delegate(object up_sender, ProgressEventArgs args) {
							FileReference evtFile = (FileReference) up_sender;

							this.FireEvent("UploadFileProgress", evtFile.Id, args.Loaded, args.Total);
						};

						this.FireEvent("SelectFile", uploadFile.Id, uploadFile.Name, uploadFile.Size);
						this.files[uploadFile.Id] = uploadFile;
					}

					this.FireEvent("SelectSuccessful");
				} else
					this.FireEvent("SelectCancelled");
			} catch (Exception ex) {
				this.FireEvent("SelectError", ex.Message);
			}
		}
		
		
		﻿private void OnMouseLeftButtonDown(object sender, MouseEventArgs e) {
			this.FireEvent("MouseLeftButtonDown");
		}
		
		private void OnMouseEnter(object sender, MouseEventArgs e) {
			this.FireEvent("MouseEnter");
		}
		
		private void OnMouseLeave(object sender, MouseEventArgs e) {
			this.FireEvent("MouseLeave");
		}

		/// <summary>
		///  Reference to page level plupload.silverlight script object.
		/// </summary>
		public ScriptObject PluploadScriptObject {
			get { return ((ScriptObject) HtmlPage.Window.Eval("plupload.silverlight")); }
		}

		/// <summary>
		///  Fires a specific event to the page level multi upload script.
		/// </summary>
		/// <param name="name">Event name to fire.</param>
		public void FireEvent(string name) {
			this.PluploadScriptObject.Invoke("trigger", new string[] { this.id, name });
		}

		/// <summary>
		///  Fires a specific event to the page level multi upload script.
		/// </summary>
		/// <param name="name">Event name to fire.</param>
		/// <param name="paramlist">Numerous parameters to send.</param>
		public void FireEvent(string name, params object[] paramlist) {
			List<object> args = new List<object>(paramlist);

			args.Insert(0, name);
			args.Insert(0, this.id);

			this.PluploadScriptObject.Invoke("trigger", args.ToArray());
		}

		[ScriptableMember]
		/// <summary>
		///  Uploads a specific file by id to the specific url and using a chunks.
		/// </summary>
		/// <param name="id">File id to upload.</param>
		/// <param name="upload_url">Url to upload to.</param>
		/// <param name="chunk_size">Chunk size to use.</param>
		public void UploadFile(string id, string upload_url, string json_settings) {
			if (this.files.ContainsKey(id)) {
				FileReference file = this.files[id];

				this.currentFile = file;
				file.Upload(upload_url, json_settings);
			}
		}

		[ScriptableMember]
		/// <summary>
		///  Removes the specified file by id.
		/// </summary>
		/// <param name="id">File id to remove.</param>
		public void RemoveFile(string id) {
			if (this.files.ContainsKey(id))
				this.files[id] = null;
		}

		[ScriptableMember]
		/// <summary>
		///  Clears all files.
		/// </summary>
		public void ClearFiles() {
			this.files = new Dictionary<string, FileReference>();
		}

		[ScriptableMember]
		/// <summary>
		///  Uploads the next chunk of the current file. Returns true/false if there is more chunks.
		/// </summary>
		/// <return>true/false if there is more chunks</return>
		public bool UploadNextChunk() {
			if (this.currentFile != null)
				return this.currentFile.UploadNextChunk();

			return false;
		}

		/// <summary>
		///  Send debug message to firebug console.
		/// </summary>
		/// <param name="msg">Message to write.</param>
		private void Debug(string msg) {
			((ScriptObject) HtmlPage.Window.Eval("console")).Invoke("log", new string[] { msg });
		}
	}
}
using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Browser;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;

namespace Moxiecode.Com
{
	public class FileInput : Button
	{
		private List<File> _files = new List<File>(); 

		public static string[] dispatches = new string[] 
		{
			"Cancel", 
			"Change",
			"MouseEnter",
			"MouseLeave",
			"MouseDown",
			"MouseUp"
		};

		public event EventHandler Cancel;
		public event EventHandler Change;
		public event MouseButtonEventHandler MouseDown;
		public event MouseButtonEventHandler MouseUp;

		private bool _multiple = true;
		private string _accept;

		private Boolean _disabled = false;
		

		public FileInput()
		{
			this.Opacity = 0;
			this.Cursor = Cursors.Hand;
			this.Margin = new Thickness(4, 4, 4, 4); // increase probablity of detecting mouseout properly
			this.HorizontalAlignment = HorizontalAlignment.Stretch;
			this.VerticalAlignment = VerticalAlignment.Stretch;
		}

		public void init(object accept, object multiple)
		{
			this._init((string)accept, (bool)multiple);
		}

		private void _init(string accept, bool multiple)
		{
			_multiple = multiple;
			_accept = accept;

			//this.MouseLeftButtonUp += new MouseButtonEventHandler(OnClick);
			this.MouseLeftButtonDown += delegate(object sender, MouseButtonEventArgs args)
			{
				MouseDown(sender, null);
			};

			this.Click += delegate(object sender, RoutedEventArgs args)
			{
				if (!this._disabled) {
					this._openDialog();
				}
			};
		}

		public void setOption(object name, object value)
		{
			switch ((string)name)
			{
				case "multiple":
					_multiple = (bool)value;
					return;

				case "accept":
					_accept = (string)value;
					return;
			}
		}


		public void disable(object state)
		{
			_disabled = Convert.ToBoolean(state);
			this.Cursor = _disabled ? Cursors.Arrow : Cursors.Hand;
		}


		public Dictionary<string, object>[] getFiles()
		{
			List<Dictionary<string, object>> files = new List<Dictionary<string, object>>();
			foreach (File file in _files)
			{
				files.Add(file.ToObject());
				Moxie.compFactory.add(file.uid, file);
			}
			return files.ToArray();
		}


		private void _openDialog()
		{
			OpenFileDialog dialog = new OpenFileDialog();

			_files.Clear();

			try
			{
				dialog.Multiselect = this._multiple;
				dialog.Filter = this._accept;

				if ((bool)dialog.ShowDialog())
				{
					foreach (FileInfo fileInfo in dialog.Files)
					{
						_files.Add(new File(new List<object>{ fileInfo }));
					}
					Change(this, null);
				}
				else
				{
					Cancel(this, null);
				}
			}
			catch (Exception ex)
			{
				// throw error
			}
		}
	}
}

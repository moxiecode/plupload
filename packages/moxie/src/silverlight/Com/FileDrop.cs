using System;
using System.IO;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Collections.Generic;

namespace Moxiecode.Com
{
	/* in windowless mode works only in Safari (in other words almost useless) */

	public class FileDrop
	{
		public static string[] dispatches = new string[] 
		{
			"Drop",
			"DragEnter",
			"DragLeave"
		};

		public event EventHandler Drop;
		public event EventHandler DragEnter;
		public event EventHandler DragLeave;

		private List<File> _files = new List<File>(); 

		
		public void init()
		{
			UserControl stage = (UserControl)Application.Current.RootVisual;

			stage.AllowDrop = true;

			stage.Drop += new DragEventHandler(delegate(object sender, DragEventArgs eventArgs)
			{
				_files.Clear();

				FileInfo[] fileInfos = eventArgs.Data.GetData(DataFormats.FileDrop) as FileInfo[];

				foreach (FileInfo fileInfo in fileInfos)
				{
					_files.Add(new File(new List<object> { fileInfo }));
				}

				Drop(this, null);
			});

			stage.DragEnter += new DragEventHandler(delegate(object sender, DragEventArgs eventArgs) 
			{
				DragEnter(this, null);
			});

			stage.DragLeave += new DragEventHandler(delegate(object sender, DragEventArgs eventArgs)
			{
				DragLeave(this, null);
			});
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
	}
}

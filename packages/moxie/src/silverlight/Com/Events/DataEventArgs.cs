using System;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Collections.Generic;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

namespace Moxiecode.Com.Events
{
	public class DataEventArgs : EventArgs
	{
		private Dictionary<string,string> _data;

		public DataEventArgs(Dictionary<string,string> data)
		{
			_data = data;
		}

		/// <summary>Total bytes to upload.</summary>
		public Dictionary<string,string> Data
		{
			get { return _data; }
		}
	}
}

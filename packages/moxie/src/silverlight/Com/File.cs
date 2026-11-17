using System;
using System.Net;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Browser;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

namespace Moxiecode.Com
{
	public class File : Blob
	{
		private string _name;
		public string name {
			get {
				return _name;
			}
		}

		private DateTime _lastModifiedDate;
		public string lastModifiedDate {
			get {
				return _lastModifiedDate.ToString("ddd MMM yyyy hh:mm:ss 'GMT'K"); // Thu Aug 23 2012 19:40:00 GMT+0400 (GET)
			}
		}

		public File(List<object> sources, object properties = null) : base(sources, properties)
		{
			object source = sources[0];

			if (properties is Dictionary<string, string> && ((Dictionary<string, string>)properties).ContainsKey("name"))
			{
				_name = ((Dictionary<string, string>)properties)["name"];
			}

			if (source is FileInfo)
			{
				FileInfo fileInfo = (FileInfo)source;
				if (_name == null) {
					_name = fileInfo.Name;
				}
			}
			else if (source is BufferRegion)
			{
				Buffer buffer = ((BufferRegion)source).buffer;
				if (_lastModifiedDate == null || _lastModifiedDate.CompareTo(buffer.lastModifiedDate) < 0) {
					_lastModifiedDate = buffer.lastModifiedDate;
				}

				if (_name == null) {
					_name = buffer.name;
				}
			}
		}

		public override Dictionary<string, object> ToObject()
		{
			Dictionary<string, object> dict = base.ToObject();
			dict.Add("name", this.name);
			dict.Add("lastModifiedDate", this.lastModifiedDate);

			return dict;
		}
	}


}

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

using Moxiecode.Com.Events;

namespace Moxiecode.Com
{
	public class Transporter
	{
		public delegate void ProgressEventHandler(object sender, ProgressEventArgs args);

		public static string[] dispatches = new string[] 
		{
			"TransportingProgress", 
			"TransportingComplete",
			"TransportingError"
		};

		public event EventHandler TransportingComplete;
		public event ProgressEventHandler TransportingProgress;
		public event EventHandler TransportingError;
		
		private MemoryStream _buffer = null;
			

		public Transporter()
		{
			_buffer = new MemoryStream();
		}


		public void receive(object chunk, object size) 
		{
			byte[] ba = Convert.FromBase64String((string)chunk);
			_buffer.Write(ba, 0, ba.Length);
			
			if (_buffer.Length >= Convert.ToInt32(size)) {
				TransportingComplete(this, null);
			} else {
				TransportingProgress(this, new ProgressEventArgs(_buffer.Length, (int)size));
			}
		}	
		
		
		public void clear()
		{
			if (_buffer != null) {
				_buffer.Dispose();
			}
		}
		
		
		public Dictionary<string, object> getAsBlob(object type)
		{
			Blob blob = new Blob(new List<object>{_buffer}, new Dictionary<string,string>{{ "type", (string)type }});
			Moxie.compFactory.add(blob.uid, blob);
			return blob.ToObject();
		}	
	}
}

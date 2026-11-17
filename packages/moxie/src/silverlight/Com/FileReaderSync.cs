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

using Moxiecode.Com.Errors;

namespace Moxiecode.Com
{
	public class FileReaderSync 
	{
		public static string[] dispatches = null;

		public String readAsBase64(object blob)
		{
			if (blob is string){
				if ((blob = Moxie.compFactory.get((string)blob)) == null){
					throw new ImageError(ImageError.WRONG_FORMAT);
				}
			}

			Blob _blob = (Blob)blob;
			Stream stream = _blob._sources[0].buffer.getStream();
			byte[] buffer = new byte[_blob.size];
			int bytesRead;

			if ((bytesRead = stream.Read(buffer, 0, buffer.Length)) != 0) {
				return Convert.ToBase64String(buffer);
			}
			return "";
		}
	}
}

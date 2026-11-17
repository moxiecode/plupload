using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

using Moxiecode.Com.Events;
using Moxiecode.Com.Errors;


namespace Moxiecode.Com
{
	public class FileReader
	{
		public static string[] dispatches = new string[] 
		{
			"LoadStart", 
			"Progress",
			"Load",
			"Error",
			"LoadEnd"
		};

		public event EventHandler LoadStart;
		public event ProgressEventHandler Progress;
		public event EventHandler Load;
		public event EventHandler Error;
		public event EventHandler LoadEnd;

		public const uint EMPTY = 0;
		public const uint LOADING = 1;
		public const uint DONE = 2;
		
		public uint readyState = FileReader.EMPTY;
		public object result;

		public long Position = 0;

		private Blob _blob;
		private int _srcIdx = 0;
		private int _bytesTotal;
		private long _position = 0;


		public void readAsBase64(object blob)
		{
			if (blob is string) {
				if ((blob = Moxie.compFactory.get((string)blob)) == null) {
					Error(this, new ErrorEventArgs(ImageError.WRONG_FORMAT));
					return;
				}
			}

			_blob = (Blob)blob;

			long bytesTotal = _blob.size;
			int bytesRead, bytesLoaded = 0;
			byte[] buffer = new byte[1024 * 200 - 2]; // bytes, should divide by three

			// LoadStart(this, null);

			while ((bytesRead = Read(_blob, buffer, 0, buffer.Length)) != 0) {
				bytesLoaded += bytesRead;
				Progress(this, new ProgressEventArgs(bytesLoaded, bytesTotal, Convert.ToBase64String(buffer, 0, bytesRead)));
			}

			Load(this, null);
			LoadEnd(this, null);
		}


		public void ReadAsMemoryStream(object blob, Stream stream)
		{
			if (blob is string){
				if ((blob = Moxie.compFactory.get((string)blob)) == null){
					Error(this, new ErrorEventArgs(ImageError.WRONG_FORMAT));
					return;
				}
			}

			int bytesRead;
			byte[] buffer = new byte[1024 * 200];

			Position = 0;
			while ((bytesRead = Read((Blob)blob, buffer, 0, buffer.Length)) != 0) {
				stream.Write(buffer, 0, bytesRead);
			}
		}


		public int Read(Blob blob, byte[] buffer, int offset, int count)
		{
			_blob = blob;
			_position = Position;
			_srcIdx = 0;
			_bytesTotal = 0;

			Array.Clear(buffer, 0, buffer.Length); // make sure we work on empty array

			if (_position < blob.size) {
				_readFromNextSource(buffer, offset, count);
			}
			return _bytesTotal;
		}


		private void _readFromNextSource(byte[] buffer, int offset, int count)
		{
			int bytesRead = 0;

			if (_srcIdx >= _blob._sources.Count) { 
				// we are out of sources
				return; 
			}

			// get the next one
			BufferRegion src = _blob._sources[_srcIdx++];

			// requested position is out of the boundaries of current source, bypass
			if (src.size <= _position) {
				_position -= src.size; 
				_readFromNextSource(buffer, offset, count);
				return;
			}

			src.Position = _position;
			if ((bytesRead = src.Read(buffer, offset, count)) == 0) {
				return;
			}

			Position += bytesRead;
			offset += bytesRead;
			_bytesTotal += bytesRead;

			// we need more, proceed if possible
			if (bytesRead < count) {
				_position = 0;
				count -= bytesRead;
				_readFromNextSource(buffer, offset, count);
			}
		}

	}
}

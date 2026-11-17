using System;
using System.Net;
using System.IO;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Browser;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

using Moxiecode.MXI;

namespace Moxiecode.Com
{
	public class Blob
	{
		private string _uid;
		public string uid {
			get {
				return _uid;
			}
		}

		private long _size = 0;
		public long size {
			get {
				return _size;
			}
		}

		private string _type = "";
		public string type {
			get {
				return _type;
			}
		}

		private long _pointer = 0;

		public List<BufferRegion> _sources;

		public Blob(List<object> sources, object properties = null)
		{
			_sources = new List<BufferRegion>();
			_pointer = 0;

			foreach (object source in sources)
			{
				if (source is FileInfo)
				{
					_sources.Add(new BufferRegion(new Buffer((FileInfo)source)));
					_pointer += ((FileInfo)source).Length;
				}
				else if (source is byte[])
				{
					_sources.Add(new BufferRegion(new Buffer((byte[])source)));
					_pointer += ((byte[])source).Length;
				}
				else if (source is MemoryStream)
				{
					_sources.Add(new BufferRegion(new Buffer((MemoryStream)source)));
					_pointer += ((MemoryStream)source).Length;
				}
				else if (source is Blob)
				{
					((Blob)source)._sources.ForEach(delegate(BufferRegion region)
					{
						region.buffer.refs++;
						_sources.Add(region);
						_pointer += ((Blob)source).size;
					});
				} 
				else if (source is BufferRegion) 
				{
					BufferRegion bufferRegion = (BufferRegion)source;
					_sources.Add(new BufferRegion(bufferRegion.buffer, bufferRegion.start, bufferRegion.end));
					_pointer += bufferRegion.end - bufferRegion.start;
				}
			}


			if (properties is string) 
			{
				_type = (string)properties;
			}
			else if (properties is Dictionary<string, string>)
			{
				string type;
				if (((Dictionary<string, string>)properties).TryGetValue("type", out type)) {
					_type = type;
				}
			}

			_size = _pointer;
			_uid = Utils.guid("uid_");
		}

		public Dictionary<string, object> slice(object start, object end, object type)
		{
			Blob blob = _slice(Convert.ToInt64(start), Convert.ToInt64(end), (string)type);
			Moxie.compFactory.add(blob.uid, blob);
			return blob.ToObject(); 
		}


		private Blob _slice(long start, long end, string type)
		{
			if (start > end) {
				return new Blob(new List<object>(), type);
			}

			long size, offset = 0;
			int i = 0, length = _sources.Count;
			BufferRegion src;
			List<object> sources = new List<object>();

			for (; i < length; i++) {
				src = _sources[i];
				size = src.end - src.start;
								
				if (start > offset + size) { // start is outside of the current source's boundaries 
					continue;
				}
								
				sources.Add(new BufferRegion(src.buffer, src.start + start - offset, Math.Min(src.end, end)));
				offset += size;
				break;
			}
			
			if (i == length || offset > end) {
				return new Blob(sources, type);
			} 
			
			// loop for the end otherwise
			for (; i < length; i++) {
				src = _sources[i];
				offset += src.end - src.start;
				if (offset < end) {
					sources.Add(src);
				} else {
					sources.Add(new BufferRegion(src.buffer, src.start, src.end - (offset - end)));
					break; // we have found the end
				}
			}
			
			return new Blob(sources, type);
		}


		public virtual Dictionary<string, object> ToObject()
		{
			Dictionary<string, object> dict = new Dictionary<string, object>();
			dict.Add("uid", this.uid);
			dict.Add("ruid", Moxie.uid);
			dict.Add("size", this.size);
			dict.Add("type", this.type);
			return dict;
		}

		public void destroy()
		{
			foreach (BufferRegion source in _sources) {
				source.destroy();
			}
			_sources.Clear();
			_sources = null;
			Moxie.compFactory.remove(_uid);
		}
	}

	public class Buffer
	{
		public uint refs = 0;

		public DateTime lastModifiedDate = new DateTime();

		private FileInfo _fileInfo;
		public FileInfo fileInfo
		{
			get
			{
				return _fileInfo;
			}
		}

		private Stream _stream;
		public Stream stream
		{
			get
			{
				return _stream;
			}
		}

		public long size
		{
			get
			{
				if (_stream != null)
				{
					return _stream.Length;
				}
				return 0;
			}
		}

		public string name
		{
			get
			{
				if (_fileInfo != null)
				{
					return _fileInfo.Name;
				}
				return "";
			}
		}

		public long Position
		{
			get
			{
				Stream stream = getStream();
				if (stream != null)
				{
					return stream.Position;
				}
				return 0;
			}
			set
			{
				Stream stream = getStream();
				if (stream != null)
				{
					stream.Position = value;
				}
			}
		}

		public Buffer(FileInfo fileInfo)
		{
			_fileInfo = fileInfo;
			// lastModifiedDate = _fileInfo.LastAccessTime; // throws exception
			lastModifiedDate = DateTime.Now;
			_stream = _fileInfo.OpenRead();
		}

		public Buffer(byte[] data)
		{
			_stream = new MemoryStream(data);
			lastModifiedDate = DateTime.Now;
		}

		public Buffer(MemoryStream stream)
		{
			_stream = stream;
		}

		public Stream getStream()
		{
			return _stream;
		}
	}


	public class BufferRegion
	{

		public long start;

		public long end;

		public Buffer buffer;

		public long size
		{
			get {
				return this.end - this.start;
			}
		}

		public long Position
		{
			get {
				return buffer.Position - this.start;
			}
			set {
				buffer.Position = value + this.start;
			}
		}

		public BufferRegion(Buffer buffer, long start = 0, long end = -1)
		{
			this.start = start;
			this.end = end < 0 ? buffer.size : end;
			buffer.refs++;
			this.buffer = buffer;
			this.Position = 0;
		}

		public int Read(byte[] ba, int offset = 0, int count = 0)
		{
			Stream stream = buffer.getStream();
			if (stream == null) {
				return 0;
			}

			if (count == 0 || count + this.Position > this.size) {
				count = (int)(this.size - this.Position);
			}

			int bytesRead = stream.Read(ba, offset, count);
			return bytesRead;
		}

		public void ReadToEnd(byte[] ba)
		{
			Read(ba);
		}

		public void destroy()
		{
			if (--buffer.refs <= 0) {
				buffer.getStream().Dispose();
			}
		}
	}
}

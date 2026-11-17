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

namespace Moxiecode.MXI
{
	public class BinaryReader
	{
		private Stream _stream;

		public const int LITTLE_ENDIAN = 1;
		public const int BIG_ENDIAN = 0;

		private int _endian = BinaryReader.BIG_ENDIAN;
		public int Endian {
			get {
				return _endian;
			} 
			set {
				_endian = value == BinaryReader.LITTLE_ENDIAN ? BinaryReader.LITTLE_ENDIAN : BinaryReader.BIG_ENDIAN;
			}	
		}

		public long Length {
			get {
				return _stream != null ? _stream.Length : 0;
			}
		}

		public BinaryReader(Stream stream)
		{
			_stream = stream;
		}


		public int BYTE(long idx)
		{
			return (int)read(idx, 1);
		}


		public int SHORT(long idx)
		{
			return (int)read(idx, 2);
		}


		public long LONG(long idx)
		{
			return read(idx, 4);
		}


		public long SLONG(long idx)
		{
			long num = LONG(idx);
			return (num > 2147483647 ? num - 4294967296 : num);
		}


		public string STRING(long idx, int size)
		{
			string result = "";
			int code;

			for (int i = 0; i < size; i++) {
				if ((code = BYTE(idx + i)) < 0) {
					break;
				}
				result += (char)code;
			}
			return result;
		}

		public byte[] SEGMENT(int idx = -1, int length = -1, byte[] segment = null) 
		{
			byte[] buffer;
		
			if (idx == -1) // return byte array representation of the whole stream
			{
				buffer = new byte[_stream.Length];
				_stream.Position = 0;
				
			}
			else if (length == -1) // extract segment from idx to the end
			{ 
				buffer = new byte[_stream.Length - idx];
				_stream.Position = idx;
			} 
			else if (length > 0 && segment == null) // extract segment from idx and of specified length
			{
				buffer = new byte[length];
				_stream.Position = idx;
			}
			else if (segment != null) // insert segment starting at idx (alters internal stream)
			{
				_insert(segment, idx, length);
				buffer = new byte[_stream.Length];
			} else {
				return null;
			}
			_stream.Read(buffer, 0, buffer.Length);
			return buffer;
		}


		public void clear()
		{
			if (_stream != null) {
				_stream = null;
			}
		}


		public long read(long idx, int size)
		{
			int mv = _endian == BinaryReader.LITTLE_ENDIAN ? 0 : -8 * (size - 1);
			int b;
			long sum = 0;

			if (idx > _stream.Length) {
				return -1;
			}

			_stream.Position = idx;

			for (int i = 0; i < size; i++) {
				 if ((b = _stream.ReadByte()) < 0) {
					break;
				 }
				sum |= (uint)(b << Math.Abs(mv + i*8));
			}
			return sum;
		}


		public void write(int idx, int num, int size)
		{
			int mv = _endian == BinaryReader.LITTLE_ENDIAN ? 0 : -8 * (size - 1);
			byte[] buffer = new byte[size];

			for (int i = 0; i < size; i++) {
				buffer[i] = (byte)((num >> Math.Abs(mv + i*8)) & 255);
			}
			_insert(buffer, idx, size);
		}


		private void _insert(byte[] segment, int idx, int size)
		{
			MemoryStream tmpStream = new MemoryStream();

			byte[] buffer = new byte[idx];
			_stream.Position = 0;
			_stream.Read(buffer, 0, buffer.Length);
			tmpStream.Write(buffer, 0, buffer.Length);

			tmpStream.Write(segment, 0, segment.Length);

			buffer = new byte[_stream.Length - idx - size];
			_stream.Position = idx + size;
			_stream.Read(buffer, 0, buffer.Length);
			tmpStream.Write(buffer, 0, buffer.Length);

			_stream.Dispose();
			tmpStream.Position = 0;
			_stream = tmpStream;
		}
	}
}
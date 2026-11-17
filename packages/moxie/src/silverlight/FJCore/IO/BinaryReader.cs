/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.IO;

namespace FluxJpeg.Core.IO
{
    /// <summary>
    /// Big-endian binary reader
    /// </summary>
    internal class BinaryReader
    {
        Stream _stream;
        byte[] _buffer;

        public Stream BaseStream { get { return _stream; } }

        public BinaryReader(byte[] data) : this(new MemoryStream(data)) { }

        public BinaryReader(Stream stream)
        {
            _stream = stream;
            _buffer = new byte[2];
        }

        public byte ReadByte()
        {
            int b = _stream.ReadByte();
            if (b == -1) throw new EndOfStreamException();
            return (byte)b;
        }

        public ushort ReadShort()
        {
            _stream.Read(_buffer, 0, 2);
            return (ushort)((_buffer[0] << 8) | (_buffer[1] & 0xff));
        }

        public int Read(byte[] buffer, int offset, int count)
        {
            return _stream.Read(buffer, offset, count);
        }

    }
}

/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.Text;
using System.IO;

namespace FluxJpeg.Core.IO
{
    /// <summary>
    /// A Big-endian binary writer.
    /// </summary>
    internal class BinaryWriter
    {
        private Stream _stream;

        internal BinaryWriter(Stream stream)
        {
            _stream = stream;
        }

        internal void Write(byte[] val)
        {
            _stream.Write(val, 0, val.Length);
        }

        internal void Write(byte[] val, int offset, int count)
        {
            _stream.Write(val, offset, count);
        }


        internal void Write(short val)
        {
            _stream.WriteByte((byte)(( val >> 8 ) & 0xFF));
            _stream.WriteByte((byte)(val & 0xFF));
        }

        internal void Write(byte val)
        {
            _stream.WriteByte(val);
        }

    }
}

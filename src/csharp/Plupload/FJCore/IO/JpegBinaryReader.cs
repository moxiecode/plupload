/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.IO;

namespace FluxJpeg.Core.IO
{
    internal class JPEGMarkerFoundException : Exception
    {
        public JPEGMarkerFoundException(byte marker) { this.Marker = marker; }
        public byte Marker;
    }

    internal class JPEGBinaryReader : IO.BinaryReader
    {
        public int eob_run = 0;

        private byte marker;

        public JPEGBinaryReader(Stream input)
            : base(input)
        {
        }

        /// <summary>
        /// Seeks through the stream until a marker is found.
        /// </summary>
        public byte GetNextMarker()
        {
            try { while (true) { ReadJpegByte(); } }
            catch (JPEGMarkerFoundException ex) {
                return ex.Marker;
            }
        }

        byte _bitBuffer;

        protected int _bitsLeft = 0;

        public int BitOffset
        {
            get { return (8 - _bitsLeft) % 8; }
            set
            {
                if (_bitsLeft != 0) BaseStream.Seek(-1, SeekOrigin.Current);
                _bitsLeft = (8 - value) % 8;
            }
        }

        /// <summary>
        /// Places n bits from the stream, where the most-significant bits
        /// from the first byte read end up as the most-significant of the returned
        /// n bits.
        /// </summary>
        /// <param name="n">Number of bits to return</param>
        /// <returns>Integer containing the bits desired -- shifted all the way right.</returns>
        public int ReadBits(int n)
        {
            int result = 0;

            #region Special case -- included for optimization purposes
            if (_bitsLeft >= n)
            {
                _bitsLeft-=n;
                result = _bitBuffer >> (8 - n);
                _bitBuffer = (byte)(_bitBuffer << n);
                return result;
            }
            #endregion

            while (n > 0)
            {
                if (_bitsLeft == 0)
                {
                    _bitBuffer = ReadJpegByte();
                    _bitsLeft = 8;
                }

                int take = n <= _bitsLeft ? n : _bitsLeft;

                result = result | ((_bitBuffer >> 8 - take) << (n - take));

                _bitBuffer = (byte)(_bitBuffer << take);

                _bitsLeft -= take;
                n -= take;
            }

            return result;
        }

        protected byte ReadJpegByte()
        {
            byte c = ReadByte();

            /* If it's 0xFF, check and discard stuffed zero byte */
            if (c == JPEGMarker.XFF)
            {
                // Discard padded oxFFs
                while ((c = ReadByte()) == 0xff) ;

                // ff00 is the escaped form of 0xff
                if (c == 0) c = 0xff;
                else
                {
                    // Otherwise we've found a new marker.
                    marker = c;
                    throw new JPEGMarkerFoundException(marker);
                }
            }

            return c;
        }

    }
}

/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;

namespace FluxJpeg.Core
{
    internal sealed class JPEGMarker
    {
        // JFIF identifiers
        public const byte JFIF_J = (byte)0x4a;
        public const byte JFIF_F = (byte)0x46;
        public const byte JFIF_I = (byte)0x49;
        public const byte JFIF_X = (byte)0x46;

        // JFIF extension codes
        public const byte JFXX_JPEG = (byte)0x10;
        public const byte JFXX_ONE_BPP = (byte)0x11;
        public const byte JFXX_THREE_BPP = (byte)0x13;

        // Marker prefix. Next byte is a marker, unless ...
        public const byte XFF = (byte)0xff;
        // ... marker byte encoding an xff.
        public const byte X00 = (byte)0x00;

        #region Section Markers

        /// <summary>Huffman Table</summary>
        public const byte DHT = (byte)0xc4;

        /// <summary>Quantization Table</summary>
        public const byte DQT = (byte)0xdb;

        /// <summary>Start of Scan</summary>
        public const byte SOS = (byte)0xda;

        /// <summary>Define Restart Interval</summary>
        public const byte DRI = (byte)0xdd;

        /// <summary>Comment</summary>
        public const byte COM = (byte)0xfe;

        /// <summary>Start of Image</summary>
        public const byte SOI = (byte)0xd8;

        /// <summary>End of Image</summary>
        public const byte EOI = (byte)0xd9;

        /// <summary>Define Number of Lines</summary>
        public const byte DNL = (byte)0xdc;

        #endregion

        #region Application Reserved Keywords

        public const byte APP0 = (byte)0xe0;
        public const byte APP1 = (byte)0xe1;
        public const byte APP2 = (byte)0xe2;
        public const byte APP3 = (byte)0xe3;
        public const byte APP4 = (byte)0xe4;
        public const byte APP5 = (byte)0xe5;
        public const byte APP6 = (byte)0xe6;
        public const byte APP7 = (byte)0xe7;
        public const byte APP8 = (byte)0xe8;
        public const byte APP9 = (byte)0xe9;
        public const byte APP10 = (byte)0xea;
        public const byte APP11 = (byte)0xeb;
        public const byte APP12 = (byte)0xec;
        public const byte APP13 = (byte)0xed;
        public const byte APP14 = (byte)0xee;
        public const byte APP15 = (byte)0xef;

        #endregion

        public const byte RST0 = (byte)0xd0;
        public const byte RST1 = (byte)0xd1;
        public const byte RST2 = (byte)0xd2;
        public const byte RST3 = (byte)0xd3;
        public const byte RST4 = (byte)0xd4;
        public const byte RST5 = (byte)0xd5;
        public const byte RST6 = (byte)0xd6;
        public const byte RST7 = (byte)0xd7;

        #region Start of Frame (SOF)

        /// <summary>Nondifferential Huffman-coding frame (baseline dct)</summary>
        public const byte SOF0 = (byte)0xc0;

        /// <summary>Nondifferential Huffman-coding frame (extended dct)</summary>
        public const byte SOF1 = (byte)0xc1;

        /// <summary>Nondifferential Huffman-coding frame (progressive dct)</summary>
        public const byte SOF2 = (byte)0xc2;

        /// <summary>Nondifferential Huffman-coding frame Lossless (Sequential)</summary>
        public const byte SOF3 = (byte)0xc3;

        /// <summary>Differential Huffman-coding frame Sequential DCT</summary>
        public const byte SOF5 = (byte)0xc5;

        /// <summary>Differential Huffman-coding frame Progressive DCT</summary> 
        public const byte SOF6 = (byte)0xc6;

        /// <summary>Differential Huffman-coding frame lossless</summary>
        public const byte SOF7 = (byte)0xc7;

        /// <summary>Nondifferential Arithmetic-coding frame (extended dct)</summary>
        public const byte SOF9 = (byte)0xc9;

        /// <summary>Nondifferential Arithmetic-coding frame (progressive dct)</summary>
        public const byte SOF10 = (byte)0xca;

        /// <summary>Nondifferential Arithmetic-coding frame (lossless)</summary>
        public const byte SOF11 = (byte)0xcb;

        /// <summary>Differential Arithmetic-coding frame (sequential dct)</summary>
        public const byte SOF13 = (byte)0xcd;

        /// <summary>Differential Arithmetic-coding frame (progressive dct)</summary>
        public const byte SOF14 = (byte)0xce;

        /// <summary>Differential Arithmetic-coding frame (lossless)</summary>
        public const byte SOF15 = (byte)0xcf;

        #endregion

    }
}

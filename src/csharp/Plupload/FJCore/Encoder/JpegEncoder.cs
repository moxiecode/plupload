/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.
//
// Partially derives from a Java encoder, JpegEncoder.java by James R Weeks.
// Implements Baseline JPEG Encoding http://www.opennet.ru/docs/formats/jpeg.txt

using System;
using System.Collections.Generic;
using System.IO;

namespace FluxJpeg.Core.Encoder
{
    public class JpegEncodeProgressChangedArgs : EventArgs
    {
        public double EncodeProgress; // 0.0 to 1.0
    }

    public class JpegEncoder
    {
        JpegEncodeProgressChangedArgs _progress;

        DecodedJpeg _input;
        Stream _outStream;
        HuffmanTable _huf;
        DCT _dct;

        int _height; 
        int _width; 
        int _quality;

        private const int Ss = 0;
        private const int Se = 63;
        private const int Ah = 0;
        private const int Al = 0;

        private static readonly int[] CompID = { 1, 2, 3 };
        private static readonly int[] HsampFactor = { 1, 1, 1 };
        private static readonly int[] VsampFactor = { 1, 1, 1 };
        private static readonly int[] QtableNumber = { 0, 1, 1 };
        private static readonly int[] DCtableNumber = { 0, 1, 1 };
        private static readonly int[] ACtableNumber = { 0, 1, 1 };

        public event EventHandler<JpegEncodeProgressChangedArgs> EncodeProgressChanged;

        public JpegEncoder(Image image, int quality, Stream outStream)
            : this(new DecodedJpeg(image), quality, outStream) { /* see overload */ }

        /// <summary>
        /// Encodes a JPEG, preserving the colorspace and metadata of the input JPEG.
        /// </summary>
        /// <param name="decodedJpeg">Decoded Jpeg to start with.</param>
        /// <param name="quality">Quality of the image from 0 to 100.  (Compression from max to min.)</param>
        /// <param name="outStream">Stream where the result will be placed.</param>
        public JpegEncoder(DecodedJpeg decodedJpeg, int quality, Stream outStream)
        {
            _input = decodedJpeg;

            /* This encoder requires YCbCr */
            _input.Image.ChangeColorSpace(ColorSpace.YCbCr);

            _quality = quality;

            _height = _input.Image.Height;
            _width = _input.Image.Width;
            _outStream = outStream;
            _dct = new DCT(_quality);
            _huf = new HuffmanTable(null); 
        }

        public void Encode()
        {
            _progress = new JpegEncodeProgressChangedArgs();

            WriteHeaders();
            CompressTo(_outStream);
            WriteMarker(new byte[] { 0xFF, 0xD9 }); // End of Image

            _progress.EncodeProgress = 1.0;
            if (EncodeProgressChanged != null) 
                EncodeProgressChanged(this, _progress);

            _outStream.Flush();
        }

        internal void WriteHeaders()
        {
            int i, j, index, offset;
            int[] tempArray;

            // Start of Image
            byte[] SOI = { (byte)0xFF, (byte)0xD8 };
            WriteMarker(SOI);

            if (!_input.HasJFIF) // Supplement JFIF if missing
            {
                byte[] JFIF = new byte[18]
                {
                    (byte)0xff, (byte)0xe0,
                    (byte)0x00, (byte)0x10,
                    (byte)0x4a, (byte)0x46,
                    (byte)0x49, (byte)0x46,
                    (byte)0x00, (byte)0x01,
                    (byte)0x00, (byte)0x00,
                    (byte)0x00, (byte)0x01,
                    (byte)0x00, (byte)0x01,
                    (byte)0x00, (byte)0x00
                };

                WriteArray(JFIF);
            }

            IO.BinaryWriter writer = new IO.BinaryWriter(_outStream);

            /* APP headers and COM headers follow the same format 
             * which has a 16-bit integer length followed by a block
             * of binary data. */
            foreach (JpegHeader header in _input.MetaHeaders)
            {
                writer.Write(JPEGMarker.XFF);
                writer.Write(header.Marker);

                // Header's length
                writer.Write((short)(header.Data.Length + 2));
                writer.Write(header.Data);
            }

            // The DQT header
            // 0 is the luminance index and 1 is the chrominance index
            byte[] DQT = new byte[134];
            DQT[0] = JPEGMarker.XFF;
            DQT[1] = JPEGMarker.DQT;
            DQT[2] = (byte)0x00;
            DQT[3] = (byte)0x84;
            offset = 4;
            for (i = 0; i < 2; i++)
            {
                DQT[offset++] = (byte)((0 << 4) + i);
                tempArray = (int[])_dct.quantum[i];

                for (j = 0; j < 64; j++)
                {
                    DQT[offset++] = (byte)tempArray[ ZigZag.ZigZagMap[j] ];
                }
            }

            WriteArray(DQT);

            // Start of Frame Header ( Baseline JPEG )
            byte[] SOF = new byte[19];
            SOF[0] = JPEGMarker.XFF;
            SOF[1] = JPEGMarker.SOF0;
            SOF[2] = (byte)0x00;
            SOF[3] = (byte)17;
            SOF[4] = (byte)_input.Precision;
            SOF[5] = (byte)((_input.Image.Height >> 8) & 0xFF);
            SOF[6] = (byte)((_input.Image.Height) & 0xFF);
            SOF[7] = (byte)((_input.Image.Width >> 8) & 0xFF);
            SOF[8] = (byte)((_input.Image.Width) & 0xFF);
            SOF[9] = (byte)_input.Image.ComponentCount;
            index = 10;
            
            for (i = 0; i < SOF[9]; i++)
            {
                SOF[index++] = (byte)JpegEncoder.CompID[i];
                SOF[index++] = (byte)((_input.HsampFactor[i] << 4) + _input.VsampFactor[i]);
                SOF[index++] = (byte)JpegEncoder.QtableNumber[i];
            }

            WriteArray(SOF);

            // The DHT Header
            byte[] DHT1, DHT2, DHT3, DHT4;
            int bytes, temp, oldindex, intermediateindex;
            index = 4;
            oldindex = 4;
            DHT1 = new byte[17];
            DHT4 = new byte[4];
            DHT4[0] = JPEGMarker.XFF;
            DHT4[1] = JPEGMarker.DHT;
            for (i = 0; i < 4; i++)
            {
                bytes = 0;

                //  top 4 bits: table class (0=DC, 1=AC)
                //  bottom 4: index (0=luminance, 1=chrominance)
                byte huffmanInfo = (i == 0) ? (byte)0x00 :
                                   (i == 1) ? (byte)0x10 :
                                   (i == 2) ? (byte)0x01 : (byte)0x11;

                DHT1[index++ - oldindex] = huffmanInfo;

                for (j = 0; j < 16; j++)
                {
                    temp = _huf.bitsList[i][j];
                    DHT1[index++ - oldindex] = (byte)temp;
                    bytes += temp;
                }

                intermediateindex = index;
                DHT2 = new byte[bytes];
                for (j = 0; j < bytes; j++)
                {
                    DHT2[index++ - intermediateindex] = (byte)_huf.val[i][j];
                }
                DHT3 = new byte[index];
                Array.Copy(DHT4, 0, DHT3, 0, oldindex);
                Array.Copy(DHT1, 0, DHT3, oldindex, 17);
                Array.Copy(DHT2, 0, DHT3, oldindex + 17, bytes);
                DHT4 = DHT3;
                oldindex = index;
            }
            DHT4[2] = (byte)(((index - 2) >> 8) & 0xFF);
            DHT4[3] = (byte)((index - 2) & 0xFF);
            WriteArray(DHT4);

            // Start of Scan Header
            byte[] SOS = new byte[14];
            SOS[0] = JPEGMarker.XFF;
            SOS[1] = JPEGMarker.SOS;
            SOS[2] = (byte)0x00;
            SOS[3] = (byte)12;
            SOS[4] = (byte)_input.Image.ComponentCount;
            
            index = 5;

            for (i = 0; i < SOS[4]; i++)
            {
                SOS[index++] = (byte)JpegEncoder.CompID[i];
                SOS[index++] = (byte)((JpegEncoder.DCtableNumber[i] << 4) + JpegEncoder.ACtableNumber[i]);
            }

            SOS[index++] = (byte)JpegEncoder.Ss;
            SOS[index++] = (byte)JpegEncoder.Se;
            SOS[index++] = (byte)((JpegEncoder.Ah << 4) + JpegEncoder.Al);
            WriteArray(SOS);

        }


        internal void CompressTo(Stream outStream)
        {
            int i = 0, j = 0, r = 0, c = 0, a = 0, b = 0;
            int comp, xpos, ypos, xblockoffset, yblockoffset;
            byte[,] inputArray = null;
            float[,] dctArray1 = new float[8, 8];
            float[,] dctArray2 = new float[8, 8];
            int[] dctArray3 = new int[8 * 8];

            int[] lastDCvalue = new int[_input.Image.ComponentCount];

            int Width = 0, Height = 0;
            int MinBlockWidth, MinBlockHeight;

            // This initial setting of MinBlockWidth and MinBlockHeight is done to
            // ensure they start with values larger than will actually be the case.
            MinBlockWidth = ((_width % 8 != 0) ? (int)(Math.Floor((double)_width / 8.0) + 1) * 8 : _width);
            MinBlockHeight = ((_height % 8 != 0) ? (int)(Math.Floor((double)_height / 8.0) + 1) * 8 : _height);
            for (comp = 0; comp < _input.Image.ComponentCount; comp++)
            {
                MinBlockWidth = Math.Min(MinBlockWidth, _input.BlockWidth[comp]);
                MinBlockHeight = Math.Min(MinBlockHeight, _input.BlockHeight[comp]);
            }
            xpos = 0;

            for (r = 0; r < MinBlockHeight; r++)
            {
                // Keep track of progress
                _progress.EncodeProgress = (double)r / MinBlockHeight;
                if (EncodeProgressChanged != null) EncodeProgressChanged(this, _progress);

                for (c = 0; c < MinBlockWidth; c++)
                {
                    xpos = c * 8;
                    ypos = r * 8;
                    for (comp = 0; comp < _input.Image.ComponentCount; comp++)
                    {
                        Width = _input.BlockWidth[comp];
                        Height = _input.BlockHeight[comp];

                        inputArray = _input.Image.Raster[comp];

                        for (i = 0; i < _input.VsampFactor[comp]; i++)
                        {
                            for (j = 0; j < _input.HsampFactor[comp]; j++)
                            {
                                xblockoffset = j * 8;
                                yblockoffset = i * 8;
                                for (a = 0; a < 8; a++)
                                {
                                    // set Y value.  check bounds
                                    int y = ypos + yblockoffset + a; if (y >= _height) break;

                                    for (b = 0; b < 8; b++)
                                    {
                                        int x = xpos + xblockoffset + b; if (x >= _width) break;
                                        dctArray1[a, b] = inputArray[x,y];
                                    }
                                }
                                dctArray2 = _dct.FastFDCT(dctArray1);
                                dctArray3 = _dct.QuantizeBlock(dctArray2, JpegEncoder.QtableNumber[comp]);

                                _huf.HuffmanBlockEncoder(outStream, dctArray3, lastDCvalue[comp], JpegEncoder.DCtableNumber[comp], JpegEncoder.ACtableNumber[comp]);
                                lastDCvalue[comp] = dctArray3[0];
                            }
                        }
                    }
                }
            }

            _huf.FlushBuffer(outStream);
        }


        void WriteMarker(byte[] data)
        {
            _outStream.Write(data, 0, 2);
        }

        void WriteArray(byte[] data)
        {
            int length = (((int)(data[2] & 0xFF)) << 8) + (int)(data[3] & 0xFF) + 2;
            _outStream.Write(data, 0, length);
        }

    }

}
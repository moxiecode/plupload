/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using FluxJpeg.Core.IO;
using System.Diagnostics;

namespace FluxJpeg.Core.Decoder
{
    public enum BlockUpsamplingMode { 
        /// <summary> The simplest upsampling mode. Produces sharper edges. </summary>
        BoxFilter,
        /// <summary> Smoother upsampling. May improve color spread for some images. </summary>
        Interpolate 
    }

    public class JpegDecodeProgressChangedArgs : EventArgs
    {
        public bool SizeReady;
        public int Width;
        public int Height;

        public bool Abort;
        public long ReadPosition; // 0 to input stream length
        public double DecodeProgress; // 0 to 1.0
    }

    public class JpegDecoder
    {
        public static long ProgressUpdateByteInterval = 100;

        public event EventHandler<JpegDecodeProgressChangedArgs> DecodeProgressChanged;
        private JpegDecodeProgressChangedArgs DecodeProgress = new JpegDecodeProgressChangedArgs(); 

        public BlockUpsamplingMode BlockUpsamplingMode { get; set; }

        byte majorVersion, minorVersion;
        private enum UnitType { None = 0, Inches = 1, Centimeters = 2 };
        UnitType Units;
        ushort XDensity, YDensity;
        byte Xthumbnail, Ythumbnail;
        byte[] thumbnail;
        Image image;
        int width;
        int height;

        bool progressive = false;

        byte marker;

        /// <summary>
        /// This decoder expects JFIF 1.02 encoding.
        /// </summary>
        internal const byte MAJOR_VERSION = (byte)1;
        internal const byte MINOR_VERSION = (byte)2;

        /// <summary>
        /// The length of the JFIF field not including thumbnail data.
        /// </summary>
        internal static short JFIF_FIXED_LENGTH = 16;

        /// <summary>
        /// The length of the JFIF extension field not including extension data.
        /// </summary>
        internal static short JFXX_FIXED_LENGTH = 8;

        private JPEGBinaryReader jpegReader;

        List<JPEGFrame> jpegFrames = new List<JPEGFrame>();

        JpegHuffmanTable[] dcTables = new JpegHuffmanTable[4];
        JpegHuffmanTable[] acTables = new JpegHuffmanTable[4];
        JpegQuantizationTable[] qTables = new JpegQuantizationTable[4];

        public JpegDecoder(Stream input)
        {
            jpegReader = new JPEGBinaryReader(input);
            
            if (jpegReader.GetNextMarker() != JPEGMarker.SOI)
                throw new Exception("Failed to find SOI marker.");
        }

        /// <summary>
        /// Tries to parse the JFIF APP0 header
        /// See http://en.wikipedia.org/wiki/JFIF
        /// </summary>
        private bool TryParseJFIF(byte[] data)
        {
            IO.BinaryReader reader = new IO.BinaryReader(new MemoryStream(data));

            int length = data.Length + 2; // Data & length

            if (!(length >= JFIF_FIXED_LENGTH))
                return false;  // Header's too small.

            byte[] identifier = new byte[5];
            reader.Read(identifier, 0, identifier.Length);
            if (identifier[0] != JPEGMarker.JFIF_J
                || identifier[1] != JPEGMarker.JFIF_F
                || identifier[2] != JPEGMarker.JFIF_I
                || identifier[3] != JPEGMarker.JFIF_F
                || identifier[4] != JPEGMarker.X00)
                return false;  // Incorrect bytes

            majorVersion = reader.ReadByte();
            minorVersion = reader.ReadByte();
            if (majorVersion != MAJOR_VERSION
                || (majorVersion == MAJOR_VERSION
                    && minorVersion > MINOR_VERSION)) // changed from <
                return false; // Unsupported version

            Units = (UnitType)reader.ReadByte();
            if (Units != UnitType.None &&
                Units != UnitType.Inches &&
                Units != UnitType.Centimeters)
                return false; // Invalid units

            XDensity = reader.ReadShort();
            YDensity = reader.ReadShort();
            Xthumbnail = reader.ReadByte();
            Ythumbnail = reader.ReadByte();

            // 3 * for RGB data
            int thumbnailLength = 3 * Xthumbnail * Ythumbnail;
            if (length > JFIF_FIXED_LENGTH
                && thumbnailLength != length - JFIF_FIXED_LENGTH)
                return false; // Thumbnail fields invalid

            if (thumbnailLength > 0)
            {
                thumbnail = new byte[thumbnailLength];
                if (reader.Read(thumbnail, 0, thumbnailLength) != thumbnailLength)
                    return false; // Thumbnail data was missing!

            }

            return true;
        }

        public DecodedJpeg Decode()
        {
            // The frames in this jpeg are loaded into a list. There is
            // usually just one frame except in heirarchial progression where
            // there are multiple frames.
            JPEGFrame frame = null;

            // The restart interval defines how many MCU's we should have
            // between the 8-modulo restart marker. The restart markers allow
            // us to tell whether or not our decoding process is working
            // correctly, also if there is corruption in the image we can
            // recover with these restart intervals. (See RSTm DRI).
            int resetInterval = 0;

            bool haveMarker = false;
            bool foundJFIF = false;

            List<JpegHeader> headers = new List<JpegHeader>();

            // Loop through until there are no more markers to read in, at
            // that point everything is loaded into the jpegFrames array and
            // can be processed.
            while (true)
            {
                if (DecodeProgress.Abort) return null;

                #region Switch over marker types
                switch (marker)
                {
                    case JPEGMarker.APP0:
                    // APP1 is used for EXIF data
                    case JPEGMarker.APP1:
                    // Seldomly, APP2 gets used for extended EXIF, too
                    case JPEGMarker.APP2:
                    case JPEGMarker.APP3:
                    case JPEGMarker.APP4:
                    case JPEGMarker.APP5:
                    case JPEGMarker.APP6:
                    case JPEGMarker.APP7:
                    case JPEGMarker.APP8:
                    case JPEGMarker.APP9:
                    case JPEGMarker.APP10:
                    case JPEGMarker.APP11:
                    case JPEGMarker.APP12:
                    case JPEGMarker.APP13:
                    case JPEGMarker.APP14:
                    case JPEGMarker.APP15:
                    // COM: Comment
                    case JPEGMarker.COM:

                        // Debug.WriteLine(string.Format("Extracting Header, Type={0:X}", marker));

                        JpegHeader header = ExtractHeader();

                        #region Check explicitly for Exif Data

                        if (header.Marker == JPEGMarker.APP1 && header.Data.Length >= 6)
                        {
                            byte[] d = header.Data;
                           
                            if( d[0] == 'E' && 
                                d[1] == 'x' && 
                                d[2] == 'i' && 
                                d[3] == 'f' && 
                                d[4] == 0 && 
                                d[5] == 0)
                            {
                                // Exif.  Do something?
                            }
                        }

                        #endregion

                        #region Check for Adobe header

                        if (header.Data.Length >= 5 && header.Marker == JPEGMarker.APP14)
                        {
                            string asText = UTF8Encoding.UTF8.GetString(header.Data, 0, 5);
                            if (asText == "Adobe") {
                                // ADOBE HEADER.  Do anything?
                            }
                        }

                        #endregion

                        headers.Add(header);

                        if (!foundJFIF && marker == JPEGMarker.APP0)
                        {
                            foundJFIF = TryParseJFIF(header.Data);

                            if (foundJFIF) // Found JFIF... do JFIF extension follow?
                            {
                                header.IsJFIF = true;
                                marker = jpegReader.GetNextMarker();

                                // Yes, they do.
                                if (marker == JPEGMarker.APP0)
                                {
                                    header = ExtractHeader();
                                    headers.Add(header);
                                }
                                else // No.  Delay processing this one.
                                    haveMarker = true; 
                            }
                        }

                        break;

                    case JPEGMarker.SOF0:
                    case JPEGMarker.SOF2:

                        // SOFn Start of Frame Marker, Baseline DCT - This is the start
                        // of the frame header that defines certain variables that will
                        // be carried out through the rest of the encoding. Multiple
                        // frames are used in a hierarchical system, however most JPEG's
                        // only contain a single frame.

                        // Progressive or baseline?
                        progressive = marker == JPEGMarker.SOF2;

                        jpegFrames.Add(new JPEGFrame());
                        frame = (JPEGFrame)jpegFrames[jpegFrames.Count - 1];
                        frame.ProgressUpdateMethod = new Action<long>(UpdateStreamProgress);

                        // Skip the frame length.
                        jpegReader.ReadShort();
                        // Bits percision, either 8 or 12.
                        frame.setPrecision(jpegReader.ReadByte());
                        // Scan lines (height) 
                        frame.ScanLines = jpegReader.ReadShort();
                        // Scan samples per line (width) 
                        frame.SamplesPerLine = jpegReader.ReadShort();
                        // Number of Color Components (channels).
                        frame.ComponentCount = jpegReader.ReadByte();

                        DecodeProgress.Height = frame.Height;
                        DecodeProgress.Width = frame.Width;
                        DecodeProgress.SizeReady = true;

                        if(DecodeProgressChanged != null)
                        {
                            DecodeProgressChanged(this, DecodeProgress);
                            if (DecodeProgress.Abort) return null;
                        }

                        // Add all of the necessary components to the frame.
                        for (int i = 0; i < frame.ComponentCount; i++)
                        {
                            byte compId = jpegReader.ReadByte();
                            byte sampleFactors = jpegReader.ReadByte();
                            byte qTableId = jpegReader.ReadByte();

                            byte sampleHFactor = (byte)(sampleFactors >> 4);
                            byte sampleVFactor = (byte)(sampleFactors & 0x0f);

                            frame.AddComponent(compId, sampleHFactor, sampleVFactor, qTableId);
                        }
                        break;

                    case JPEGMarker.DHT:

                        // DHT non-SOF Marker - Huffman Table is required for decoding
                        // the JPEG stream, when we receive a marker we load in first
                        // the table length (16 bits), the table class (4 bits), table
                        // identifier (4 bits), then we load in 16 bytes and each byte
                        // represents the count of bytes to load in for each of the 16
                        // bytes. We load this into an array to use later and move on 4
                        // huffman tables can only be used in an image.
                        int huffmanLength = (jpegReader.ReadShort() - 2);

                        // Keep looping until we are out of length.
                        int index = huffmanLength;

                        // Multiple tables may be defined within a DHT marker. This
                        // will keep reading until there are no tables left, most
                        // of the time there are just one tables.
                        while (index > 0)
                        {
                            // Read the identifier information and class
                            // information about the Huffman table, then read the
                            // 16 byte codelength in and read in the Huffman values
                            // and put it into table info.
                            byte huffmanInfo = jpegReader.ReadByte();
                            byte tableClass = (byte)(huffmanInfo >> 4);
                            byte huffmanIndex = (byte)(huffmanInfo & 0x0f);
                            short[] codeLength = new short[16];

                            for (int i = 0; i < codeLength.Length; i++)
                                codeLength[i] = jpegReader.ReadByte();

                            int huffmanValueLen = 0;
                            for (int i = 0; i < 16; i++)
                                huffmanValueLen += codeLength[i];
                            index -= (huffmanValueLen + 17);

                            short[] huffmanVal = new short[huffmanValueLen];
                            for (int i = 0; i < huffmanVal.Length; i++)
                            {
                                huffmanVal[i] = jpegReader.ReadByte();
                            }
                            // Assign DC Huffman Table.
                            if (tableClass == HuffmanTable.JPEG_DC_TABLE)
                                dcTables[(int)huffmanIndex] = new JpegHuffmanTable(codeLength, huffmanVal);

                            // Assign AC Huffman Table.
                            else if (tableClass == HuffmanTable.JPEG_AC_TABLE)
                                acTables[(int)huffmanIndex] = new JpegHuffmanTable(codeLength, huffmanVal);
                        }
                        break;

                    case JPEGMarker.DQT:

                        // DQT non-SOF Marker - This defines the quantization
                        // coeffecients, this allows us to figure out the quality of
                        // compression and unencode the data. The data is loaded and
                        // then stored in to an array.
                        short quantizationLength = (short)(jpegReader.ReadShort() - 2);
                        for (int j = 0; j < quantizationLength / 65; j++)
                        {
                            byte quantSpecs = jpegReader.ReadByte();
                            int[] quantData = new int[64];
                            if ((byte)(quantSpecs >> 4) == 0)
                            // Precision 8 bit.
                            {
                                for (int i = 0; i < 64; i++)
                                    quantData[i] = jpegReader.ReadByte();

                            }
                            else if ((byte)(quantSpecs >> 4) == 1)
                            // Precision 16 bit.
                            {
                                for (int i = 0; i < 64; i++)
                                    quantData[i] = jpegReader.ReadShort();
                            }
                            qTables[(int)(quantSpecs & 0x0f)] = new JpegQuantizationTable(quantData);
                        }
                        break;

                    case JPEGMarker.SOS:

                       Debug.WriteLine("Start of Scan (SOS)");


                        // SOS non-SOF Marker - Start Of Scan Marker, this is where the
                        // actual data is stored in a interlaced or non-interlaced with
                        // from 1-4 components of color data, if three components most
                        // likely a YCrCb model, this is a fairly complex process.

                        // Read in the scan length.
                        ushort scanLen = jpegReader.ReadShort();
                        // Number of components in the scan.
                        byte numberOfComponents = jpegReader.ReadByte();
                        byte[] componentSelector = new byte[numberOfComponents];

                        for (int i = 0; i < numberOfComponents; i++)
                        {
                            // Component ID, packed byte containing the Id for the
                            // AC table and DC table.
                            byte componentID = jpegReader.ReadByte();
                            byte tableInfo = jpegReader.ReadByte();

                            int DC = (tableInfo >> 4) & 0x0f;
                            int AC = (tableInfo) & 0x0f; 

                            frame.setHuffmanTables(componentID,
                                                   acTables[(byte)AC],
                                                   dcTables[(byte)DC]);


                            componentSelector[i] = componentID;
                        }

                        byte startSpectralSelection = jpegReader.ReadByte();
                        byte endSpectralSelection = jpegReader.ReadByte();
                        byte successiveApproximation = jpegReader.ReadByte();

                        #region Baseline JPEG Scan Decoding

                        if (!progressive)
                        {
                            frame.DecodeScanBaseline(numberOfComponents, componentSelector, resetInterval, jpegReader, ref marker);
                            haveMarker = true; // use resultant marker for the next switch(..)
                        }

                        #endregion

                        #region Progressive JPEG Scan Decoding

                        if (progressive)
                        {
                            frame.DecodeScanProgressive(
                                successiveApproximation, startSpectralSelection, endSpectralSelection,
                                numberOfComponents, componentSelector, resetInterval, jpegReader, ref marker);

                            haveMarker = true; // use resultant marker for the next switch(..)
                        }

                        #endregion

                        break;

                     
                    case JPEGMarker.DRI:
                        jpegReader.BaseStream.Seek(2, System.IO.SeekOrigin.Current);
                        resetInterval = jpegReader.ReadShort();
                        break;

                    /// Defines the number of lines.  (Not usually present)
                    case JPEGMarker.DNL:

                        frame.ScanLines = jpegReader.ReadShort();
                        break;

                    /// End of Image.  Finish the decode.
                    case JPEGMarker.EOI:

                        if (jpegFrames.Count == 0)
                        {
                            throw new NotSupportedException("No JPEG frames could be located.");
                        }
                        else if (jpegFrames.Count == 1)
                        {
                            // Only one frame, JPEG Non-Heirarchial Frame.
                            byte[][,] raster = Image.CreateRaster(frame.Width, frame.Height, frame.ComponentCount); 
                            
                            IList<JpegComponent> components = frame.Scan.Components;

                            int totalSteps = components.Count * 3; // Three steps per loop
                            int stepsFinished = 0;

                            for(int i = 0; i < components.Count; i++)
                            {
                                JpegComponent comp = components[i];

                                comp.QuantizationTable = qTables[comp.quant_id].Table;

                                // 1. Quantize
                                comp.quantizeData();
                                UpdateProgress(++stepsFinished, totalSteps);

                                // 2. Run iDCT (expensive)
                                comp.idctData();
                                UpdateProgress(++stepsFinished, totalSteps);

                                // 3. Scale the image and write the data to the raster.
                                comp.writeDataScaled(raster, i, BlockUpsamplingMode);

                                UpdateProgress(++stepsFinished, totalSteps);

                                // Ensure garbage collection.
                                comp = null; GC.Collect();
                            }

                            // Grayscale Color Image (1 Component).
                            if (frame.ComponentCount == 1)
                            {
                                ColorModel cm = new ColorModel() { colorspace = ColorSpace.Gray, Opaque = true };
                                image = new Image(cm, raster);
                            }
                            // YCbCr Color Image (3 Components).
                            else if (frame.ComponentCount == 3)
                            {
                                ColorModel cm = new ColorModel() { colorspace = ColorSpace.YCbCr, Opaque = true };
                                image = new Image(cm, raster);
                            }
                            // Possibly CMYK or RGBA ?
                            else
                            {
                                throw new NotSupportedException("Unsupported Color Mode: 4 Component Color Mode found.");
                            }

                            // If needed, convert centimeters to inches.
                            Func<double, double> conv = x => 
                                Units == UnitType.Inches ? x : x / 2.54;

                            image.DensityX = conv(XDensity);
                            image.DensityY = conv(YDensity);

                            height = frame.Height;
                            width = frame.Width;
                        }
                        else
                        {
                            // JPEG Heirarchial Frame
                            throw new NotSupportedException("Unsupported Codec Type: Hierarchial JPEG");
                        }
                        break;
 
                    // Only SOF0 (baseline) and SOF2 (progressive) are supported by FJCore
                    case JPEGMarker.SOF1:
                    case JPEGMarker.SOF3:
                    case JPEGMarker.SOF5:
                    case JPEGMarker.SOF6:
                    case JPEGMarker.SOF7:
                    case JPEGMarker.SOF9:
                    case JPEGMarker.SOF10:
                    case JPEGMarker.SOF11:
                    case JPEGMarker.SOF13:
                    case JPEGMarker.SOF14:
                    case JPEGMarker.SOF15:
                        throw new NotSupportedException("Unsupported codec type.");

                    default: break;  // ignore

                }

                #endregion switch over markers

                if (haveMarker) haveMarker = false;
                else
                {
                    try
                    {
                        marker = jpegReader.GetNextMarker();
                    }
                    catch (System.IO.EndOfStreamException)
                    {
                        break; /* done reading the file */
                    }
                }
            }

            DecodedJpeg result = new DecodedJpeg(image, headers);

            return result;
        }

        private JpegHeader ExtractHeader()
        {
            #region Extract the header

            int length = jpegReader.ReadShort() - 2;
            byte[] data = new byte[length];
            jpegReader.Read(data, 0, length);

            #endregion

            JpegHeader header = new JpegHeader()
            {
                Marker = marker,
                Data = data
            };
            return header;
        }

        #region Decode Progress Monitoring

        private void UpdateStreamProgress(long StreamPosition)
        {
            if (DecodeProgressChanged != null)
            {
                DecodeProgress.ReadPosition = StreamPosition;
                DecodeProgressChanged(this, DecodeProgress);
            };
        }

        private void UpdateProgress(int stepsFinished, int stepsTotal)
        {
            if (DecodeProgressChanged != null)
            {
                DecodeProgress.DecodeProgress = (double)stepsFinished / stepsTotal;
                DecodeProgressChanged(this, DecodeProgress);
            };
        }

        #endregion


    }
}

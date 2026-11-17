/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using FluxJpeg.Core.IO;

namespace FluxJpeg.Core.Decoder
{
    internal class JPEGFrame
    {
        public static byte JPEG_COLOR_GRAY = 1;
        public static byte JPEG_COLOR_RGB = 2;
        public static byte JPEG_COLOR_YCbCr = 3;
        public static byte JPEG_COLOR_CMYK = 4;

        public byte precision = 8;
        public byte colorMode = JPEGFrame.JPEG_COLOR_YCbCr;

        public ushort Width { get; private set; }
        public ushort Height { get; private set; }

        public JpegScan Scan = new JpegScan();

        public Action<long> ProgressUpdateMethod = null;

        public void AddComponent(byte componentID, byte sampleHFactor, byte sampleVFactor,
                                 byte quantizationTableID)
        {
            Scan.AddComponent(componentID, sampleHFactor, sampleVFactor, quantizationTableID, colorMode);
        }

        public void setPrecision(byte data) {  precision = data; }

        public ushort ScanLines { set { Height = value; } }
        public ushort SamplesPerLine { set { Width = value; } }

        public byte ColorMode { get { 
            return ComponentCount == 1 ? 
                JPEGFrame.JPEG_COLOR_GRAY : 
                JPEGFrame.JPEG_COLOR_YCbCr;

            } 
        }

        public byte ComponentCount  { get ; set; }

        public void setHuffmanTables(byte componentID, JpegHuffmanTable ACTable, JpegHuffmanTable DCTable)
        {
            JpegComponent comp = Scan.GetComponentById(componentID);

            if(DCTable != null) comp.setDCTable(DCTable);
            if(ACTable != null) comp.setACTable(ACTable);
        }

        public void DecodeScanBaseline(byte numberOfComponents, byte[] componentSelector, int resetInterval, JPEGBinaryReader jpegReader, ref byte marker)
        {
            // Set the decode function for all the components
            for (int compIndex = 0; compIndex < numberOfComponents; compIndex++)
            {
                JpegComponent comp = Scan.GetComponentById(componentSelector[compIndex]);
                comp.Decode = comp.DecodeBaseline;
            }

            DecodeScan(numberOfComponents, componentSelector, resetInterval, jpegReader, ref marker);
        }

        private int mcus_per_row(JpegComponent c)
        {
            return (((( Width * c.factorH ) + ( Scan.MaxH - 1)) / Scan.MaxH) + 7) / 8;
        }

        private void DecodeScan(byte numberOfComponents, byte[] componentSelector, int resetInterval, JPEGBinaryReader jpegReader, ref byte marker)
        {
            //TODO: not necessary
            jpegReader.eob_run = 0;

            int mcuIndex = 0;
            int mcuTotalIndex = 0;

            // This loops through until a MarkerTagFound exception is
            // found, if the marker tag is a RST (Restart Marker) it
            // simply skips it and moves on this system does not handle
            // corrupt data streams very well, it could be improved by
            // handling misplaced restart markers.

            int h = 0, v = 0;
            int x = 0;

            long lastPosition = jpegReader.BaseStream.Position;

            //TODO: replace this with a loop which knows how much data to expect
            while (true)
            {
                #region Inform caller of decode progress

                if (ProgressUpdateMethod != null)
                {
                    if (jpegReader.BaseStream.Position >= lastPosition + JpegDecoder.ProgressUpdateByteInterval)
                    {
                        lastPosition = jpegReader.BaseStream.Position;
                        ProgressUpdateMethod(lastPosition);
                    }
                }

                #endregion

                try
                {
                    // Loop though capturing MCU, instruct each
                    // component to read in its necessary count, for
                    // scaling factors the components automatically
                    // read in how much they need

                    // Sec A.2.2 from CCITT Rec. T.81 (1992 E)
                    bool interleaved = !(numberOfComponents == 1);

                    if (!interleaved)
                    {                        
                        JpegComponent comp = Scan.GetComponentById(componentSelector[0]);

                        comp.SetBlock(mcuIndex);

                        comp.DecodeMCU(jpegReader, h, v);

                        int mcus_per_line = mcus_per_row(comp);
                        int blocks_per_line = (int) Math.Ceiling((double)this.Width / (8 * comp.factorH));


                        // TODO: Explain the non-interleaved scan ------

                        h++; x++;
                        
                        if (h == comp.factorH)
                        {
                            h = 0; mcuIndex++;
                        }

                        if( (x % mcus_per_line) == 0)
                        {
                            x = 0;
                            v++;

                            if (v == comp.factorV)
                            {
                                if (h != 0) { mcuIndex++; h = 0; }
                                v = 0;
                            }
                            else
                            {
                                mcuIndex -= blocks_per_line;

                                // we were mid-block
                                if (h != 0) { mcuIndex++; h = 0; }
                            }
                        }

                        // -----------------------------------------------

                    }
                    else // Components are interleaved
                    {
                        for (int compIndex = 0; compIndex < numberOfComponents; compIndex++)
                        {
                            JpegComponent comp = Scan.GetComponentById(componentSelector[compIndex]);
                            comp.SetBlock(mcuTotalIndex); 

                            for (int j = 0; j < comp.factorV; j++)
                                for (int i = 0; i < comp.factorH; i++)
                                {
                                    comp.DecodeMCU(jpegReader, i, j);
                                }
                        }

                        mcuIndex++;
                        mcuTotalIndex++;
                    }
                }
                // We've found a marker, see if the marker is a restart
                // marker or just the next marker in the stream. If
                // it's the next marker in the stream break out of the
                // while loop, if it's just a restart marker skip it
                catch (JPEGMarkerFoundException ex)
                {
                    marker = ex.Marker;

                    // Handle JPEG Restart Markers, this is where the
                    // count of MCU's per interval is compared with
                    // the count actually obtained, if it's short then
                    // pad on some MCU's ONLY for components that are
                    // greater than one. Also restart the DC prediction
                    // to zero.
                    if (marker == JPEGMarker.RST0
                        || marker == JPEGMarker.RST1
                        || marker == JPEGMarker.RST2
                        || marker == JPEGMarker.RST3
                        || marker == JPEGMarker.RST4
                        || marker == JPEGMarker.RST5
                        || marker == JPEGMarker.RST6
                        || marker == JPEGMarker.RST7)
                    {
                        for (int compIndex = 0; compIndex < numberOfComponents; compIndex++)
                        {
                            JpegComponent comp = Scan.GetComponentById(componentSelector[compIndex]);
                            if (compIndex > 1)
                                comp.padMCU(mcuTotalIndex, resetInterval - mcuIndex);
                            comp.resetInterval();
                        }

                        mcuTotalIndex += (resetInterval - mcuIndex);
                        mcuIndex = 0;
                    }
                    else
                    {
                        break; // We're at the end of our scan, exit out.
                    }
                }
            }

        }

        public void DecodeScanProgressive(byte successiveApproximation, byte startSpectralSelection, byte endSpectralSelection, 
                                          byte numberOfComponents, byte[] componentSelector, int resetInterval, JPEGBinaryReader jpegReader, ref byte marker)
        {

            byte successiveHigh = (byte)(successiveApproximation >> 4);
            byte successiveLow = (byte)(successiveApproximation & 0x0f);

            if ((startSpectralSelection > endSpectralSelection) || (endSpectralSelection > 63))
                throw new Exception("Bad spectral selection.");

            bool dcOnly = startSpectralSelection == 0;
            bool refinementScan = (successiveHigh != 0);

            if (dcOnly) // DC scan
            {
                if (endSpectralSelection != 0)
                    throw new Exception("Bad spectral selection for DC only scan.");
            }
            else // AC scan
            {
                if (numberOfComponents > 1)
                    throw new Exception("Too many components for AC scan!");
            }

            // Set the decode function for all the components
            // TODO: set this for the scan and let the component figure it out
            for (int compIndex = 0; compIndex < numberOfComponents; compIndex++)
            {
                JpegComponent comp = Scan.GetComponentById(componentSelector[compIndex]);

                comp.successiveLow = successiveLow;

                if (dcOnly)
                {
                    if (refinementScan) // DC refine
                        comp.Decode = comp.DecodeDCRefine;
                    else  //               DC first
                        comp.Decode = comp.DecodeDCFirst;
                }
                else
                {
                    comp.spectralStart = startSpectralSelection;
                    comp.spectralEnd = endSpectralSelection;

                    if (refinementScan) // AC refine
                        comp.Decode = comp.DecodeACRefine;
                    else  //               AC first
                        comp.Decode = comp.DecodeACFirst;
                }
            }

            DecodeScan(numberOfComponents, componentSelector, resetInterval, jpegReader, ref marker);

        }



    }

}

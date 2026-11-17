/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.Collections.Generic;
using System.Text;

namespace FluxJpeg.Core
{
    public class JpegHeader
    {
        public byte Marker;
        public byte[] Data;
        internal bool IsJFIF = false;
        public new string ToString { get { return Encoding.UTF8.GetString(Data, 0, Data.Length); } }
    }

    public class DecodedJpeg
    {
        private Image _image; public Image Image { get { return _image; } }

        internal int[] BlockWidth;
        internal int[] BlockHeight;

        internal int Precision = 8;
        internal int[] HsampFactor = { 1, 1, 1 };
        internal int[] VsampFactor = { 1, 1, 1 };
        internal bool[] lastColumnIsDummy = new bool[] { false, false, false };
        internal bool[] lastRowIsDummy = new bool[] { false, false, false };

        internal int[] compWidth, compHeight;
        internal int MaxHsampFactor;
        internal int MaxVsampFactor;

        public bool HasJFIF { get; private set; }

        private List<JpegHeader> _metaHeaders;

        public IList<JpegHeader> MetaHeaders { get { return _metaHeaders.AsReadOnly(); } } 

        public DecodedJpeg(Image image, IEnumerable<JpegHeader> metaHeaders)
        {
            _image = image;

            // Handles null as an empty list
            _metaHeaders = (metaHeaders == null) ? 
                new List<JpegHeader>(0) : new List<JpegHeader>(metaHeaders);

            // Check if the JFIF header was present
            foreach (JpegHeader h in _metaHeaders)
                if (h.IsJFIF) { HasJFIF = true; break; }

            int components = _image.ComponentCount;

            compWidth = new int[components];
            compHeight = new int[components];
            BlockWidth = new int[components];
            BlockHeight = new int[components];

            Initialize();
        }

        public DecodedJpeg(Image image)
            : this(image, null)
        {
            _metaHeaders = new List<JpegHeader>();

            string comment = "Jpeg Codec | fluxcapacity.net ";

            _metaHeaders.Add( 
                new JpegHeader() {
                     Marker = JPEGMarker.COM,
                     Data = System.Text.Encoding.UTF8.GetBytes(comment)
                }
            );
        }

        /// <summary>
        /// This method creates and fills three arrays, Y, Cb, and Cr using the input image.
        /// </summary>
        private void Initialize()
        {
            int w = _image.Width, h = _image.Height;

            int y;

            MaxHsampFactor = 1;
            MaxVsampFactor = 1;

            for (y = 0; y < _image.ComponentCount; y++)
            {
                MaxHsampFactor = Math.Max(MaxHsampFactor, HsampFactor[y]);
                MaxVsampFactor = Math.Max(MaxVsampFactor, VsampFactor[y]);
            }
            for (y = 0; y < _image.ComponentCount; y++)
            {
                compWidth[y] = (((w % 8 != 0) ? ((int)Math.Ceiling((double)w / 8.0)) * 8 : w) / MaxHsampFactor) * HsampFactor[y];
                if (compWidth[y] != ((w / MaxHsampFactor) * HsampFactor[y]))
                {
                    lastColumnIsDummy[y] = true;
                }

                // results in a multiple of 8 for compWidthz
                // this will make the rest of the program fail for the unlikely
                // event that someone tries to compress an 16 x 16 pixel image
                // which would of course be worse than pointless

                BlockWidth[y] = (int)Math.Ceiling((double)compWidth[y] / 8.0);
                compHeight[y] = (((h % 8 != 0) ? ((int)Math.Ceiling((double)h / 8.0)) * 8 : h) / MaxVsampFactor) * VsampFactor[y];
                if (compHeight[y] != ((h / MaxVsampFactor) * VsampFactor[y]))
                {
                    lastRowIsDummy[y] = true;
                }

                BlockHeight[y] = (int)Math.Ceiling((double)compHeight[y] / 8.0);
            }
        }

    }

}
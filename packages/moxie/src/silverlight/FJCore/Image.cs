/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;
#if SILVERLIGHT
#else
using System.Drawing;
using System.Drawing.Imaging;
#endif

namespace FluxJpeg.Core
{
    public struct ColorModel
    {
        public ColorSpace colorspace;
        public bool Opaque;
    }

    public enum ColorSpace { Gray, YCbCr, RGB }

    public class Image
    {
        private ColorModel _cm;
        private byte[][,] _raster;

        public byte[][,] Raster { get { return _raster; } }
        public ColorModel ColorModel { get { return _cm; } }

        /// <summary> X density (dots per inch).</summary>
        public double DensityX { get; set; }
        /// <summary> Y density (dots per inch).</summary>
        public double DensityY { get; set; }

        public int ComponentCount { get { return _raster.Length; } }

        /// <summary>
        /// Converts the colorspace of an image (in-place)
        /// </summary>
        /// <param name="cs">Colorspace to convert into</param>
        /// <returns>Self</returns>
        public Image ChangeColorSpace(ColorSpace cs)
        {
            // Colorspace is already correct
            if (_cm.colorspace == cs) return this;

            byte[] ycbcr = new byte[3];
            byte[] rgb = new byte[3];

            if (_cm.colorspace == ColorSpace.RGB && cs == ColorSpace.YCbCr)
            {
                /*
                 *  Y' =       + 0.299    * R'd + 0.587    * G'd + 0.114    * B'd
                    Cb = 128   - 0.168736 * R'd - 0.331264 * G'd + 0.5      * B'd
                    Cr = 128   + 0.5      * R'd - 0.418688 * G'd - 0.081312 * B'd
                 * 
                 */

                for (int x = 0; x < width; x++)
                    for (int y = 0; y < height; y++)
                    {
                        YCbCr.fromRGB(ref _raster[0][x, y], ref _raster[1][x, y], ref _raster[2][x, y]);
                    }

                _cm.colorspace = ColorSpace.YCbCr;


            }
            else if (_cm.colorspace == ColorSpace.YCbCr && cs == ColorSpace.RGB)
            {

                for (int x = 0; x < width; x++)
                    for (int y = 0; y < height; y++)
                    {
                        // 0 is LUMA
                        // 1 is BLUE
                        // 2 is RED

                        YCbCr.toRGB(ref _raster[0][x, y], ref _raster[1][x, y], ref _raster[2][x, y]);
                    }

                _cm.colorspace = ColorSpace.RGB;
            }
            else if (_cm.colorspace == ColorSpace.Gray && cs == ColorSpace.YCbCr)
            {
                // To convert to YCbCr, we just add two 128-filled chroma channels

                byte[,] Cb = new byte[width, height];
                byte[,] Cr = new byte[width, height];

                for (int x = 0; x < width; x++)
                    for (int y = 0; y < height; y++)
                    {
                        Cb[x, y] = 128; Cr[x, y] = 128;
                    }

                _raster = new byte[][,] { _raster[0], Cb, Cr };

                _cm.colorspace = ColorSpace.YCbCr;
            }
            else if (_cm.colorspace == ColorSpace.Gray && cs == ColorSpace.RGB)
            {
                ChangeColorSpace(ColorSpace.YCbCr);
                ChangeColorSpace(ColorSpace.RGB);
            }
            else
            {
                throw new Exception("Colorspace conversion not supported.");
            }

            return this;
        }

        private int width; private int height;

        public int Width { get { return width; } }
        public int Height { get { return height; } }

        public Image(ColorModel cm, byte[][,] raster)
        {
            width = raster[0].GetLength(0);
            height = raster[0].GetLength(1);

            _cm = cm;
            _raster = raster;
        }

        public static byte[][,] CreateRaster(int width, int height, int bands)
        {
            // Create the raster
            byte[][,] raster = new byte[bands][,];
            for (int b = 0; b < bands; b++)
                raster[b] = new byte[width, height];
            return raster;
        }

        delegate void ConvertColor(ref byte c1, ref byte c2, ref byte c3);

        #if SILVERLIGHT
        #else
        public Bitmap ToBitmap()
        {
            ConvertColor ColorConverter;

            switch(_cm.colorspace)
            {
                case ColorSpace.YCbCr:
                    ColorConverter = YCbCr.toRGB;
                    break;
                default:
                    throw new Exception("Colorspace not supported yet.");
            }

            int _width = width;
            int _height = height;

            Bitmap bitmap = new Bitmap(_width, _height, PixelFormat.Format32bppArgb);

            BitmapData bmData = bitmap.LockBits(new Rectangle(0, 0, bitmap.Width, bitmap.Height),
                System.Drawing.Imaging.ImageLockMode.WriteOnly,
                System.Drawing.Imaging.PixelFormat.Format32bppArgb);

            byte[] outColor = new byte[3];
            byte[] inColor = new byte[3];

            unsafe
            {
                int i = 0;

                byte* ptrBitmap = (byte*)bmData.Scan0;

                for (int y = 0; y < _height; y++)
                {
                    for (int x = 0; x < _width; x++)
                    {
                        ptrBitmap[0] = (byte)_raster[0][x, y];
                        ptrBitmap[1] = (byte)_raster[1][x, y];
                        ptrBitmap[2] = (byte)_raster[2][x, y];

                        ColorConverter(ref ptrBitmap[0], ref ptrBitmap[1], ref ptrBitmap[2]);

                        // Swap RGB --> BGR
                        byte R = ptrBitmap[0];
                        ptrBitmap[0] = ptrBitmap[2];
                        ptrBitmap[2] = R;

                        ptrBitmap[3] = 255; /* 100% opacity */
                        ptrBitmap += 4;     // advance to the next pixel
                        i++;                // "
                    }
                }
            }

            bitmap.UnlockBits(bmData);

            return bitmap;

        }
        #endif

    }
}

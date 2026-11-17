using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;

namespace FluxJpeg.Core.Filtering
{
    public class GrayImage 
    {
        public float[] Scan0;
        private int _width;
        private int _height;

        public int Width { get { return _width; } }
        public int Height { get { return _height; } }

        /// <summary>
        /// Returns a new 0.0-initialized image of specified size.
        /// </summary>
        /// <param name="width">Width in pixels</param>
        /// <param name="height">Height in pixels</param>
        public GrayImage(int width, int height)
        {
            _width = width; _height = height;
            Scan0 = new float[width * height];
        }

        /// <summary>
        /// Creates a 0.0 to 1.0 grayscale image from a bitmap.
        /// </summary>
        public GrayImage(byte[,] channel)
        {
            Convert(channel);
        }

        /// <summary>
        /// Access a pixel within the image.
        /// </summary>
        /// <param name="x">X-coordinate</param>
        /// <param name="y">Y-coordinate</param>
        /// <returns>Pixel brightness between 0.0 and 1.0</returns>
        public float this[int x, int y]
        {
            get { return Scan0[y * _width + x]; }
            set { Scan0[y * _width + x] = value; }
        }

        private void Convert(byte[,] channel)
        {
            _width = channel.GetLength(0);
            _height = channel.GetLength(1);

            Scan0 = new float[_width* _height];

            int i = 0;

            for (int y = 0; y < _height; y++)
                for (int x = 0; x < _width; x++)
                    Scan0[i++] = channel[x, y] / 255f;
        }

        public byte[,] ToByteArray2D()
        {
            byte[,] result = new byte[_width, _height];

            int i = 0;
            for (int y = 0; y < _height; y++)
                for (int x = 0; x < _width; x++)
                    result[x, y] = (byte)(Scan0[i++] * 255f);

            return result;
        }

        
    }
}

/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

using System;

namespace FluxJpeg.Core
{
    internal class YCbCr 
    {

        public static void toRGB(ref byte c1, ref byte c2, ref byte c3)
        {
            double dY = (double)c1;
            double dCb2 = (double)c2 - 128;
            double dCr2 = (double)c3 - 128;

            double dR = dY + 1.402 * dCr2;
            double dG = dY - 0.34414 * dCb2 - 0.71414 * dCr2;
            double dB = dY + 1.772 * dCb2;

            c1 = dR > 255 ? (byte)255 : dR < 0 ? (byte)0 : (byte)dR;
            c2 = dG > 255 ? (byte)255 : dG < 0 ? (byte)0 : (byte)dG;
            c3 = dB > 255 ? (byte)255 : dB < 0 ? (byte)0 : (byte)dB;
        }

        public static void fromRGB(ref byte c1, ref byte c2, ref byte c3)
        {
            double dR = (double)c1;
            double dG = (double)c2;
            double dB = (double)c3;

            c1 = (byte)(0.299 * dR + 0.587 * dG + 0.114 * dB);
            c2 = (byte)(-0.16874 * dR - 0.33126 * dG + 0.5 * dB + 128);
            c3 = (byte)(0.5 * dR - 0.41869 * dG - 0.08131 * dB + 128);
        }

        ///* RGB to YCbCr range 0-255 */
        //public static void fromRGB(byte[] rgb, byte[] ycbcr)
        //{
        //    ycbcr[0] = (byte)((0.299 * (float)rgb[0] + 0.587 * (float)rgb[1] + 0.114 * (float)rgb[2]));
        //    ycbcr[1] = (byte)(128 + (byte)((-0.16874 * (float)rgb[0] - 0.33126 * (float)rgb[1] + 0.5 * (float)rgb[2])));
        //    ycbcr[2] = (byte)(128 + (byte)((0.5 * (float)rgb[0] - 0.41869 * (float)rgb[1] - 0.08131 * (float)rgb[2])));
        //}


        /* RGB to YCbCr range 0-255 */
        public static float[] fromRGB(float[] data)
        {
            float[] dest = new float[3];

            dest[0] = (float)((0.299 * (float)data[0] + 0.587 * (float)data[1] + 0.114 * (float)data[2]));
            dest[1] = 128 + (float)((-0.16874 * (float)data[0] - 0.33126 * (float)data[1] + 0.5 * (float)data[2]));
            dest[2] = 128 + (float)((0.5 * (float)data[0] - 0.41869 * (float)data[1] - 0.08131 * (float)data[2]));

            return (dest);
        }
    }

}
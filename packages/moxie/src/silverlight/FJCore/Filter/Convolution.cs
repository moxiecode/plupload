/// Copyright (c) 2009 Jeffrey Powers for Occipital Open Source.
/// Under the MIT License, details: License.txt.

using System;
using System.Threading;

using FluxJpeg.Core;

namespace FluxJpeg.Core.Filtering
{
    public class Convolution
    {

        public static readonly Convolution Instance = new Convolution();

        public GrayImage GaussianConv(GrayImage data, double std)
        {
            float[] filter = GaussianFilter(std);
            return Conv2DSeparable(data, filter);
        }

        public float[] GaussianFilter(double std)
        {
            const double Precision = 0.01f;

            double var = std * std;

            double n = Math.Sqrt(-1 * var * Math.Log(Precision));
            int half = (int)Math.Ceiling(n);

            float[] filter = new float[half];

            double sum = -1.0;
            for (int i = 0; i < half; i++)
            {
                double val = Math.Exp(-0.5 * (i * i) / var);
                filter[i] = (float)val;
                sum += 2 * val;
            }

            /* Normalize */
            for (int i = 0; i < half; i++)
                filter[i] /= (float)sum;

            return filter;

        }

        public GrayImage Conv2DSeparable(GrayImage data, float[] filter)
        {
            GrayImage pass1 = Filter1DSymmetric(data, filter, true);
            GrayImage result = Filter1DSymmetric(pass1, filter, true);

            return result;
        }

        private struct FilterJob
        {
            public float[] filter;
            public int start;
            public int end;
            public GrayImage data;
            public GrayImage result;
            public int dataPtr;
            public int destPtr;
        }


        /// <summary>
        /// Filters an GrayImage with a 1D symmetric filter along the X-axis.
        /// (This operation is multithreaded)
        /// </summary>
        /// <param name="data">GrayImage to be operated on</param>
        /// <param name="filter">Filter to use (center tap plus right-hand-side)</param>
        /// <param name="transpose">Transpose the result?</param>
        /// <returns>Transposed, filtered GrayImage.</returns>
        public GrayImage Filter1DSymmetric(GrayImage data, float[] filter, bool transpose)
        {
            GrayImage result = transpose ?
                new GrayImage(data.Height, data.Width) :
                new GrayImage(data.Width, data.Height);

            int startY = 0;

            int destPtr = transpose ?  startY : (startY * result.Width);

            FilterJob job
                = new FilterJob
                {
                    filter = filter,
                    data = data,
                    destPtr = destPtr,
                    result = result,
                    start = startY,
                    end = data.Height / 2
                };

            ParameterizedThreadStart del = transpose ?
                new ParameterizedThreadStart(FilterPartSymmetricT) :
                new ParameterizedThreadStart(FilterPartSymmetric);

            Thread worker = new Thread(del);
            worker.Start(job);

            startY = data.Height / 2;
            destPtr = transpose ?  startY : (startY * result.Width);


            job.start = startY;
            job.destPtr = destPtr;
            job.end = data.Height;

            del((object)job); // Run the appropriate filter in this thread, too

            worker.Join();


            return result;
        }


        /// <summary>
        /// Convolves part of an GrayImage with a 1D filter along the X-axis
        /// and transposes it as well.
        /// </summary>
        /// <param name="filterJob">Filter operation details</param>
        private void FilterPartSymmetricT(object filterJob)
        {
            FilterJob fj = (FilterJob)filterJob;


            GrayImage data = fj.data;
            float[] srcData = data.Scan0;
            float[] filter = fj.filter;
            GrayImage result = fj.result;

            int pad = filter.Length - 1;

            #region Filter and transpose
            for (int y = fj.start; y < fj.end; y++)
            {
                int rowStart = y * data.Width;

                int ptr = rowStart;

                // Left checked region
                for (int x = 0; x < pad; x++)
                {
                    float pixel = srcData[ptr] * filter[0];

                    // Part of the filter that fits within the GrayImage
                    for (int i = 1; i < x + 1; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    // Part of the filter that falls off the left side
                    for (int i = x + 1; i < filter.Length; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr + i]) * filter[i];

                    result[y, x] = pixel; ptr++;
                }

                // Unchecked region
                for (int x = pad; x < data.Width - pad; x++)
                {
                    float pixel = srcData[ptr] * filter[0];

                    for (int i = 1; i < filter.Length; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    result[y, x] = pixel; ptr++;
                }

                // Right checked region
                for (int x = data.Width - pad; x < data.Width; x++)
                {
                    float pixel = srcData[ptr] * filter[0];

                    // Part of the filter that fits within the GrayImage
                    for (int i = 1; i < (data.Width - x); i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    // Part of the filter that falls off the right side
                    for (int i = (data.Width - x); i < filter.Length; i++)
                        pixel += (srcData[ptr - i] + srcData[ptr - i]) * filter[i];

                    result[y, x] = pixel; ptr++;
                }
            }
            #endregion

        }

        /// <summary>
        /// Convolves an GrayImage with a 1D filter along the X-axis.
        /// </summary>
        /// <param name="filterJob">Filter operation details</param>
        private void FilterPartSymmetric(object filterJob)
        {
            FilterJob fj = (FilterJob)filterJob;

            GrayImage data = fj.data;
            float[] srcData = data.Scan0;
            float[] filter = fj.filter;
            GrayImage result = fj.result;
            float[] resData = result.Scan0;

            int pad = filter.Length - 1;

            int destPtr = fj.destPtr;

            #region Filter (no transpose)
            for (int y = fj.start; y < fj.end; y++)
            {
                int rowStart = y * data.Width;

                int ptr = fj.dataPtr + rowStart;

                // Left checked region
                for (int x = 0; x < pad; x++)
                {
                    float pixel = srcData[ptr] * filter[0];

                    // Part of the filter that fits within the GrayImage
                    for (int i = 1; i < x + 1; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    // Part of the filter that falls off the left side
                    for (int i = x + 1; i < filter.Length; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr + i]) * filter[i];

                    resData[destPtr++] = pixel; ptr++;
                }

                // Unchecked region
                for (int x = pad; x < data.Width - pad; x++)
                {
                    float pixel = srcData[ptr] * filter[0];

                    for (int i = 1; i < filter.Length; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    resData[destPtr++] = pixel; ptr++;
                }

                // Right checked region
                for (int x = data.Width - pad; x < data.Width; x++)
                {
                    float pixel = srcData[ptr] * filter[0];

                    // Part of the filter that fits within the GrayImage
                    for (int i = 0; i < (data.Width - x); i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    // Part of the filter that falls off the right side
                    for (int i = (data.Width - x); i < filter.Length; i++)
                        pixel += (srcData[ptr + i] + srcData[ptr - i]) * filter[i];

                    resData[destPtr++] = pixel; ptr++;
                }
            }

            #endregion

        }



        public GrayImage Conv2DSymmetric(GrayImage data, GrayImage opLR)
        {
            int xPad = opLR.Width - 1;
            int yPad = opLR.Height - 1;

            GrayImage padded = new GrayImage(data.Width + 2 * xPad, data.Height + 2 * yPad);

            int dataIdx = 0;
            for (int y = 0; y < data.Height; y++)
            {
                int rowStart = (y + yPad) * (data.Width + 2 * xPad) + xPad;
                for (int x = 0; x < data.Width; x++)
                {
                    padded.Scan0[rowStart + x] = data.Scan0[dataIdx];
                    dataIdx++;
                }
            }

            return Conv2DSymm(padded, opLR);
        }


        /// <summary>
        /// Convolves an GrayImage with a 2D-symmetric operator.
        /// </summary>
        /// <param name="data">Data to be convolved with the operator</param>
        /// <param name="opUL">Lower-right quadrant of the operator.</param>
        /// <returns></returns>
        private GrayImage Conv2DSymm(GrayImage data, GrayImage opLR)
        {
            if (opLR.Width % 2 != 0 || opLR.Height % 2 != 0)
                throw new ArgumentException("Operator must have an even number of rows and columns.");

            int xPad = opLR.Width - 1;
            int yPad = opLR.Height - 1;

            GrayImage result = new GrayImage(data.Width - 2 * xPad, data.Height - 2 * yPad);

            for (int y = yPad; y < data.Height - yPad; y++)
            {
                for (int x = xPad; x < data.Width - xPad; x++)
                {
                    // Center pixel
                    float pixel = data[x, y] * opLR.Scan0[0];

                    // Vertical center
                    for (int op_y = 1; op_y < opLR.Height; op_y++)
                        pixel += (data[x, y + op_y] + data[x, y - op_y]) * opLR[0, op_y];

                    //Horizontal center
                    for (int op_x = 1; op_x < opLR.Width; op_x++)
                        pixel += (data[x + op_x, y] + data[x - op_x, y]) * opLR[op_x, 0];

                    //Quadrants
                    int opIdx = 1;

                    for (int op_y = 1; op_y < opLR.Height; op_y++)
                    {
                        int baseIdx1 = ((y + op_y) * data.Width) + x;
                        int baseIdx2 = ((y - op_y) * data.Width) + x;

                        // Loop unrolling can save 25% execution time here

                        for (int op_x = 1; op_x < opLR.Width; op_x++)
                        {
                            pixel += (data.Scan0[baseIdx1 + op_x] +
                                      data.Scan0[baseIdx2 + op_x] +
                                      data.Scan0[baseIdx1 - op_x] +
                                      data.Scan0[baseIdx2 - op_x]) * opLR.Scan0[opIdx];

                            opIdx++;
                        }

                        opIdx++; // Skip 0th col on next row
                    }

                    result[x - xPad, y - yPad] = pixel;

                } // loop over data x

            } // loop over data y

            return result;
        }

        /// <summary>
        /// Vanilla 2D convolution.  Not optimized.
        /// </summary>
        /// <param name="data"></param>
        /// <param name="op"></param>
        /// <returns></returns>
        public GrayImage Conv2D(GrayImage data, GrayImage op)
        {
            GrayImage result = new GrayImage(data.Width, data.Height);

            if (op.Width % 2 == 0 || op.Height % 2 == 0)
                throw new ArgumentException("Operator must have an odd number of rows and columns.");

            int x_offset = op.Width / 2;
            int y_offset = op.Height / 2;

            for (int y = 0; y < data.Height; y++)
            {
                for (int x = 0; x < data.Width; x++)
                {
                    float pixel = 0;
                    float wt = 0;

                    for (int op_y = 0; op_y < op.Height; op_y++)
                    {
                        int d_y = y - y_offset + op_y;
                        if (d_y < 0 || d_y >= data.Height) continue;

                        for (int op_x = 0; op_x < op.Width; op_x++)
                        {
                            int d_x = x - x_offset + op_x;
                            if (d_x < 0 || d_x >= data.Width) continue;

                            float op_val = op[op_x, op_y];

                            /* Perform actual convolution */
                            wt += Math.Abs(op_val);
                            pixel += data[d_x, d_y] * op_val;
                        }
                    }

                    result[x, y] = pixel / wt;

                } // loop over data x

            } // loop over data y

            return result;
        }

    }
}

/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.
 
using System;

namespace FluxJpeg.Core
{
    internal class JpegQuantizationTable
    {
        // The table entries, stored in natural order.
        private int[] table; public int[] Table { get { return table; } }

        /// <summary>
        /// The standard JPEG luminance quantization table.  Values are
        /// stored in natural order.
        /// </summary>
        public static JpegQuantizationTable K1Luminance = new JpegQuantizationTable(new int[]
        {
            16, 11, 10, 16,  24,  40,  51,  61,
            12, 12, 14, 19,  26,  58,  60,  55,
            14, 13, 16, 24,  40,  57,  69,  56,
            14, 17, 22, 29,  51,  87,  80,  62,
            18, 22, 37, 56,  68, 109, 103,  77,
            24, 35, 55, 64,  81, 104, 113,  92,
            49, 64, 78, 87, 103, 121, 120, 101,
            72, 92, 95, 98, 112, 100, 103,  99
        }, false);

        /// <summary>
        /// The standard JPEG luminance quantization table, scaled by
        /// one-half.  Values are stored in natural order.
        /// </summary>
        public static JpegQuantizationTable K1Div2Luminance =
          K1Luminance.getScaledInstance(0.5f, true);

        /// <summary>
        /// The standard JPEG chrominance quantization table.  Values are
        /// stored in natural order.
        /// </summary>
        public static JpegQuantizationTable K2Chrominance = new JpegQuantizationTable(new int[]
        {
            17, 18, 24, 47, 99, 99, 99, 99,
            18, 21, 26, 66, 99, 99, 99, 99,
            24, 26, 56, 99, 99, 99, 99, 99,
            47, 66, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99,
            99, 99, 99, 99, 99, 99, 99, 99
        }, false);

        /// <summary>
        /// The standard JPEG chrominance quantization table, scaled by
        /// one-half.  Values are stored in natural order.
        /// </summary>
        public static JpegQuantizationTable K2Div2Chrominance =
          K2Chrominance.getScaledInstance(0.5f, true);
        
        /// <summary>
        /// Construct a new JPEG quantization table.  A copy is created of
        /// the table argument.
        /// </summary>
        /// <param name="table">The 64-element value table, stored in natural order</param>
        public JpegQuantizationTable(int[] table)
            : this(checkTable(table), true)
        {
        }

        /// <summary>
        /// Private constructor that avoids unnecessary copying and argument
        /// checking.
        /// </summary>
        /// <param name="table">the 64-element value table, stored in natural order</param>
        /// <param name="copy">true if a copy should be created of the given table</param>
        private JpegQuantizationTable(int[] table, bool copy)
        {
            this.table = copy ? (int[])table.Clone() : table;
        }

        private static int[] checkTable(int[] table)
        {
            if (table == null || table.Length != 64)
                throw new ArgumentException("Invalid JPEG quantization table");

            return table;
        }

        /// <summary>
        /// Retrieve a copy of this JPEG quantization table with every value
        /// scaled by the given scale factor, and clamped from 1 to 255
        /// </summary>
        /// <param name="scaleFactor">the factor by which to scale this table</param>
        /// <param name="forceBaseline"> clamp scaled values to a maximum of 255 if baseline or from 1 to 32767 otherwise.</param>
        /// <returns>new scaled JPEG quantization table</returns>
        public JpegQuantizationTable getScaledInstance(float scaleFactor,
                                            bool forceBaseline)
        {
            int[] scaledTable = (int[])table.Clone();
            int max = forceBaseline ? 255 : 32767;

            for (int i = 0; i < scaledTable.Length; i++)
            {
                scaledTable[i] = (int)Math.Round(scaleFactor * (float)scaledTable[i]);
                if (scaledTable[i] < 1)
                    scaledTable[i] = 1;
                else if (scaledTable[i] > max)
                    scaledTable[i] = max;
            }

            return new JpegQuantizationTable(scaledTable, false);
        }

    }


}

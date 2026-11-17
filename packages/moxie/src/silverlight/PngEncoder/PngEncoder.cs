/**
 * PngEncoder takes a pixel data byte array and creates a byte string which can be saved as a PNG file.
 *
 * <p>Thanks to Jay Denny at KeyPoint Software
 *    http://www.keypoint.com/
 * who let me develop this code on company time.</p>
 *
 * <p>You may contact me with (probably very-much-needed) improvements,
 * comments, and bug fixes at:</p>
 *
 *   <p><code>david@catcode.com</code></p>
 *
 * <p>This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.</p>
 *
 * <p>This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.</p>
 *
 * <p>You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 * A copy of the GNU LGPL may be found at
 * <code>http://www.gnu.org/copyleft/lesser.html</code></p>
 *
 * @author J. David Eisenberg
 * @version 1.5, 19 Oct 2003
 *
 * CHANGES:
 * --------
 * 19-Nov-2002 : CODING STYLE CHANGES ONLY (by David Gilbert for Object Refinery Limited);
 * 19-Sep-2003 : Fix for platforms using EBCDIC (contributed by Paulo Soares);
 * 19-Oct-2003 : Change private fields to protected fields so that
 *               PngEncoderB can inherit them (JDE)
 *				 Fixed bug with calculation of nRows
 * 2009-12-22  : Ported Java version over to C#.
 */

using System;
using System.IO;

namespace Moxie.PngEncoder
{
	public class PngEncoder {
		/** Constant specifying that alpha channel should be encoded. */
		public const bool ENCODE_ALPHA = true;

		/** Constant specifying that alpha channel should not be encoded. */
		public const bool NO_ALPHA = false;

		/** Constants for filter (NONE) */
		public const int FILTER_NONE = 0;

		/** Constants for filter (SUB) */
		public const int FILTER_SUB = 1;

		/** Constants for filter (UP) */
		public const int FILTER_UP = 2;

		/** Constants for filter (LAST) */
		public const int FILTER_LAST = 2;

		/** IHDR tag. */
		protected static byte[] IHDR = new byte[] { 73, 72, 68, 82 };

		/** IDAT tag. */
		protected static byte[] IDAT = new byte[] { 73, 68, 65, 84 };

		/** IEND tag. */
		protected static byte[] IEND = new byte[] { 73, 69, 78, 68 };

		/** The png bytes. */
		protected byte[] pngBytes;

		/** The prior row. */
		protected byte[] priorRow;

		/** The left bytes. */
		protected byte[] leftBytes;

		/** The width. */
		protected int width, height;

		/** The byte position. */
		protected int bytePos, maxPos;

		/** CRC. */
		protected Crc32 crc = new Crc32();

		/** The CRC value. */
		protected long crcValue;

		/** Encode alpha? */
		protected bool encodeAlpha;

		/** The filter type. */
		protected int filter;

		/** The bytes-per-pixel. */
		protected int bytesPerPixel;

		/** The compression level. */
		protected int compressionLevel;

		/** PixelData array to encode */
		protected int[] pixelData;

		/**
		 * Class constructor specifying Image source to encode, whether to encode alpha, filter to use,
		 * and compression level.
		 *
		 * @param pixel_data A Java Image object
		 * @param encodeAlpha Encode the alpha channel? false=no; true=yes
		 * @param whichFilter 0=none, 1=sub, 2=up
		 * @param compLevel 0..9
		 * @see java.awt.Image
		 */
		public PngEncoder(int[] pixel_data, int width, int height, bool encodeAlpha, int whichFilter, int compLevel) {
			this.pixelData = pixel_data;
			this.width = width;
			this.height = height;
			this.encodeAlpha = encodeAlpha;

			this.filter = FILTER_NONE;
			if (whichFilter <= FILTER_LAST) {
				this.filter = whichFilter;
			}

			if (compLevel >= 0 && compLevel <= 9) {
				this.compressionLevel = compLevel;
			}
		}

		/**
		 * Creates an array of bytes that is the PNG equivalent of the current image, specifying
		 * whether to encode alpha or not.
		 *
		 * @param encodeAlpha boolean false=no alpha, true=encode alpha
		 * @return an array of bytes, or null if there was a problem
		 */
		public byte[] Encode(bool encodeAlpha) {
			byte[] pngIdBytes = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

			/*
			 * start with an array that is big enough to hold all the pixels
			 * (plus filter bytes), and an extra 200 bytes for header info
			 */
			pngBytes = new byte[((width + 1) * height * 3) + 200];

			/*
			 * keep track of largest byte written to the array
			 */
			maxPos = 0;

			bytePos = WriteBytes(pngIdBytes, 0);
			//hdrPos = bytePos;
			writeHeader();
			//dataPos = bytePos;
			if (WriteImageData()) {
				writeEnd();
				pngBytes = ResizeByteArray(pngBytes, maxPos);
			} else {
				pngBytes = null;
			}
			return pngBytes;
		}

		/**
		 * Creates an array of bytes that is the PNG equivalent of the current image.
		 * Alpha encoding is determined by its setting in the constructor.
		 *
		 * @return an array of bytes, or null if there was a problem
		 */
		public byte[] pngEncode() {
			return Encode(encodeAlpha);
		}

		/**
		 * Increase or decrease the length of a byte array.
		 *
		 * @param array The original array.
		 * @param newLength The length you wish the new array to have.
		 * @return Array of newly desired length. If shorter than the
		 *         original, the trailing elements are truncated.
		 */
		protected byte[] ResizeByteArray(byte[] array, int newLength) {
			byte[] newArray = new byte[newLength];
			int oldLength = array.Length;

			Array.Copy(array, 0, newArray, 0, Math.Min(oldLength, newLength));
			return newArray;
		}

		/**
		 * Write an array of bytes into the pngBytes array.
		 * Note: This routine has the side effect of updating
		 * maxPos, the largest element written in the array.
		 * The array is resized by 1000 bytes or the length
		 * of the data to be written, whichever is larger.
		 *
		 * @param data The data to be written into pngBytes.
		 * @param offset The starting point to write to.
		 * @return The next place to be written to in the pngBytes array.
		 */
		protected int WriteBytes(byte[] data, int offset) {
			maxPos = Math.Max(maxPos, offset + data.Length);
			if (data.Length + offset > pngBytes.Length)
				pngBytes = ResizeByteArray(pngBytes, pngBytes.Length + Math.Max(1000, data.Length));

			Array.Copy(data, 0, pngBytes, offset, data.Length);
			return offset + data.Length;
		}

		/**
		 * Write an array of bytes into the pngBytes array, specifying number of bytes to write.
		 * Note: This routine has the side effect of updating
		 * maxPos, the largest element written in the array.
		 * The array is resized by 1000 bytes or the length
		 * of the data to be written, whichever is larger.
		 *
		 * @param data The data to be written into pngBytes.
		 * @param nBytes The number of bytes to be written.
		 * @param offset The starting point to write to.
		 * @return The next place to be written to in the pngBytes array.
		 */
		protected int WriteBytes(byte[] data, int nBytes, int offset) {
			maxPos = Math.Max(maxPos, offset + nBytes);
			if (nBytes + offset > pngBytes.Length)
				pngBytes = ResizeByteArray(pngBytes, pngBytes.Length + Math.Max(1000, nBytes));

			Array.Copy(data, 0, pngBytes, offset, nBytes);
			return offset + nBytes;
		}

		/**
		 * Write a two-byte integer into the pngBytes array at a given position.
		 *
		 * @param n The integer to be written into pngBytes.
		 * @param offset The starting point to write to.
		 * @return The next place to be written to in the pngBytes array.
		 */
		protected int WriteInt2(int n, int offset) {
			byte[] temp = { (byte) ((n >> 8) & 0xff), (byte) (n & 0xff) };

			return WriteBytes(temp, offset);
		}

		/**
		 * Write a four-byte integer into the pngBytes array at a given position.
		 *
		 * @param n The integer to be written into pngBytes.
		 * @param offset The starting point to write to.
		 * @return The next place to be written to in the pngBytes array.
		 */
		protected int WriteInt4(int n, int offset) {
			byte[] temp = {(byte) ((n >> 24) & 0xff),
                       (byte) ((n >> 16) & 0xff),
                       (byte) ((n >> 8) & 0xff),
                       (byte) (n & 0xff)};

			return WriteBytes(temp, offset);
		}

		/**
		 * Write a single byte into the pngBytes array at a given position.
		 *
		 * @param b The integer to be written into pngBytes.
		 * @param offset The starting point to write to.
		 * @return The next place to be written to in the pngBytes array.
		 */
		protected int WriteByte(int b, int offset) {
			byte[] temp = { (byte) b };

			return WriteBytes(temp, offset);
		}

		/**
		 * Write a PNG "IHDR" chunk into the pngBytes array.
		 */
		protected void writeHeader() {
			int startPos;

			startPos = bytePos = WriteInt4(13, bytePos);

			bytePos = WriteBytes(IHDR, bytePos);
			bytePos = WriteInt4(width, bytePos);
			bytePos = WriteInt4(height, bytePos);
			bytePos = WriteByte(8, bytePos); // bit depth
			bytePos = WriteByte((encodeAlpha) ? 6 : 2, bytePos); // direct model
			bytePos = WriteByte(0, bytePos); // compression method
			bytePos = WriteByte(0, bytePos); // filter method
			bytePos = WriteByte(0, bytePos); // no interlace

			crc.Reset();
			crc.Update(pngBytes, startPos, bytePos - startPos);
			crcValue = crc.Value;

			bytePos = WriteInt4((int) crcValue, bytePos);
		}

		/**
		 * Perform "sub" filtering on the given row.
		 * Uses temporary array leftBytes to store the original values
		 * of the previous pixels.  The array is 16 bytes long, which
		 * will easily hold two-byte samples plus two-byte alpha.
		 *
		 * @param pixels The array holding the scan lines being built
		 * @param startPos Starting position within pixels of bytes to be filtered.
		 * @param width Width of a scanline in pixels.
		 */
		protected void FilterSub(byte[] pixels, int startPos, int width) {
			int i;
			int offset = bytesPerPixel;
			int actualStart = startPos + offset;
			int nBytes = width * bytesPerPixel;
			int leftInsert = offset;
			int leftExtract = 0;

			for (i = actualStart; i < startPos + nBytes; i++) {
				leftBytes[leftInsert] = pixels[i];
				pixels[i] = (byte) ((pixels[i] - leftBytes[leftExtract]) % 256);
				leftInsert = (leftInsert + 1) % 0x0f;
				leftExtract = (leftExtract + 1) % 0x0f;
			}
		}

		/**
		 * Perform "up" filtering on the given row.
		 * Side effect: refills the prior row with current row
		 *
		 * @param pixels The array holding the scan lines being built
		 * @param startPos Starting position within pixels of bytes to be filtered.
		 * @param width Width of a scanline in pixels.
		 */
		protected void FilterUp(byte[] pixels, int startPos, int width) {
			int i, nBytes;
			byte currentByte;

			nBytes = width * bytesPerPixel;

			for (i = 0; i < nBytes; i++) {
				currentByte = pixels[startPos + i];
				pixels[startPos + i] = (byte) ((pixels[startPos + i] - priorRow[i]) % 256);
				priorRow[i] = currentByte;
			}
		}

		/**
		 * Write the image data into the pngBytes array.
		 * This will write one or more PNG "IDAT" chunks. In order
		 * to conserve memory, this method grabs as many rows as will
		 * fit into 32K bytes, or the whole image; whichever is less.
		 *
		 *
		 * @return true if no errors; false if error grabbing pixels
		 */
		protected bool WriteImageData() {
			int rowsLeft = height;  // number of rows remaining to write
			int startRow = 0;       // starting row to process this time through
			int nRows;              // how many rows to grab at a time

			byte[] scanLines;       // the scan lines to be compressed
			int scanPos;            // where we are in the scan lines
			int startPos;           // where this line's actual pixels start (used for filtering)

			byte[] compressedLines; // the resultant compressed lines
			int nCompressed;        // how big is the compressed area?

			//int depth;              // color depth ( handle only 8 or 32 )

			bytesPerPixel = (encodeAlpha) ? 4 : 3;

			Deflater scrunch = new Deflater(compressionLevel);
			MemoryStream outBytes = new MemoryStream(1024);

			DeflaterOutputStream compBytes = new DeflaterOutputStream(outBytes, scrunch);
			try {
				while (rowsLeft > 0) {
					nRows = Math.Min(32767 / (width * (bytesPerPixel + 1)), rowsLeft);
					nRows = Math.Max(nRows, 1);

					int[] pixels = new int[width * nRows];
					Array.Copy(this.pixelData, width * startRow, pixels, 0, width * nRows);

					/*
					 * Create a data chunk. scanLines adds "nRows" for
					 * the filter bytes.
					 */
					scanLines = new byte[width * nRows * bytesPerPixel + nRows];

					if (filter == FILTER_SUB) {
						leftBytes = new byte[16];
					}
					if (filter == FILTER_UP) {
						priorRow = new byte[width * bytesPerPixel];
					}

					scanPos = 0;
					startPos = 1;
					for (int i = 0; i < width * nRows; i++) {
						if (i % width == 0) {
							scanLines[scanPos++] = (byte) filter;
							startPos = scanPos;
						}
						scanLines[scanPos++] = (byte) ((pixels[i] >> 16) & 0xff);
						scanLines[scanPos++] = (byte) ((pixels[i] >> 8) & 0xff);
						scanLines[scanPos++] = (byte) ((pixels[i]) & 0xff);
						if (encodeAlpha) {
							scanLines[scanPos++] = (byte) ((pixels[i] >> 24) & 0xff);
						}
						if ((i % width == width - 1) && (filter != FILTER_NONE)) {
							if (filter == FILTER_SUB) {
								FilterSub(scanLines, startPos, width);
							}
							if (filter == FILTER_UP) {
								FilterUp(scanLines, startPos, width);
							}
						}
					}

					/*
					 * Write these lines to the output area
					 */
					compBytes.Write(scanLines, 0, scanPos);

					startRow += nRows;
					rowsLeft -= nRows;
				}
				compBytes.Close();

				/*
				 * Write the compressed bytes
				 */
				compressedLines = outBytes.ToArray();
				nCompressed = compressedLines.Length;

				crc.Reset();
				bytePos = WriteInt4(nCompressed, bytePos);
				bytePos = WriteBytes(IDAT, bytePos);
				crc.Update(IDAT);
				bytePos = WriteBytes(compressedLines, nCompressed, bytePos);
				crc.Update(compressedLines, 0, nCompressed);

				crcValue = crc.Value;
				bytePos = WriteInt4((int) crcValue, bytePos);
				scrunch.Finish();
				return true;
			} catch {
				return false;
			}
		}

		/**
		 * Write a PNG "IEND" chunk into the pngBytes array.
		 */
		protected void writeEnd() {
			bytePos = WriteInt4(0, bytePos);
			bytePos = WriteBytes(IEND, bytePos);
			crc.Reset();
			crc.Update(IEND);
			crcValue = crc.Value;
			bytePos = WriteInt4((int) crcValue, bytePos);
		}
	}
}
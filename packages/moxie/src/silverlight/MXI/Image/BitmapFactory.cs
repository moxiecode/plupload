#region Header
//
//   Project:           WriteableBitmapEx - WriteableBitmap extensions
//   Description:       Collection of extension methods for the WriteableBitmap class.
//
//   Changed by:        $Author: unknown $
//   Changed on:        $Date: 2015-03-05 18:18:24 +0100 (Do, 05 Mrz 2015) $
//   Changed in:        $Revision: 113191 $
//   Project:           $URL: https://writeablebitmapex.svn.codeplex.com/svn/trunk/Source/WriteableBitmapEx/BitmapFactory.cs $
//   Id:                $Id: BitmapFactory.cs 113191 2015-03-05 17:18:24Z unknown $
//
//
//   Copyright © 2009-2015 Rene Schulte and WriteableBitmapEx Contributors
//
//   This code is open source. Please read the License.txt for details. No worries, we won't sue you! ;)
//
#endregion

using System;
using System.IO;
using System.Reflection;

#if NETFX_CORE
using Windows.Storage;
using Windows.Storage.Streams;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;

namespace Windows.UI.Xaml.Media.Imaging
#else
namespace System.Windows.Media.Imaging
#endif
{
    /// <summary>
    /// Cross-platform factory for WriteableBitmaps
    /// </summary>
    public static class BitmapFactory
    {
        /// <summary>
        /// Creates a new WriteableBitmap of the specified width and height
        /// </summary>
        /// <remarks>For WPF the default DPI is 96x96 and PixelFormat is Pbgra32</remarks>
        /// <param name="pixelWidth"></param>
        /// <param name="pixelHeight"></param>
        /// <returns></returns>
        public static WriteableBitmap New(int pixelWidth, int pixelHeight)
        {
            if (pixelHeight < 1) pixelHeight = 1;
            if (pixelWidth < 1) pixelWidth = 1;

#if SILVERLIGHT
            return new WriteableBitmap(pixelWidth, pixelHeight);
#elif WPF
            return new WriteableBitmap(pixelWidth, pixelHeight, 96.0, 96.0, PixelFormats.Pbgra32, null);
#elif NETFX_CORE
         return new WriteableBitmap(pixelWidth, pixelHeight);
#endif
        }

#if WPF
        /// <summary>
        /// Converts the input BitmapSource to the Pbgra32 format WriteableBitmap which is internally used by the WriteableBitmapEx.
        /// </summary>
        /// <param name="source">The source bitmap.</param>
        /// <returns></returns>
        public static WriteableBitmap ConvertToPbgra32Format(BitmapSource source)
        {
            // Convert to Pbgra32 if it's a different format
            if (source.Format == PixelFormats.Pbgra32)
            {
                return new WriteableBitmap(source);
            }

            var formatedBitmapSource = new FormatConvertedBitmap();
            formatedBitmapSource.BeginInit();
            formatedBitmapSource.Source = source;
            formatedBitmapSource.DestinationFormat = PixelFormats.Pbgra32;
            formatedBitmapSource.EndInit();
            return new WriteableBitmap(formatedBitmapSource);
        }
#endif

#if NETFX_CORE
        /// <summary>
        /// Loads an image from the applications content and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="uri">The URI to the content file.</param>
        /// <param name="pixelFormat">The pixel format of the stream data. If Unknown is provided as param, the default format of the BitmapDecoder is used.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static async Task<WriteableBitmap> FromContent(Uri uri, BitmapPixelFormat pixelFormat = BitmapPixelFormat.Unknown)
        {
            // Decode pixel data
            var file = await StorageFile.GetFileFromApplicationUriAsync(uri);
            using (var stream = await file.OpenAsync(FileAccessMode.Read))
            {
                return await FromStream(stream);
            }
        }

        /// <summary>
        /// Loads the data from an image stream and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="stream">The stream with the image data.</param>
        /// <param name="pixelFormat">The pixel format of the stream data. If Unknown is provided as param, the default format of the BitmapDecoder is used.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static async Task<WriteableBitmap> FromStream(Stream stream, BitmapPixelFormat pixelFormat = BitmapPixelFormat.Unknown)
        {
            using (var dstStream = new InMemoryRandomAccessStream())
            {
                await RandomAccessStream.CopyAsync(stream.AsInputStream(), dstStream);
                return await FromStream(dstStream);
            }
        }

        /// <summary>
        /// Loads the data from an image stream and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="stream">The stream with the image data.</param>
        /// <param name="pixelFormat">The pixel format of the stream data. If Unknown is provided as param, the default format of the BitmapDecoder is used.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static async Task<WriteableBitmap> FromStream(IRandomAccessStream stream, BitmapPixelFormat pixelFormat = BitmapPixelFormat.Unknown)
        {
            var decoder = await BitmapDecoder.CreateAsync(stream);
            var transform = new BitmapTransform();
            if (pixelFormat == BitmapPixelFormat.Unknown)
            {
                pixelFormat = decoder.BitmapPixelFormat;
            }
            var pixelData = await decoder.GetPixelDataAsync(pixelFormat, decoder.BitmapAlphaMode, transform, ExifOrientationMode.RespectExifOrientation, ColorManagementMode.ColorManageToSRgb);
            var pixels = pixelData.DetachPixelData();

            // Copy to WriteableBitmap
            var bmp = new WriteableBitmap((int)decoder.OrientedPixelWidth, (int)decoder.OrientedPixelHeight);
            using (var bmpStream = bmp.PixelBuffer.AsStream())
            {
                bmpStream.Seek(0, SeekOrigin.Begin);
                bmpStream.Write(pixels, 0, (int)bmpStream.Length);
                return bmp;
            }
        }

        /// <summary>
        /// Loads the data from a pixel buffer like the RenderTargetBitmap provides and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="pixelBuffer">The source pixel buffer with the image data.</param>
        /// <param name="width">The width of the image data.</param>
        /// <param name="height">The height of the image data.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static async Task<WriteableBitmap> FromPixelBuffer(IBuffer pixelBuffer, int width, int height)
        {
            // Copy to WriteableBitmap
            var bmp = new WriteableBitmap(width, height);
            using (var srcStream = pixelBuffer.AsStream())
            {
                using (var destStream = bmp.PixelBuffer.AsStream())
                {
                    srcStream.Seek(0, SeekOrigin.Begin);
                    await srcStream.CopyToAsync(destStream);
                }
                return bmp;
            }
        }
#else
        /// <summary>
        /// Loads an image from the applications resource file and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="relativePath">Only the relative path to the resource file. The assembly name is retrieved automatically.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static WriteableBitmap FromResource(string relativePath)
        {
            var fullName = Assembly.GetCallingAssembly().FullName;
            var asmName = new AssemblyName(fullName).Name;
            return FromContent(asmName + ";component/" + relativePath);
        }

        /// <summary>
        /// Loads an image from the applications content and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="relativePath">Only the relative path to the content file.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static WriteableBitmap FromContent(string relativePath)
        {
            using (var bmpStream = Application.GetResourceStream(new Uri(relativePath, UriKind.Relative)).Stream)
            {
                return FromStream(bmpStream);
            }
        }

        /// <summary>
        /// Loads the data from an image stream and returns a new WriteableBitmap.
        /// </summary>
        /// <param name="stream">The stream with the image data.</param>
        /// <returns>A new WriteableBitmap containing the pixel data.</returns>
        public static WriteableBitmap FromStream(Stream stream)
        {
            var bmpi = new BitmapImage();
#if SILVERLIGHT
            bmpi.SetSource(stream);
            bmpi.CreateOptions = BitmapCreateOptions.None;
#elif WPF
            bmpi.BeginInit();
            bmpi.CreateOptions = BitmapCreateOptions.None;
            bmpi.StreamSource = stream;
            bmpi.EndInit();
#endif
            var bmp = new WriteableBitmap(bmpi);
            bmpi.UriSource = null;
            return bmp;
        }
#endif

    }
}
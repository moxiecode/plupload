using System;
using System.IO;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Collections.Generic;

using FluxJpeg.Core.Encoder;
using FluxJpeg.Core;
using Moxie.PngEncoder;

using Moxiecode.Com.Events;
using Moxiecode.Com.Errors;
using Moxiecode.MXI;
using Moxiecode.MXI.Image;

namespace Moxiecode.Com
{
	public class Image
	{
		public static string[] dispatches = new string[] 
		{
			"Progress",
			"Load",
			"Resize",
			"Error"
		};

		public event ProgressEventHandler Progress;
		public event EventHandler Load;
		public event EventHandler Resize;
		public event EventHandler Error;

		public long size = 0;
		public int width = 0, height = 0;
		public string type = "";
		public string name = "";
		public Dictionary<string, object> meta = new Dictionary<string, object>();

		private WriteableBitmap _bm;
		private Format _img = null;

		private Dictionary<string, object> _options;

		private bool _preserveHeaders = true;


		public void loadFromBlob(object blob)
		{
			if (blob is string) {
				if ((blob = Moxie.compFactory.get((string)blob)) == null) {
					Error(this, new ErrorEventArgs(ImageError.WRONG_FORMAT));
					return;
				}
			}

			if (blob is File) {
				name = ((File)blob).name;
			}

			FileReader fileReader = new FileReader();
			MemoryStream stream = new MemoryStream();
			fileReader.ReadAsMemoryStream(blob, stream);
			loadFromStream(stream);
		}


		public void loadFromImage(object source)
		{
			if (source is string) {
				if ((source = Moxie.compFactory.get((string)source)) == null) {
					Error(this, new ErrorEventArgs(ImageError.WRONG_FORMAT));
					return;
				}
			}

			Image image = (Image)source;

			width = image.width;
			height = image.height;
			size = image.size;
			type = image.type;
			name = image.name;
			meta = image.meta;

			_bm = new WriteableBitmap(width, height);
			_bm.FromByteArray(image.getAsByteArray());

			Load(this, null);
		}


		public void loadFromByteArray(byte[] buffer)
		{
			loadFromStream(new MemoryStream(buffer));
		}


		public void loadFromStream(Stream stream)
		{
			size = stream.Length;

			if (JPEG.test(stream)) {
				_img = new JPEG(stream);
				type = JPEG.MIME;
				((JPEG)_img).extractHeaders(); // preserve headers for later
				meta = ((JPEG)_img).metaInfo();

				// save thumb data as Blob
				object thumbData;
				if (meta.ContainsKey("thumb") && ((Dictionary<string,object>)meta["thumb"]).TryGetValue("data", out thumbData)) {
					Blob blob = new Blob(new List<object> { (byte[])thumbData }, new Dictionary<string, string>{
						{ "type", "image/jpeg" }
					});
					Moxie.compFactory.add(blob.uid, blob);
					((Dictionary<string, object>)meta["thumb"])["data"] = blob.ToObject();
				}
			} else if (PNG.test(stream)) {
				_img = new PNG(stream);
				type = PNG.MIME;
			} else {
				Error(this, new ErrorEventArgs(ImageError.WRONG_FORMAT));
				return;
			}

			Dictionary<string, int> info = _img.info();
			if (info != null) {
				width = info["width"];
				height = info["height"];
			}

			BitmapImage bitmapImage = new BitmapImage();
			bitmapImage.SetSource(stream);
			_bm = new WriteableBitmap(bitmapImage);

			Load(this, null);
		}


		public Dictionary<string,object> getInfo()
		{
			return new Dictionary<string, object>()
			{
				{ "width", width },
				{ "height", height },
				{ "size", size },
				{ "type", type },
				{ "name", name },
				{ "meta", _preserveHeaders ? meta : null }
			};
		}


		public void resize(object x, object y, object width, object height, object ratio, object preserveHeaders, object resample)
		{
			try
			{
				WriteableBitmap bm = _bm.Crop(Convert.ToInt32(x), Convert.ToInt32(y), Convert.ToInt32(width), Convert.ToInt32(height));

				int destW = Convert.ToInt32(Math.Round(bm.PixelWidth * (double)ratio));
				int destH = Convert.ToInt32(Math.Round(bm.PixelHeight * (double)ratio));

				_bm = bm.Resize(
					destW,
					destH,
					(string)resample == "bilinear" 
						? WriteableBitmapExtension.Interpolation.Bilinear
						: WriteableBitmapExtension.Interpolation.NearestNeighbor
				);

				_preserveHeaders = (bool)preserveHeaders;

				int orientation = 1;
				if (meta.ContainsKey("tiff") && ((Dictionary<string, object>)meta["tiff"]).ContainsKey("Orientation"))
				{
					orientation = Convert.ToInt32(((Dictionary<string, object>)meta["tiff"])["Orientation"]);
				}


				if (type == JPEG.MIME) {
					if (!_preserveHeaders) {
						_bm = _rotateToOrientation(orientation);
					} else if (_img != null) {
						// insert new values into exif headers
						((JPEG)_img).updateDimensions(destW, destH);
						// update image info
						meta = ((JPEG)_img).metaInfo();
					}
				}

				this.width = _bm.PixelWidth;
				this.height = _bm.PixelHeight;

				Resize(this, null);
				return;
			}
			catch 
			{
				// Moxie.log(ex.Message);
				Error(this, null);
			}
		}


		public MemoryStream getAsEncodedStream(string type = null, int quality = 90)
		{
			MemoryStream imageStream = new MemoryStream();

			if (type == null) {
				type = this.type != "" ? this.type : JPEG.MIME;
			}

			if (type == JPEG.MIME) // Encode as JPEG
			{
				byte[][,] raster = _bm.ToRaster();

				FluxJpeg.Core.Image jpegImage = new FluxJpeg.Core.Image(new ColorModel {
					colorspace = ColorSpace.RGB
				}, raster);

				JpegEncoder jpegEncoder = new JpegEncoder(jpegImage, quality, imageStream);
				jpegEncoder.Encode();

				if (_img != null) {
					// strip off any headers that might be left by encoder, etc
					imageStream = new MemoryStream(((JPEG)_img).stripHeaders(imageStream));

					if (_preserveHeaders) {
						imageStream = new MemoryStream(((JPEG)_img).insertHeaders(imageStream));
					}
				}
			}
			else if (type == PNG.MIME) // Encode as PNG
			{
				PngEncoder pngEncoder = new PngEncoder(_bm.Pixels, _bm.PixelWidth, _bm.PixelHeight, false, PngEncoder.FILTER_NONE, Deflater.BEST_COMPRESSION);
				byte[] pngBuffer = pngEncoder.pngEncode();
				imageStream.Write(pngBuffer, 0, pngBuffer.Length);
			}
			else
			{
				Error(this, null);
				return null;
			}
			return imageStream;
		}


		public void getAsStream(Stream stream)
		{
			_bm.ToStream(stream);
		}


		public WriteableBitmap getAsWriteableBitmap()
		{
			return _bm;
		}


		public byte[] getAsByteArray()
		{
			return _bm.ToByteArray();
		}


		public Dictionary<string, object> getAsBlob(object type, object quality) 
		{
			return _getAsBlob((string)type, Convert.ToInt32(quality));
		}


		private Dictionary<string, object> _getAsBlob(string type = "image/jpeg", int quality = 90)
		{
			MemoryStream stream = getAsEncodedStream(type, quality);	
			File blob = new File(new List<object>{stream}, new Dictionary<string,string>{
				{ "name", this.name },
				{ "type", type }
			});
			Moxie.compFactory.add(blob.uid, blob);
			return blob.ToObject();
		}


		private WriteableBitmap _rotateToOrientation(int orientation)
		{
			switch (orientation)
			{
				case 2:
					// horizontal flip
					return _bm.Flip(WriteableBitmapExtension.FlipMode.Horizontal);
				case 3:
					// 180 rotate left
					return _bm.Rotate(180);
				case 4:
					// vertical flip
					return _bm.Flip(WriteableBitmapExtension.FlipMode.Vertical);
				case 5:
					// vertical flip + 90 rotate right
					return _bm.Flip(WriteableBitmapExtension.FlipMode.Vertical).Rotate(90);
				case 6:
					// 90 rotate right
					return _bm.Rotate(90);
				case 7:
					// horizontal flip + 90 rotate right
					return _bm.Flip(WriteableBitmapExtension.FlipMode.Horizontal).Rotate(90);
				case 8:
					// 90 rotate left
					return _bm.Rotate(270);
				default:
					return _bm;
			}
		}


		public void destroy()
		{
			_bm = null;
		}

		
		
	}
}

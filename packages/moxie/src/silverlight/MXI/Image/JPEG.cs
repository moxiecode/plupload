using System;
using System.IO;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Collections.Generic;

using Moxiecode.Com.Errors;

namespace Moxiecode.MXI.Image
{
	public class JPEG : Format
	{
		public const string MIME = "image/jpeg";

		private BinaryReader _br;

		private List<Dictionary<string, object>> _headers = null;


		public JPEG(Stream stream)
		{
			_br = new BinaryReader(stream);
		}

		static public bool test(Stream stream) 
		{
			byte[] signature = new byte[] { 255, 216 };
			bool result = true;
			BinaryReader br = new BinaryReader(stream);
						
			for (int i = signature.Length - 1; i >= 0 ; i--) {
				if (br.BYTE(i) != signature[i]) {
					result = false;
					break;
				}
			}
			br.clear();
			return result;
		}


		public override Dictionary<string, int> info(BinaryReader br = null) 
		{
			long idx = 0; 
			int marker, length;

			if (br == null)
			{
				br = _br;
			}
			
			// examine all through the end, since some images might have very large APP segments
			while (idx <= br.Length) {
				marker = br.SHORT(idx += 2);

				if (marker >= 0xFFC0 && marker <= 0xFFC3) { // SOFn 
					idx += 5; // marker (2 bytes) + length (2 bytes) + Sample precision (1 byte)
					
					return new Dictionary<string, int>() {
						{ "height", br.SHORT(idx) },
						{ "width", br.SHORT(idx += 2) }
					};
				}
				length = br.SHORT(idx += 2);
				idx += length - 2;			
			}
			return null;
		}	


		public Dictionary<string, object> metaInfo()
		{
			ExifParser exifParser; 
			Dictionary <string, object> tiff, exif, gps, thumb, meta;
			
			List<byte[]> headers = getHeaders("app1");
			meta = new Dictionary<string, object>();

			try
			{
				if (headers.Count != 0)
				{
					exifParser = new ExifParser();
					if (exifParser.init(headers[0]))
					{

						tiff = exifParser.TIFF();
						if (tiff != null)
						{
							meta.Add("tiff", tiff);
						}

						exif = exifParser.EXIF();
						if (exif != null)
						{
							meta.Add("exif", exif);
						}

						gps = exifParser.GPS();
						if (gps != null)
						{
							meta.Add("gps", gps);
						}

						thumb = getThumb(exifParser);
						if (thumb != null)
						{
							if (!thumb.ContainsKey("keys"))
							{
								string[] keys = new string[thumb.Keys.Count];
								thumb.Keys.CopyTo(keys, 0);
								thumb.Add("keys", keys);
							}

							meta.Add("thumb", thumb);
						}

						exifParser.purge();
					}
				}
			} catch (Exception ex) {}
			return meta;
		}


		public Dictionary<string, object> getThumb(ExifParser exifParser)
		{
			byte[] thumb = exifParser.thumb();
			if (thumb != null)
			{
				BinaryReader br = new BinaryReader(new MemoryStream(thumb));
				Dictionary<string, int> thumbInfo = info(br);
				br.clear();
				if (thumbInfo != null)
				{
					return new Dictionary<string, object>()
					{
						{ "width", thumbInfo["width"] },
						{ "height", thumbInfo["height"] },
						{ "data", thumb }
					};
				}
			}
			return null;
		}
	
		public List<Dictionary<string, object>> extractHeaders() 
		{
			long idx = 2;
			int length, marker;

			_headers = new List<Dictionary<string,object>>();
				
			while (idx <= _br.Length) {
				marker = _br.SHORT(idx);
				
				// omit RST (restart) markers
				if (marker >= 0xFFD0 && marker <= 0xFFD7) {
					idx += 2;
					continue;
				}
				
				// no headers allowed after SOS marker
				if (marker == 0xFFDA || marker == 0xFFD9) {
					break;	
				}	
				
				length = _br.SHORT(idx + 2) + 2;

				if (marker >= 0xFFE1 && marker <= 0xFFEF)
				{
					_headers.Add(new Dictionary<string,object>() {
						{ "hex", marker },
						{ "name", "APP" + (marker & 0x000F) },
						{ "start", idx },
						{ "length", length },
						{ "segment", _br.SEGMENT((int)idx, length) }
					});
				}
				
				idx += length;			
			}
			return _headers;
		}
		
		public List<byte[]> getHeaders(string name)
		{
			List<Dictionary<string,object>> headers = getHeaders();
			
			List<byte[]> array = new List<byte[]>();
			
			for (int i = 0, max = headers.Count; i < max; i++) {
				if ((string)headers[i]["name"] == name.ToUpper()) {
					array.Add((byte[])headers[i]["segment"]);
				}
			}
			return array;
		}


		public List<Dictionary<string,object>> getHeaders()
		{
			return _headers != null ? _headers : extractHeaders();
		}


		public void setHeaders(string name, object segment)
		{
			List<byte[]> array;
					
			if (segment is byte[]) {
				array = new List<byte[]>();
				array.Add((byte[])segment);	
			} else {
				array = (List<byte[]>)segment;	
			}
						
			for (int i = 0, ii = 0, max = _headers.Count; i < max; i++) {
				if ((string)_headers[i]["name"] == name.ToUpper()) {
					_headers[i]["segment"] = array[ii];
					_headers[i]["length"] = array[ii].Length;
					ii++;
				}
				if (ii >= array.Count) 
					break;
			}
		}
		
		
		public void updateDimensions(int width, int height)
		{
			ExifParser exifParser; 
			List<byte[]> headers;
			
			headers = getHeaders("app1");
			
			if (headers.Count != 0) {
				exifParser = new ExifParser();
				if (exifParser.init(headers[0])) {
					
					exifParser.setExif("PixelXDimension", width);
					exifParser.setExif("PixelYDimension", height);
					
					setHeaders("app1", exifParser.getBinary());						
				}
				exifParser.purge();
			}
		}

		public byte[] stripHeaders(Stream stream)
		{
			JPEG img = new JPEG(stream);
			List<Dictionary<string, object>> headers = img.extractHeaders();
			BinaryReader br = new BinaryReader(stream);

			for (int i = headers.Count - 1; i >= 0; i--)
			{
				br.SEGMENT(Convert.ToInt32(headers[i]["start"]), Convert.ToInt32(headers[i]["length"]), new byte[0]);
			}
			return br.SEGMENT();
		}
		
		
		public byte[] insertHeaders(Stream stream, List<Dictionary<string, object>> headers = null)
		{
			long idx;
			BinaryReader br = new BinaryReader(stream);

			if (headers == null || headers.Count == 0) {
				headers = _headers;
			}
	
			// Check if data is jpeg
			if (br.SHORT(0) != 0xFFD8) {
				throw new ImageError(ImageError.WRONG_FORMAT);
			}	
			
			if (headers.Count != 0) {
				idx = br.SHORT(2) == 0xFFE0 ? 4 + br.SHORT(4) : 2;
				
				for (int i = 0, max = headers.Count; i < max; i++) {
					br.SEGMENT((int)idx, 0, (byte[])headers[i]["segment"]);	
					idx += Convert.ToInt32(headers[i]["length"]);
				}
			}
			return br.SEGMENT();
		}
		
	}
}

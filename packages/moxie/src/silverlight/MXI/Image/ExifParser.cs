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

namespace Moxiecode.MXI.Image
{
	public class ExifParser
	{
		BinaryReader data;

		private Dictionary<string, object> Tiff;

		private Dictionary<string, long> offsets;
		
		private Dictionary<string, Dictionary<int, string>> tags = new Dictionary<string, Dictionary<int, string>>() {
			{ "tiff", new Dictionary<int, string>() {
				{ 0x0112, "Orientation" },		
				{ 0x010E, "ImageDescription" },
				{ 0x010F, "Make" },
				{ 0x0110, "Model" },
				{ 0x0131, "Software" },
				{ 0x8769, "ExifIFDPointer" },
				{ 0x8825, "GPSInfoIFDPointer" }
			} },
			
			{ "exif", new Dictionary<int, string>() {
				{ 0x9000, "ExifVersion" },
				{ 0xA001, "ColorSpace" },
				{ 0xA002, "PixelXDimension" },
				{ 0xA003, "PixelYDimension" },
				{ 0x9003, "DateTimeOriginal" },
				{ 0x829A, "ExposureTime" },
				{ 0x829D, "FNumber" },
				{ 0x8827, "ISOSpeedRatings" },
				{ 0x9201, "ShutterSpeedValue" },
				{ 0x9202, "ApertureValue"	 },
				{ 0x9207, "MeteringMode" },
				{ 0x9208, "LightSource" },
				{ 0x9209, "Flash" },
				{ 0x920A, "FocalLength" },
				{ 0xA402, "ExposureMode" },
				{ 0xA403, "WhiteBalance" },
				{ 0xA406, "SceneCaptureType" },
				{ 0xA404, "DigitalZoomRatio" },
				{ 0xA408, "Contrast" },
				{ 0xA409, "Saturation" },
				{ 0xA40A, "Sharpness" }
			} },
			
			{ "gps", new Dictionary<int, string>() {
				{ 0x0000, "GPSVersionID" },
				{ 0x0001, "GPSLatitudeRef" },
				{ 0x0002, "GPSLatitude" },
				{ 0x0003, "GPSLongitudeRef" },
				{ 0x0004, "GPSLongitude" }
			} },
 
			{ "thumb", new Dictionary<int, string>() {
				{ 0x0201, "JPEGInterchangeFormat" },
				{ 0x0202, "JPEGInterchangeFormatLength" }
			} }
		};
			
		private Dictionary<string, object>	tagDescs = new Dictionary<string, object>() {			
			{ "ColorSpace", new Dictionary<int, string>() {
				{ 1, "sRGB" },
				{ 0, "Uncalibrated" }
			} },
				
			{ "MeteringMode", new Dictionary<int, string>() {
				{ 0, "Unknown" },
				{ 1, "Average" },
				{ 2, "CenterWeightedAverage" },
				{ 3, "Spot" },
				{ 4, "MultiSpot" },
				{ 5, "Pattern" },
				{ 6, "Partial" },
				{ 255, "Other" }
			} },
				
			{ "LightSource", new Dictionary<int, string>() {
				{ 1, "Daylight" },
				{ 2, "Fliorescent" },
				{ 3, "Tungsten" },
				{ 4, "Flash" },
				{ 9, "Fine weather" },
				{ 10, "Cloudy weather" },
				{ 11, "Shade" },
				{ 12, "Daylight fluorescent (D 5700 - 7100K)" },
				{ 13, "Day white fluorescent (N 4600 -5400K)" },
				{ 14, "Cool white fluorescent (W 3900 - 4500K)" },
				{ 15, "White fluorescent (WW 3200 - 3700K)" },
				{ 17, "Standard light A" },
				{ 18, "Standard light B" },
				{ 19, "Standard light C" },
				{ 20, "D55" },
				{ 21, "D65" },
				{ 22, "D75" },
				{ 23, "D50" },
				{ 24, "ISO studio tungsten" },
				{ 255, "Other" }
			} },
				
			{ "Flash", new Dictionary<int, string>() {
				{ 0x0000, "Flash did not fire." },
				{ 0x0001, "Flash fired." },	
				{ 0x0005, "Strobe return light not detected." },
				{ 0x0007, "Strobe return light detected." },
				{ 0x0009, "Flash fired, compulsory flash mode" },
				{ 0x000D, "Flash fired, compulsory flash mode, return light not detected" },
				{ 0x000F, "Flash fired, compulsory flash mode, return light detected" },
				{ 0x0010, "Flash did not fire, compulsory flash mode" },
				{ 0x0018, "Flash did not fire, auto mode" },
				{ 0x0019, "Flash fired, auto mode" },
				{ 0x001D, "Flash fired, auto mode, return light not detected" },
				{ 0x001F, "Flash fired, auto mode, return light detected" },
				{ 0x0020, "No flash function" },
				{ 0x0041, "Flash fired, red-eye reduction mode" },
				{ 0x0045, "Flash fired, red-eye reduction mode, return light not detected" },
				{ 0x0047, "Flash fired, red-eye reduction mode, return light detected" },
				{ 0x0049, "Flash fired, compulsory flash mode, red-eye reduction mode" },
				{ 0x004D, "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected" },
				{ 0x004F, "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected" },
				{ 0x0059, "Flash fired, auto mode, red-eye reduction mode" },
				{ 0x005D, "Flash fired, auto mode, return light not detected, red-eye reduction mode" },
				{ 0x005F, "Flash fired, auto mode, return light detected, red-eye reduction mode" }
			} },
				
			{ "ExposureMode", new Dictionary<int, string>() {
				{ 0, "Auto exposure" },
				{ 1, "Manual exposure" },
				{ 2, "Auto bracket" }
			} },
				
			{ "WhiteBalance", new Dictionary<int, string>() {
				{ 0, "Auto white balance" },
				{ 1, "Manual white balance" }
			} },
				
			{ "SceneCaptureType", new Dictionary<int, string>() {
				{ 0, "Standard" },
				{ 1, "Landscape" },
				{ 2, "Portrait" },
				{ 3, "Night scene" }	
			} },
				
			{ "Contrast", new Dictionary<int, string>() {
				{ 0, "Normal" },
				{ 1, "Soft" },
				{ 2, "Hard" }
			} },
				
			{ "Saturation", new Dictionary<int, string>() {
				{ 0, "Normal" },
				{ 1, "Low saturation" },
				{ 2, "High saturation" }
			} },
				
			{ "Sharpness", new Dictionary<int, string>() {
				{ 0, "Normal" },
				{ 1, "Soft" },
				{ 2, "Hard" }
			} },
				
			{ "GPSLatitudeRef", new Dictionary<string, string>() {
				{ "N", "North latitude" },
				{ "S", "South latitude" }
			} },
				
			{ "GPSLongitudeRef", new Dictionary<string, string>() {
				{ "E", "East longitude" },
				{ "W", "West longitude" }
			}}	
		};


		public bool init(byte[] buffer)
		{
			MemoryStream stream = new MemoryStream(buffer);
			return init(stream);
		}

		
		public bool init(Stream segment) 
		{
			// Reset internal data
			offsets = new Dictionary<string, long>() {
				{ "tiffHeader", 10 }
			};
			
			if (segment == null || segment.Length == 0) {
				return false;
			}
			
			data = new BinaryReader(segment);
			
			// Check if that"s APP1 and that it has EXIF
			if (data.SHORT(0) == 0xFFE1 && data.STRING(4, 4).ToUpper() == "EXIF") {
				return getIFDOffsets();
			}
			return false;
		}

		public Dictionary<string, object> TIFF()
		{
			// store the keys separately (required for JS part to iterate over)
			if (!Tiff.ContainsKey("keys"))
			{
				string[] keys = new string[Tiff.Keys.Count];
				Tiff.Keys.CopyTo(keys, 0);
				Tiff.Add("keys", keys);
			}

			return Tiff;
		}
		
		
		public Dictionary<string, object> EXIF() 
		{	
			Dictionary<string, object> Exif;
			long exifOffset;

			if (!offsets.TryGetValue("exifIFD", out exifOffset)) {
				return null;
			}
			
			Exif = extractTags(exifOffset, tags["exif"]);
			
			// fix formatting of some tags
			object ExifVersion;
			if (Exif.TryGetValue("ExifVersion", out ExifVersion)) {
				if (ExifVersion is string[]) {
					string exifVersion = "";
					for (int i = 0; i < ((string[])ExifVersion).Length; i++) {
						exifVersion += (char)Convert.ToInt32(((string[])ExifVersion)[i]);	
					}
					Exif["ExifVersion"] = exifVersion;
				}
			}

			// store the keys separately (required for JS part to iterate over)
			if (!Exif.ContainsKey("keys"))
			{
				string[] keys = new string[Exif.Keys.Count];
				Exif.Keys.CopyTo(keys, 0);
				Exif.Add("keys", keys);
			}
			
			return Exif;	 
		}
		
		public Dictionary<string, object> GPS() 
		{
			Dictionary<string, object> Gps;
			long gpsOffset;

			if (!offsets.TryGetValue("gpsIFD", out gpsOffset)) {
				return null;
			}
			
			Gps = extractTags(offsets["gpsIFD"], tags["gps"]);	

			object GPSVersionID;
			if (Gps.TryGetValue("GPSVersionID", out GPSVersionID)) {
				if (GPSVersionID is string[]) {
					Gps["GPSVersionID"] = string.Join(".", (string[])GPSVersionID);
				}
			}

			// store the keys separately (required for JS part to iterate over)
			if (!Gps.ContainsKey("keys"))
			{
				string[] keys = new string[Gps.Keys.Count];
				Gps.Keys.CopyTo(keys, 0);
				Gps.Add("keys", keys);
			}

			return Gps;
		}


		public byte[] thumb()
		{
			Dictionary<string, object> IFD1Tags;

			if (!offsets.ContainsKey("IFD1")) {
				return null;
			}

			IFD1Tags = extractTags(offsets["IFD1"], tags["thumb"]);
			if (IFD1Tags.ContainsKey("JPEGInterchangeFormat") && IFD1Tags.ContainsKey("JPEGInterchangeFormatLength"))
			{
				return data.SEGMENT(Convert.ToInt32(offsets["tiffHeader"] + Convert.ToInt32(IFD1Tags["JPEGInterchangeFormat"])), Convert.ToInt32(IFD1Tags["JPEGInterchangeFormatLength"]));
			}

			return null;
		}
		
		
		public bool setExif(string tag, int value) 
		{
			// Right now only setting of width/height is possible
			if (tag != "PixelXDimension" && tag != "PixelYDimension") 
				return false;
			
			return setTag("exif", tag, value);
		}
		
		
		public byte[] getBinary() 
		{
			return data.SEGMENT();
		}
		
		
		private bool isJPEG() 
		{
			return data.SHORT(0) == 0xFFD8;
		}
		
		
		private bool getIFDOffsets() 
		{
			long idx = this.offsets["tiffHeader"];
			
			// Set read order of multi-byte data
			data.Endian = data.SHORT(idx) == 0x4949 ? BinaryReader.LITTLE_ENDIAN : BinaryReader.BIG_ENDIAN;

			// Check if always present bytes are indeed present
			if (data.SHORT(idx+=2) != 0x002A) {
				return false;
			}
			
			this.offsets.Add("IFD0", this.offsets["tiffHeader"] + data.LONG(idx += 2));

			Tiff = extractTags(this.offsets["IFD0"], tags["tiff"]);

			//Moxie.log(data.SHORT(idx).ToString("x"));
			
			object ExifIFDPointer, GPSInfoIFDPointer;
			if (Tiff.TryGetValue("ExifIFDPointer", out ExifIFDPointer)) {
				this.offsets.Add("exifIFD", this.offsets["tiffHeader"] + Convert.ToInt32(ExifIFDPointer));
				Tiff.Remove("ExifIFDPointer");
			}

			if (Tiff.TryGetValue("GPSInfoIFDPointer", out GPSInfoIFDPointer)) {
				this.offsets.Add("gpsIFD", this.offsets["tiffHeader"] + Convert.ToInt32(GPSInfoIFDPointer));
				Tiff.Remove("GPSInfoIFDPointer");
			}

			long ifd1Offset = data.LONG(this.offsets["IFD0"] + data.SHORT(this.offsets["IFD0"]) * 12 + 2);
			if (ifd1Offset > 0) {
				this.offsets.Add("IFD1", this.offsets["tiffHeader"] + ifd1Offset);
			}

			return true;
		}
		
		
		private Dictionary<string, object> extractTags(long IFD_offset, Dictionary<int, string> tags2extract) {
			long length = data.SHORT(IFD_offset), i, ii;
			long type, count, tagOffset, offset;
			string tag;
 			string[] values;
			
			Dictionary<string, object> hash = new Dictionary<string, object>();
			
			for (i = 0; i < length; i++) {
				// Set binary reader pointer to beginning of the next tag
				offset = tagOffset = IFD_offset + 12 * i + 2;
				
				if (!tags2extract.TryGetValue((int)data.SHORT(offset), out tag)) {
					continue; // Not the tag we requested
				}
				
				type = data.SHORT(offset+=2);
				count = data.LONG(offset+=2);
				values = new string[count];
				
				offset += 4;
				
				switch (type) {
					case 1: // BYTE
					case 7: // UNDEFINED
						if (count > 4) {
							offset = data.LONG(offset) + offsets["tiffHeader"];
						}
						
						for (ii = 0; ii < count; ii++) {
							values[ii] = data.BYTE(offset + ii).ToString();
						}
						break;
					
					case 2: // STRING
						if (count > 4) {
							offset = data.LONG(offset) + offsets["tiffHeader"];
						}
						
						hash.Add(tag, data.STRING(offset, (int)(count - 1)));	
						continue;
						
					case 3: // SHORT
						if (count > 2) {
							offset = data.LONG(offset) + offsets["tiffHeader"];
						}
						
						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SHORT(offset + ii*2).ToString();
						}
						break;
					
					case 4: // LONG
						if (count > 1) {
							offset = data.LONG(offset) + offsets["tiffHeader"];
						}
						
						for (ii = 0; ii < count; ii++) {
							values[ii] = data.LONG(offset + ii*4).ToString();
						}
						break;
					
					case 5: // RATIONAL
						offset = data.LONG(offset) + offsets["tiffHeader"];
						
						for (ii = 0; ii < count; ii++) {
							values[ii] = ((double)data.LONG(offset + ii*8)/(double)data.LONG(offset + ii*8 + 4)).ToString();
						}
						break;
					
					case 9: // SLONG
						offset = data.LONG(offset) + offsets["tiffHeader"];
						
						for (ii = 0; ii < count; ii++) {
							values[ii] = data.SLONG(offset + ii*4).ToString();
						}
						break;
					
					case 10: // SRATIONAL
						offset = data.LONG(offset) + offsets["tiffHeader"];
						
						for (ii = 0; ii < count; ii++) {
							values[ii] = ((double)data.SLONG(offset + ii*8)/(double)data.SLONG(offset + ii*8 + 4)).ToString();
						}
						break;
					
					default:
						continue;
				}
				
				object details;
				string description;
				
				if (values.Length == 1)
				{
					if (tagDescs.TryGetValue(tag, out details))
					{
						if (details is Dictionary<int, string> &&
							((Dictionary<int, string>)details).TryGetValue(Convert.ToInt32(values[0]), out description) ||
							details is Dictionary<string, string> &&
							((Dictionary<string, string>)details).TryGetValue(values[0], out description))
						{
							hash[tag] = description;
						}
					}
					else
					{
						hash[tag] = values[0];
					}
				} 
				else 
				{
					hash.Add(tag, values);
				}
			}
			
			return hash;
		}
		
	
		// At the moment only setting of simple (LONG) values, that do not require offset recalculation, is supported
		private bool setTag(string ifd, object tag, int value)
		{		
			// If tag name passed translate into hex key
			if (tag is string) {
				Dictionary<int, string> tmpTags = tags[ifd.ToLower()];
				foreach (KeyValuePair<int, string> pair in tmpTags) {
					if (pair.Value == (string)tag) {
						tag = pair.Key;
						break;	
					}
				}
			}
			
			long offset;
			if (!offsets.TryGetValue(ifd.ToLower() + "IFD", out offset)) {
				return false;
			}
			
			long length = data.SHORT(offset);
			long tagOffset, valueOffset = -1;
			
			for (int i = 0; i < length; i++) {
				tagOffset = offset + 12 * i + 2;
				
				if (data.SHORT(tagOffset) == (int)tag) {
					valueOffset = tagOffset + 8;
					break;
				}
			}
			
			if (valueOffset < 0) 
				return false;
			
			data.write((int)valueOffset, value, 4);
			return true;
		}


		public void purge()
		{
			data.clear();
		}
	}
}

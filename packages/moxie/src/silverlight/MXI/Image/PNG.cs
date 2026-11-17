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
	public class PNG : Format
	{
		public const string MIME = "image/png";

		private BinaryReader _br;


		public PNG(Stream stream)
		{
			_br = new BinaryReader(stream);
		}


		public static bool test(Stream stream)
		{
			byte[] signature = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 };
			bool result = true;
			BinaryReader br = new BinaryReader(stream);

			for (int i = signature.Length - 1; i >= 0; i--)
			{
				if (br.BYTE(i) != signature[i])
				{
					result = false;
					break;
				}
			}
			br.clear();
			return result;
		}


		public override Dictionary<string, int> info(BinaryReader br = null)
		{
			Dictionary<string, string> chunk;
			long idx;

			if (br == null)
			{
				br = _br;
			}
			
			chunk = _getChunkAt(8);
			
			if (chunk["type"] == "IHDR") {
				idx = Convert.ToInt32(chunk["start"]);
				return new Dictionary<string, int>() {
					{ "width", (int)_br.LONG(idx) },
					{ "height", (int)_br.LONG(idx += 4) }
				};
			}
			return null;
		}


		private  Dictionary<string, string> _getChunkAt(uint idx)
		{
			long length, start, CRC;
			string type; 
			
			length = _br.LONG(idx);
			type = _br.STRING(idx += 4, 4);
			start = idx += 4;	
			CRC = _br.LONG(idx + length);
			
			return new Dictionary<string, string>() {
				{ "length", length.ToString() },
				{ "type", type },
				{ "start", start.ToString() },
				{ "CRC", CRC.ToString() }
			};
		}
	}
}
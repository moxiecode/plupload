using System;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

namespace Moxiecode.Com.Errors
{
	public class ImageError : Exception
	{
		public const uint WRONG_FORMAT = 1;
		public const uint MAX_RESOLUTION_ERR = 2;

		public uint code;

		public ImageError(uint code)
			: base("")
		{
			this.code = code;
		}
	}
}

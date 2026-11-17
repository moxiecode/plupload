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
	public class DOMError : Exception
	{
		public const uint NOT_FOUND_ERR = 1;
		public const uint SECURITY_ERR = 2;
		public const uint ABORT_ERR = 3;
		public const uint NOT_READABLE_ERR = 4;
		public const uint ENCODING_ERR = 5;

		public uint code;

		public DOMError(uint code) : base("")
		{
			this.code = code;
		}
	}
}

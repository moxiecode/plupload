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
	public class RuntimeError : Exception
	{
		public const int NOT_SUPPORTED_ERR = 1;
		public const int COMP_CONFLICT = 23;
		public const int COMP_EXCEPTION = 24;

		private int _code = -1;

		public int code
		{
			get
			{
				return this._code > 0 ? this._code : this.HResult;
			}
		}

		public RuntimeError(int code = -1) : base("")
		{
			if (code > 0)
			{
				this._code = code;
			}
		}
	}
}



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

namespace Moxiecode.Com.Events
{
	/// <summary>
	///  Progress event arguments class.
	/// </summary>
	public class ProgressEventArgs : EventArgs
	{
		#region private fields
		private long loaded, total;
		private object data;
		#endregion

		/// <summary>
		///  Main constructor for the progress events args.
		/// </summary>
		/// <param name="loaded">Number of bytes uploaded.</param>
		/// <param name="total">Total bytes to upload.</param>
		public ProgressEventArgs(long loaded, long total, object data = null)
		{
			this.loaded = loaded;
			this.total = total;
			this.data = data;
		}

		/// <summary>Total bytes to upload.</summary>
		public long Total
		{
			get { return total; }
		}

		/// <summary>Number of bytes upload so far.</summary>
		public long Loaded
		{
			get { return loaded; }
		}

		public object Data
		{
			get { return data; }
		}
	}
}

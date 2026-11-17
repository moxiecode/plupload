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
using System.Collections.Generic;

namespace Moxiecode.MXI.Image
{
	public abstract class Format
	{
		public abstract Dictionary<string, int> info(BinaryReader br = null);
	}
}

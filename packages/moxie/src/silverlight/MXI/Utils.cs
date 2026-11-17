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
using System.Text;

namespace Moxiecode.MXI
{
	public static class Utils
	{
		private static int _guidCounter = 0;

		private static string convertTo(long value, int radix)
		{
			char[] alphabet = "0123456789abcdefghijklmnopqrstuv".ToCharArray();
			string result = "";

			if (value < radix) {
				return alphabet[value].ToString();
			}

			long index;
			while (value != 0)
			{
				index = value % radix;
				value = Convert.ToInt64(Math.Floor(value / radix));  
				result += alphabet[index].ToString();
			}
			return result;
		}


		public static string guid(string prefix = "o_")
		{
			string guid = convertTo(getTime(), 32);
			Random random = new Random();
			
			for (int i = 0; i < 5; i++) {
				guid += convertTo(Convert.ToInt32(Math.Floor(random.NextDouble() * 65535)), 32);
			}
			return prefix + guid + convertTo(_guidCounter++, 32);
		}


		public static long getTime()
		{
			DateTime january_1_1970 = new DateTime(1970, 1, 1);
			DateTime now = DateTime.Now;
			long elapsedTicks = now.Ticks - january_1_1970.Ticks;
			return Convert.ToInt64(elapsedTicks / 10000);
		}
	}
}

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
using System.Text.RegularExpressions;

namespace Moxiecode.MXI
{
	public static class JsonWriter
	{
		public static string stringify(Dictionary<string, object> obj)
		{
			string str = "{";

			foreach (KeyValuePair<string, object> pair in obj)
			{
				str += '"' + pair.Key + "\":";

				if (pair.Value is Dictionary<string, object>)
				{
					str += stringify((Dictionary<string, object>)pair.Value) + ',';
				}
				else if (pair.Value is string)
				{
					Match match;

					// check if integer
					match = Regex.Match((string)pair.Value, @"^[1-9]\d*$");
					if (match.Success)
					{
						str += (string)pair.Value + ',';
						continue;
					}

					// check if double
					match = Regex.Match((string)pair.Value, @"^\d*\.\d+$");
					if (match.Success) {
						str += (string)pair.Value + ',';
						continue;
					}

					// otherwise assume string
					str += '"' + (string)pair.Value + "\",";
				}
			}
			return str.TrimEnd(',') + "}";
		}
	}
}

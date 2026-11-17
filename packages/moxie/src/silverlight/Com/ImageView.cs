using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;

using Moxiecode.Com.Errors;

namespace Moxiecode.Com
{
	public class ImageView : Canvas
	{
		public static string[] dispatches = new string[] 
		{
			"Embedded"
		};

		public event EventHandler Embedded;

		public ImageView()
		{
			this.HorizontalAlignment = HorizontalAlignment.Stretch;
			this.VerticalAlignment = VerticalAlignment.Stretch;
		}


		public void display(object blob, object width, object height)
		{
			Canvas self = this;
			System.Windows.Controls.Image imageControl = new System.Windows.Controls.Image();
			
			Image image = new Image();

			image.Load += delegate(object sender, EventArgs args) {
				
				WriteableBitmap bm = image.getAsWriteableBitmap();
				image.destroy();

				imageControl.Source = bm;
				imageControl.Stretch = Stretch.Fill;

				self.Children.Add(imageControl);
				Embedded(this, null);
			};

			image.loadFromBlob(blob);
		}

	}
}

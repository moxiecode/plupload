/**
 * $Id: App.xaml.cs 490 2008-10-21 16:04:35Z spocke $
 *
 * @package MCManagerCore
 * @author Moxiecode
 * @copyright Copyright © 2007, Moxiecode Systems AB, All rights reserved.
 */

using System.Windows;
using System;
using System.Windows.Browser;

namespace Moxiecode.Plupload {
	/// <summary>
	///  Partial class for the Silverlight application.
	/// </summary>
	public partial class App : Application  {
		public App()  {
			this.Startup += this.OnStartup;
			this.UnhandledException += this.Application_UnhandledException;

			InitializeComponent();
		}

		private void OnStartup(object sender, StartupEventArgs e) {
			this.RootVisual = new Page(e.InitParams);
		}

		private void Application_UnhandledException(object sender, ApplicationUnhandledExceptionEventArgs e) {
			if (!System.Diagnostics.Debugger.IsAttached) {
				e.Handled = true;

				try {
					string errorMsg = e.ExceptionObject.Message + @"\n" + e.ExceptionObject.StackTrace;
					errorMsg = errorMsg.Replace("\"", "\\\"").Replace("\r\n", @"\n");

					System.Windows.Browser.HtmlPage.Window.Eval("throw new Error(\"Unhandled Error in Silverlight 2 Application: " + errorMsg + "\");");
				} catch (Exception) {
				}
			}
		}
	}
}
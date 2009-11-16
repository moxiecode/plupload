/**
 * App.xaml.cs
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
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
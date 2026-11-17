using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Windows.Browser;
using System.Net;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using System.Reflection;
using System.Xml.Serialization;
using System.Text.RegularExpressions;

using Moxiecode.Com;
using Moxiecode.Com.Events;
using Moxiecode.Com.Errors;

namespace Moxiecode
{
	/// <summary>
	///  Partial page class for the Silverlight page.
	/// </summary>
	public partial class Moxie : UserControl
	{
		public static string uid;

		public static ComponentFactory compFactory = new ComponentFactory();

		private String eventDispatcherNamespace = "moxie.core.EventTarget.instance";
		private String eventDispatcher = "dispatchEvent";

		/// <summary>
		///  Main constructor.
		/// </summary>
		/// <param name="init_params">Silverlight init params.</param>
		public Moxie(IDictionary<string, string> init_params)
		{
			InitializeComponent();

			Moxie.uid = init_params["uid"];

			String target;
			if (init_params.TryGetValue("target", out target)) {
				string[] targetParts = Regex.Split(target, @"\.(?=[^\.]+$)"); // split on last dot
				if (targetParts.Length == 1) {
					eventDispatcherNamespace = "window";
					eventDispatcher = targetParts[0];
				} else {
					eventDispatcherNamespace = targetParts[0];
					eventDispatcher = targetParts[1];
				}
			}

			HtmlPage.RegisterScriptableObject("Moxie", this);
			this._fireEvent(Moxie.uid + "::Init");
		}


		[ScriptableMember]
		public dynamic exec(string uid, string compName, string action, ScriptObject scriptObject = null)
		{
			// extract arguments
			List<object> args = new List<object>();
			if (scriptObject != null)
			{
				int i = 0;
				object prop;
				while (true) {
					prop = scriptObject.GetProperty(i++);
					if (prop != null) {
						args.Add(prop);
					} else {
						break;
					}
				}
			}
			return this._exec(uid, compName, action, args.Count != 0 ? args : null);
		}

		[ScriptableMember]
		public dynamic exec(string uid, string compName, string action)
		{
			return this._exec(uid, compName, action);
		}


		private dynamic _exec(string uid, string compName, string action, List<object> args = null)
		{
			try {
				object comp = Moxie.compFactory.get(uid);
				if (comp == null) {
					comp = Moxie.compFactory.create(this, uid, compName);
				}

				// execute the action if available
				MethodInfo methodInfo = comp.GetType().GetMethod(action);

				if (methodInfo != null) {
					if (args != null) {
						for (int i = 0; i < methodInfo.GetParameters().Length - args.Count; i++) {
							args.Add(null); // make sure we got values for optional parameters as well
						}
						return methodInfo.Invoke(comp, args.ToArray());
					}
					return methodInfo.Invoke(comp, null);
				}
				
				//FireEvent(uid + "::Exception", { name: "RuntimeError", code: RuntimeError.NOT_SUPPORTED_ERR });				
			}
			catch (Exception ex) {
				// re-route exceptions thrown by components
				_fireEvent(Moxie.uid + "::Exception", new Dictionary<string, object>() {
					{ "name", ex.GetType() },
					{ "code", RuntimeError.COMP_CONFLICT },
					{ "message", compName + "::" + action }
				});
			}
			return false;
		}


		public void OnComponentEvent(string uid, object sender, EventArgs eventArgs, string eventName)
		{
			// Moxie.log(eventName);

			if (eventArgs is ProgressEventArgs)
			{
				_fireEvent(new Dictionary<string, object>() {
					{ "type", uid + "::" + eventName },
					{ "total", ((ProgressEventArgs)eventArgs).Total },
					{ "loaded", ((ProgressEventArgs)eventArgs).Loaded }
				}, ((ProgressEventArgs)eventArgs).Data);
			}
			else if (eventArgs is DataEventArgs)
			{
				_fireEvent(uid + "::" + eventName, ((DataEventArgs)eventArgs).Data);
			}
			else if (eventArgs is ErrorEventArgs)
			{
				_fireEvent(uid + "::" + eventName, ((ErrorEventArgs)eventArgs).Code);
			}
			else
			{
				_fireEvent(uid + "::" + eventName, null);
			}
		}

		/// <summary>
		///  Reference to page level plupload.silverlight script object.
		/// </summary>
		public ScriptObject EventTarget
		{
			get { return ((ScriptObject)HtmlPage.Window.Eval(eventDispatcherNamespace)); }
		}

		/// <summary>
		///  Fires a specific event to the page level multi upload script.
		/// </summary>
		/// <param name="name">Event name to fire.</param>
		private void _fireEvent(string type, object args = null)
		{
			EventTarget.Invoke(eventDispatcher, new object[] { type, args });
		}


		private void _fireEvent(object type, object args = null)
		{
			EventTarget.Invoke(eventDispatcher, new object[] { type, args });
		}


		/// <summary>
		///  Send debug message to firebug console.
		/// </summary>
		/// <param name="msg">Message to write.</param>
		public static void log(params string[] args)
		{
			((ScriptObject)HtmlPage.Window.Eval("console")).Invoke("log", args);
		}

	}
}
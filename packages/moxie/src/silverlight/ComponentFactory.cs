using System;
using System.Net;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using System.Reflection;
using Moxiecode.Com;
using Moxiecode.Com.Errors;

namespace Moxiecode
{
	public class ComponentFactory
	{
		private Dictionary<string, object> _registry = new Dictionary<string, object>();

		public object get(String uid) 
		{		
			object comp = null;

			if (_registry.TryGetValue(uid, out comp)) {
				return comp;
			} 
			return null;
		}

		public Boolean contains(String uid)
		{
			return _registry.ContainsKey(uid);
		}

		public void add(String uid, object comp)
		{
			if (_registry.ContainsKey(uid)) {
				throw new RuntimeError(RuntimeError.COMP_CONFLICT);
			}
			_registry.Add(uid, comp);
		}
		
		
		public Boolean remove(string uid) 
		{
			if (!_registry.ContainsKey(uid)) {
				return false;
			}
			_registry.Remove(uid);
			return true;
		}

		
		public object create(Moxie mOxie, String uid, String compName)
		{
			object comp; 	
			
			String compFQName = "Moxiecode.Com." + compName;
			Type compClass = Type.GetType(compFQName);

			if (compClass != null) {
				comp = Activator.CreateInstance(compClass);
				
				FieldInfo fieldInfo = compClass.GetField("dispatches", BindingFlags.Static | BindingFlags.Public);
				object[] dispatches = (object[])fieldInfo.GetValue(comp);
				
				if (dispatches != null) {
					foreach (string eventName in dispatches) {
						EventInfo eventInfo = compClass.GetEvent(eventName);
						EventHandler handlerMethod = createEventHandler(mOxie, uid, eventName);
						Delegate handler = Delegate.CreateDelegate(eventInfo.EventHandlerType, handlerMethod.Target, handlerMethod.Method);
						eventInfo.AddEventHandler(comp, handler);
					}						
				}
				
				// if component is a control, display it
				if (comp is FrameworkElement) {
					mOxie.Layout.Children.Add((FrameworkElement)comp);
				}
				
				if (_registry.ContainsKey(uid)) {
					throw new RuntimeError(RuntimeError.COMP_CONFLICT);
				}
				
				_registry.Add(uid, comp);
				return comp;
			} else {
				// throw not supported exception
				return null;
			}	
		}

		public EventHandler createEventHandler(Moxie mOxie, string uid, string eventName)
		{
			return new EventHandler(delegate(object sender, EventArgs args) {
				mOxie.OnComponentEvent(uid, sender, args, eventName);
			});
		}
	}
}

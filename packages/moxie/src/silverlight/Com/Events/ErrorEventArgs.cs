using System;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Collections.Generic;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

namespace Moxiecode.Com.Events
{
    public class ErrorEventArgs : EventArgs
    {
        private uint _code;

        public ErrorEventArgs(uint code)
        {
            _code = code;
        }

        /// <summary>Total bytes to upload.</summary>
        public uint Code
        {
            get { return _code; }
        }
    }
}

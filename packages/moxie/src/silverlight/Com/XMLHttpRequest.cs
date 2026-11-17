using System;
using System.Net;
using System.Net.Browser;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using System.Windows;
using System.Windows.Browser;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Ink;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;

using Moxiecode.Com.Events;
using Moxiecode.Com.Errors;
using Moxiecode.MXI;

namespace Moxiecode.Com
{
	public delegate void ProgressEventHandler(object sender, ProgressEventArgs args);

	public class XMLHttpRequest
	{
		public static string[] dispatches = new string[] 
		{
			"LoadStart", 
			"Progress",
			"UploadProgress",
			"Load",
			"Error"
		};

		public static ManualResetEvent allDone = new ManualResetEvent(false);

		public event EventHandler LoadStart;
		public event ProgressEventHandler Progress;
		public event ProgressEventHandler UploadProgress;
		public event EventHandler Load;
		public event EventHandler Error;

		
		private Dictionary<string, string> _options;

		private Uri _url;
		
		private bool _multipart = false;
		private byte[] _multipartHeader;
		private byte[] _multipartFooter;

		private Dictionary<string, string> _headers;
		
		private object _blob;
		
		private string _blobName;
		
		private string _blobFieldName;
		
		private  Dictionary<string, List<string>> _postData;
		
		private MemoryStream _response;

		private int _status;

		private string _statusText;

		private string _responseHeaders = "";

		private HttpWebRequest _req;

		private SynchronizationContext _syncContext;

		private static CookieContainer _cookieContainer = new CookieContainer();


		public XMLHttpRequest()
		{
			this._reset();
		}


		public void setRequestHeader(object name, object value)
		{
			_headers.Add((string)name, (string)value);
		}


		public void append(object name, object value)
		{
			_multipart = true;

			List<string> postList;
			if (!_postData.TryGetValue((string)name, out postList)) {
				postList = new List<string>();
			}
			postList.Add((string)value);

			_postData.Remove((string)name);
			_postData.Add((string)name, postList);
		}


		public void appendBlob(object name, object blob)
		{
			_multipart = true;
			_blobFieldName = (string)name;
			_blobName = "blob" + Utils.getTime();

			if (blob is string) {
				if (!Moxie.compFactory.contains((string)blob)) {
					throw new DOMError(DOMError.NOT_FOUND_ERR);
				}
				blob = Moxie.compFactory.get((string)blob);
			}

			_blob = blob;

			if (_blob is File && ((File)_blob).name != "") {
				_blobName = ((File)_blob).name;
			}
		}


		public int getStatus()
		{
			return _status;
		}


		public string getStatusText()
		{
			return _statusText;
		}


		public string getAllResponseHeaders()
		{
			return _responseHeaders;
		}


		public Dictionary<string, object> getResponseAsBlob()
		{
			if (_response == null) {
				return null;
			}

			File blob = new File(new List<object>{_response}, new Dictionary<string, string>{{"name", _url.LocalPath }});
			Moxie.compFactory.add(blob.uid, blob);
			return blob.ToObject();
		}


		public void abort()
		{
			if (_req != null) {
				_req.Abort();
				_req = null;
			}
		}

		public void send(ScriptObject args, object blob = null)
		{
			_options = _extractOptions(args);
			_url = new Uri(_options["url"]);

			if (!_multipart) {
				_blob = blob;
			}

			if (_blob is string) {
				if (!Moxie.compFactory.contains((string)_blob)){
					throw new DOMError(DOMError.NOT_FOUND_ERR);
				}
				_blob = Moxie.compFactory.get((string)_blob);
			}
	
			if (_options["transport"] == "browser") {
				_req = (HttpWebRequest)WebRequestCreator.BrowserHttp.Create(_url);
			} else {
				_req = (HttpWebRequest)WebRequestCreator.ClientHttp.Create(_url);
				_req.CookieContainer = _cookieContainer;
				// disable buffering (this only works for ClientHttp version)
				//_req.AllowWriteStreamBuffering = false; // causes silent crash on Mac OS X 10.8.x
			}

			_req.Method = _options["method"];

			// add custom headers
			if (_headers.Count != 0)
			{
				foreach (string key in _headers.Keys)
				{
					if (_headers[key] == null)
						continue;

					switch (key.ToLower())
					{
						// in silverlight 3, these are set by the web browser that hosts the Silverlight application.
						// http://msdn.microsoft.com/en-us/library/system.net.httpwebrequest%28v=vs.95%29.aspx
						case "connection":
						case "content-length":
						case "expect":
						case "if-modified-since":
						case "referer":
						case "transfer-encoding":
						case "user-agent":
							break;

						// in silverlight this isn't supported, can not find reference to why not
						case "range":
							break;

						// in .NET Framework 3.5 and below, these are set by the system.
						// http://msdn.microsoft.com/en-us/library/system.net.httpwebrequest%28v=VS.90%29.aspx
						case "date":
						case "host":
							break;

						case "accept":
							_req.Accept = (string)_headers[key];
							break;

						case "content-type":
							_req.ContentType = _headers[key];
							break;
						default:
							_req.Headers[key] = (string)_headers[key];
							break;
					}
				}
			}

			_req.ContentLength = 0;
			if (_blob != null) {
				_req.ContentLength = ((Blob)_blob).size;
			}

			if (_multipart)
			{
				string boundary = "----moxieboundary" + Utils.getTime().ToString(), dashdash = "--", crlf = "\r\n";
				string header = "";

				// append mutltipart parameters
				foreach (KeyValuePair<string, List<string>> pair in _postData)
				{
					foreach (string value in pair.Value)
					{
						header +=
							dashdash + boundary + crlf +
							"Content-Disposition: form-data; name=\"" + pair.Key + '"' + crlf + crlf +
							value + crlf;
					}
				}

				// append multipart file header
				if (_blob != null)
				{
					header +=
						dashdash + boundary + crlf +
						"Content-Disposition: form-data; name=\"" + _blobFieldName + "\"; filename=\"" + _blobName + '"' +
                        crlf + "Content-Type: " + (!String.IsNullOrEmpty(_options["mimeType"]) ? _options["mimeType"] : "application/octet-stream") + crlf + crlf;
				}

				_multipartHeader = _stringToByteArray(header);
				_multipartFooter = _stringToByteArray((_blob != null ? crlf : "") + dashdash + boundary + dashdash + crlf);

				_req.ContentLength += _multipartHeader.Length + _multipartFooter.Length;
				_req.ContentType = "multipart/form-data; boundary=" + boundary;
			}
			else
			{
				_req.ContentType = _options["mimeType"];
			}

			LoadStart(this, null);

			_syncContext = SynchronizationContext.Current;

			if (_req.ContentLength == 0) {
				_req.BeginGetResponse(new AsyncCallback(_responseCallback), _req);
			} else {
				_req.BeginGetRequestStream(new AsyncCallback(_beginRequestStreamCallback), _req);
			}
		}


		private void _beginRequestStreamCallback(IAsyncResult asynchronousResult)
		{
			HttpWebRequest req = (HttpWebRequest)asynchronousResult.AsyncState;

			try
			{
				using (Stream reqStream = req.EndGetRequestStream(asynchronousResult))
				{
					if (_multipart) {
						reqStream.Write(_multipartHeader, 0, _multipartHeader.Length);
					}
					 
					// stream the file
					if (_blob != null)
					{
						Blob blob = (Blob)_blob;
						FileReader fileReader = new FileReader();
						
						int bytesRead = 0;
						long bytesLoaded = 0;
						byte[] buffer = new byte[1024 * 200];
	
						while ((bytesRead = fileReader.Read(blob, buffer, 0, buffer.Length)) != 0)
						{
							reqStream.Write(buffer, 0, bytesRead);
							reqStream.Flush(); // will block until data is sent

							bytesLoaded += bytesRead;
							_fireUploadProgress(bytesLoaded, blob.size);
						}
					}

					// append multipart file footer
					if (_multipart) {
						reqStream.Write(_multipartFooter, 0, _multipartFooter.Length);
					}
				}
			}
			catch (WebException ex) 
			{
				if (ex.Status != WebExceptionStatus.RequestCanceled) // if request was not aborted
				{
					_syncContext.Post(delegate
					{
						Error(this, null);
					}, this);
				}
			}
			catch (Exception ex)
			{
				_syncContext.Post(delegate
				{
					Error(this, null);
				}, this);
			}


			try
			{
				req.BeginGetResponse(new AsyncCallback(_responseCallback), req);
			}
			catch (WebException ex)
			{
				if (ex.Status != WebExceptionStatus.RequestCanceled) // if request was not aborted
				{
					_syncContext.Post(delegate
					{
						Error(this, null);
					}, this);
				}
			}
			catch (Exception ex)
			{
				_syncContext.Post(delegate
				{
					Error(this, null);
				}, this);
			}
		}


		private void _responseCallback(IAsyncResult asynchronousResult)
		{

			HttpWebRequest req = (HttpWebRequest)asynchronousResult.AsyncState;

			try
			{
				using (HttpWebResponse response = (HttpWebResponse)req.EndGetResponse(asynchronousResult))
				{
					_status = (int)response.StatusCode; // 4xx-5xx can throw WebException, we handle it below
					_statusText = response.StatusDescription;

					try {
						if (response.SupportsHeaders && response.Headers is WebHeaderCollection) {
							foreach (string header in response.Headers.AllKeys) {
								_responseHeaders += header + ": " + response.Headers[header] + "\r\n";
							}
						}
					}
					catch (Exception ex) { }

					using (Stream responseStream = response.GetResponseStream())
					{
						_response = new MemoryStream();
						
						int bytesRead = 0;
						long bytesLoaded = 0;
						byte[] buffer = new byte[1024 * 50];

						while ((bytesRead = responseStream.Read(buffer, 0, buffer.Length)) != 0)
						{
							_response.Write(buffer, 0, bytesRead);
							bytesLoaded += bytesRead;
							_fireProgress(bytesLoaded, response.ContentLength);
						}
						
						_response.Position = 0;
					}
				}

				_syncContext.Post(delegate
				{
					Load(this, null);
				}, this);
			}
			catch (WebException wex)
			{
				switch (wex.Status)
				{
					case WebExceptionStatus.RequestCanceled: 
						break;
					case WebExceptionStatus.UnknownError: // e.g. 404
						_status = (int)((HttpWebResponse)wex.Response).StatusCode;
						_response = new MemoryStream();

						_syncContext.Post(delegate
						{
							Load(this, null);
						}, this);
						break;
					default:
						_syncContext.Post(delegate
						{
							Error(this, null);
						}, this);
						break;
				}
			}
			catch (Exception ex)
			{
				_syncContext.Post(delegate
				{
					Error(this, null);
				}, this);
			}
			finally
			{
				_req = null; // let GC do its job
			}
		}


		private byte[] _stringToByteArray(string str) 
		{
			System.Text.UTF8Encoding encoding = new System.Text.UTF8Encoding();
			return encoding.GetBytes(str);
		}


		private Dictionary<string, string> _extractOptions(ScriptObject args)
		{
			Dictionary<string, string> defaults = new Dictionary<string, string>() {
				{ "url", null },
				{ "user", null },
				{ "password", null },
				{ "method", "POST" },
				{ "mimeType", "" },
				{ "encoding", "UTF-8" },
				{ "responseType", "" },
				{ "transport", "browser" }
			};

			Dictionary<string, string> options = new Dictionary<string, string>();
			foreach (string key in defaults.Keys) {
				options.Add(key, (string)args.GetProperty(key));
			}

			string value;
			foreach (var item in defaults) {
				if (!options.TryGetValue(item.Key, out value)) {
					options.Add(item.Key, item.Value);
				}
			}

			// make sure this one is uppercase
			options["method"] = options["method"].ToUpper();

			return options;
		}


		private void _fireProgress(long loaded, long total)
		{
			_syncContext.Post(delegate {
				Progress(this, new ProgressEventArgs(loaded, total));
			}, this);
		}


		private void _fireUploadProgress(long loaded, long total)
		{
			_syncContext.Post(delegate {
				UploadProgress(this, new ProgressEventArgs(loaded, total));
			}, this);
		}


		private void _reset()
		{
			_status = 0;
			_multipart = false;
			_multipartHeader = _multipartFooter = null;
			_statusText = "";
			_options = new Dictionary<string, string>();
			_headers = new Dictionary<string, string>();
			_blob = null;
			_blobName = "";
			_postData = new Dictionary<string, List<string>>();
			_blobFieldName = "Filedata";

			if (_response != null)
			{
				_response.Dispose();
				_response = null;
			}
		}
		

	}
}

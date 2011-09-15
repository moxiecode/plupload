/**
 * FileReference.cs
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

using System;
using System.IO;
using System.Threading;
using System.Windows.Threading;
using System.Net;
using System.Text.RegularExpressions;
using System.Windows.Browser;
using System.Windows.Media.Imaging;
using System.Collections.Generic;
using FluxJpeg.Core.Encoder;
using FluxJpeg.Core;
using Plupload.PngEncoder;

namespace Moxiecode.Plupload {
	enum ImageType {
		Jpeg,
		Png
	}

	/// <summary>
	/// Description of File.
	/// </summary>
	public class FileReference {
		#region private fields
		private string name, uploadUrl, id, targetName, mimeType;
		private FileInfo info;
		private SynchronizationContext syncContext;
		private int chunks, chunkSize;
		private bool multipart, chunking;
		private long size, chunk;
		private string fileDataName;
		private Dictionary<string, object> multipartParams;
		private Dictionary<string, object> headers;
		private Stream fileStream;
		private Stream imageStream;
		#endregion

		/// <summary>Upload complete delegate.</summary>
		public delegate void UploadCompleteHandler(object sender, UploadEventArgs e);

		/// <summary>Upload chunk compleate delegate.</summary>
		public delegate void UploadChunkCompleteHandler(object sender, UploadEventArgs e);

		/// <summary>Upload error delegate.</summary>
		public delegate void ErrorHandler(object sender, ErrorEventArgs e);

		/// <summary>Upload progress delegate.</summary>
		public delegate void ProgressHandler(object sender, ProgressEventArgs e);

		/// <summary>Upload complete event</summary>
		public event UploadCompleteHandler UploadComplete;

		/// <summary>Upload chunk complete event</summary>
		public event UploadChunkCompleteHandler UploadChunkComplete;

		/// <summary>Error event</summary>
		public event ErrorHandler Error;

		/// <summary>Progress event</summary>
		public event ProgressHandler Progress;

		/// <summary>
		///  Main constructor for the file reference.
		/// </summary>
		/// <param name="id">Unique file id for item.</param>
		/// <param name="info">FileInfo that got returned from a file selection.</param>
		public FileReference(string id, FileInfo info) {
			this.id = id;
			this.name = info.Name;
			this.info = info;
            this.size = info.Length;
		}

		/// <summary>Unique id for the file reference.</summary>
		public string Id {
			get { return id; }
		}

		/// <summary>File name to use with upload.</summary>
		public string Name {
			get { return name; }
			set { name = value; }
		}

		/// <summary>File size for the selected file.</summary>
		public long Size {
			get { return this.size; }
		}

		/// <summary>
		///  Uploads the file to the specific url and using the specified chunk_size.
		/// </summary>
		/// <param name="upload_url">URL to upload to.</param>
		/// <param name="chunk_size">Chunk size to use.</param>
        /// <param name="image_width">Image width to scale to.</param>
        /// <param name="image_height">Image height to scale to.</param>
        /// <param name="image_quality">Image quality to store as.</param>
		public void Upload(string upload_url, string json_settings) {
			int chunkSize = 0, imageWidth = 0, imageHeight = 0, imageQuality = 90;

			Dictionary<string, object> settings = (Dictionary<string, object>) Moxiecode.Plupload.Utils.JsonReader.ParseJson(json_settings);
			
			chunkSize = Convert.ToInt32(settings["chunk_size"]);
			imageWidth = Convert.ToInt32(settings["image_width"]);
			imageHeight = Convert.ToInt32(settings["image_height"]);
			imageQuality = Convert.ToInt32(settings["image_quality"]);
			this.fileDataName = (string)settings["file_data_name"];
			this.multipart = Convert.ToBoolean(settings["multipart"]);
			this.multipartParams = (Dictionary<string, object>)settings["multipart_params"];
			this.headers = (Dictionary<string, object>)settings["headers"];
			this.targetName = (string) settings["name"];
            this.mimeType = (string) settings["mime"];

            this.chunk = 0;
			this.chunking = chunkSize > 0;


			this.uploadUrl = upload_url;

            try {
                // Is jpeg and image size is defined
				if (Regex.IsMatch(this.name, @"\.(jpeg|jpg|png)$", RegexOptions.IgnoreCase) && (imageWidth != 0 || imageHeight != 0)) {
					if (Regex.IsMatch(this.name, @"\.png$"))
						this.imageStream = this.ResizeImage(this.info.OpenRead(), imageWidth, imageHeight, imageQuality, ImageType.Png);
					else
						this.imageStream = this.ResizeImage(this.info.OpenRead(), imageWidth, imageHeight, imageQuality, ImageType.Jpeg);

					this.imageStream.Seek(0, SeekOrigin.Begin);
					this.size = this.imageStream.Length;
				}
            } catch (Exception ex) {
                syncContext.Send(delegate {
                    this.OnIOError(new ErrorEventArgs(ex.Message, 0, this.chunks));
                }, this);
            }

			if (this.chunking) {
				this.chunkSize = chunkSize;
				this.chunks = (int) Math.Ceiling((double) this.Size / (double) chunkSize);
			} else {
				this.chunkSize = (int) this.Size;
				this.chunks = 1;
			}
            
            this.UploadNextChunk();
		}

		private int ReadByteRange(byte[] buffer, long position, int offset, int count) {
			int bytes = -1;

			// Read from image memory stream if it's defined
			if (this.imageStream != null) {
				this.imageStream.Seek(position, SeekOrigin.Begin);
				return this.imageStream.Read(buffer, offset, count);
			}

			// Open the file and read the specified part of it
			if (this.fileStream == null) {
				this.fileStream = this.info.OpenRead();
			}

            bytes = this.fileStream.Read(buffer, offset, count);

			return bytes;
		}

		/// <summary>
		///  Uploads the next chunk if there are more in queue.
		/// </summary>
		/// <returns>True/false if there are more chunks to be uploaded.</returns>
		public bool UploadNextChunk() {
			string url = this.uploadUrl;

			// Is there more chunks
			if (this.chunk >= this.chunks)
				return false;

			this.syncContext = SynchronizationContext.Current;

			// Add name, chunk and chunks to query string when we don't use multipart
			if (!this.multipart) {
				if (url.IndexOf('?') == -1) {
					url += '?';
				}

                url += "name=" + Uri.EscapeDataString(this.targetName);
                
				if (this.chunking) {
					url += "&chunk=" + this.chunk;
					url += "&chunks=" + this.chunks;
				}
			}

			HttpWebRequest req = WebRequest.Create(new Uri(HtmlPage.Document.DocumentUri, url)) as HttpWebRequest;
			req.Method = "POST";

			// Add custom headers
			if (this.headers != null) {
				foreach (string key in this.headers.Keys) {
          if (this.headers[key] == null)
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
              req.Accept = (string)this.headers[key];
              break;
            case "content-type":
              req.ContentType = (string)this.headers[key];
              break;
            default:
              req.Headers[key] = (string)this.headers[key];
              break;
          }
				}
			}

			IAsyncResult asyncResult = req.BeginGetRequestStream(new AsyncCallback(RequestStreamCallback), req);

			return true;
		}

		#region protected methods

		protected virtual void OnUploadComplete(UploadEventArgs e) {
			if (fileStream != null) {
				fileStream.Dispose();
				fileStream = null;
			}
			
			if (imageStream != null) {
				imageStream.Dispose();
				imageStream = null;
			}
			
			if (UploadComplete != null)
				UploadComplete(this, e);
		}

		protected virtual void OnUploadChunkComplete(UploadEventArgs e) {
			if (UploadChunkComplete != null)
				UploadChunkComplete(this, e);
		}

		protected virtual void OnIOError(ErrorEventArgs e) {
			if (fileStream != null) {
				fileStream.Dispose();
				fileStream = null;
			}
			
			if (imageStream != null) {
				imageStream.Dispose();
				imageStream = null;
			}
			
			if (Error != null)
				Error(this, e);
		}

		protected virtual void OnProgress(ProgressEventArgs e) {
			if (Progress != null)
				Progress(this, e);
		}

		#endregion

		#region private methods

		private void RequestStreamCallback(IAsyncResult ar) {
			HttpWebRequest request = (HttpWebRequest) ar.AsyncState;
			string boundary = "----pluploadboundary" + DateTime.Now.Ticks, dashdash = "--", crlf = "\r\n";
			Stream requestStream = null;
			byte[] buffer = new byte[1048576], strBuff;
			int bytes;
			long loaded = 0, end = 0;
			int percent, lastPercent = 0;

			try {
				requestStream = request.EndGetRequestStream(ar);

				if (this.multipart) {
					request.ContentType = "multipart/form-data; boundary=" + boundary;

					// Add name to multipart array
					this.multipartParams["name"] = this.targetName;

					// Add chunking when needed
					if (this.chunking) {
						this.multipartParams["chunk"] = this.chunk;
						this.multipartParams["chunks"] = this.chunks;
					}

					// Append mutlipart parameters
					foreach (KeyValuePair<string, object> pair in this.multipartParams) {
						strBuff = this.StrToByteArray(dashdash + boundary + crlf +
							"Content-Disposition: form-data; name=\"" + pair.Key + '"' + crlf + crlf +
							pair.Value + crlf
						);

						requestStream.Write(strBuff, 0, strBuff.Length);
					}

					// Append multipart file header
					strBuff = this.StrToByteArray(
						dashdash + boundary + crlf + 
						"Content-Disposition: form-data; name=\"" + this.fileDataName + "\"; filename=\"" + this.name + '"' +
						crlf + "Content-Type: " + this.mimeType + crlf + crlf
					);

					requestStream.Write(strBuff, 0, strBuff.Length);
				} else {
					request.ContentType = "application/octet-stream";
				}

				// Move to start
				loaded = this.chunk * this.chunkSize;

				// Find end
				end = (this.chunk + 1) * this.chunkSize;
				if (end > this.Size)
					end = this.Size;

				while (loaded < end && (bytes = ReadByteRange(buffer, loaded, 0, (int)(end - loaded < buffer.Length ? end - loaded : buffer.Length))) != 0) {
					loaded += bytes;
					percent = (int) Math.Round((double) loaded / (double) this.Size * 100.0);

					if (percent > lastPercent) {
						syncContext.Post(delegate {
						    if (percent > lastPercent) {
						        this.OnProgress(new ProgressEventArgs(loaded, this.Size));
							    lastPercent = percent;
					        }
						}, this);
					}

					requestStream.Write(buffer, 0, bytes);
					requestStream.Flush();
				}

				// Append multipart file footer
				if (this.multipart) {
					strBuff = this.StrToByteArray(crlf + dashdash + boundary + dashdash + crlf);
					requestStream.Write(strBuff, 0, strBuff.Length);
				}
			} catch (Exception ex) {
				syncContext.Send(delegate {
					this.OnIOError(new ErrorEventArgs(ex.Message, this.chunk, this.chunks));
				}, this);
			} finally {
				try {
					if (requestStream != null) {
						requestStream.Close();
						requestStream.Dispose();
						requestStream = null;
					}
				} catch (Exception ex) {
					syncContext.Send(delegate {
						this.OnIOError(new ErrorEventArgs(ex.Message, this.chunk, this.chunks));
					}, this);
				}
			}

			try {
				request.BeginGetResponse(new AsyncCallback(ResponseCallback), request);
			} catch (Exception ex) {
				syncContext.Send(delegate {
					this.OnIOError(new ErrorEventArgs(ex.Message, this.chunk, this.chunks));
				}, this);
			}
		}

		private void ResponseCallback(IAsyncResult ar) {
			try {
				HttpWebRequest request = ar.AsyncState as HttpWebRequest;

				WebResponse response = request.EndGetResponse(ar);

				syncContext.Post(ExtractResponse, response);
			} catch (Exception ex) {
				syncContext.Send(delegate {
					this.OnIOError(new ErrorEventArgs(ex.Message, this.chunk, this.chunks));
				}, this);
			}
		}

		private void ExtractResponse(object state) {
			HttpWebResponse response = state as HttpWebResponse;
			StreamReader respReader = null;
			Stream respStream = null;
			string content;

			try {
				respStream = response.GetResponseStream();

				if (response.StatusCode == HttpStatusCode.OK) {
					respReader = new StreamReader(respStream);

					if (respStream != null) {
						content = respReader.ReadToEnd();
					} else
						throw new Exception("Error could not open response stream.");
				} else
					throw new Exception("Error server returned status: " + ((int) response.StatusCode) + " " + response.StatusDescription);

				this.chunk++;

				syncContext.Send(delegate {
					this.OnUploadChunkComplete(new UploadEventArgs(content, this.chunk - 1, this.chunks));
				}, this);
			} catch (Exception ex) {
				syncContext.Send(delegate {
					this.OnIOError(new ErrorEventArgs(ex.Message, chunk, chunks));
				}, this);
			} finally {
				if (respStream != null)
					respStream.Close();

				if (respReader != null)
					respReader.Close();

				response.Close();
			}
		}

		private void Debug(string msg) {
			((ScriptObject) HtmlPage.Window.Eval("console")).Invoke("log", new string[] {msg});
		}

        private Stream ResizeImage(Stream image_stream, int width, int height, int quality, ImageType type) {
			try {
				// Load the image as a writeablebitmap
				WriteableBitmap writableBitmap;
				BitmapImage bitmapImage = new BitmapImage();
				bitmapImage.SetSource(image_stream);
				writableBitmap = new WriteableBitmap(bitmapImage);

				double scale = Math.Min((double) width / writableBitmap.PixelWidth, (double) height / writableBitmap.PixelHeight);

				// No resize needed
				if (scale >= 1.0)
					return image_stream;

				// Setup shorter names and pixelbuffers
				int w = writableBitmap.PixelWidth;
				int h = writableBitmap.PixelHeight;
				int[] p = writableBitmap.Pixels;
				byte[][,] imageRaster = new byte[3][,]; // RGB colors
				imageRaster[0] = new byte[w, h];
				imageRaster[1] = new byte[w, h];
				imageRaster[2] = new byte[w, h];

				// Copy WriteableBitmap data into buffer for FluxJpeg
				int i = 0;
				for (int y = 0; y < h; y++) {
					for (int x = 0; x < w; x++) {
						int color = p[i++];

						imageRaster[0][x, y] = (byte) (color >> 16); // R
						imageRaster[1][x, y] = (byte) (color >> 8);  // G
						imageRaster[2][x, y] = (byte) (color);       // B
					}
				}

				// Create new FluxJpeg image based on pixel data
				FluxJpeg.Core.Image jpegImage = new FluxJpeg.Core.Image(new ColorModel {
					colorspace = ColorSpace.RGB
				}, imageRaster);

				// Calc new proportional size
				width = (int) Math.Round(writableBitmap.PixelWidth * scale);
				height = (int) Math.Round(writableBitmap.PixelHeight * scale);

				// Resize the image
				ImageResizer resizer = new ImageResizer(jpegImage);
				Image resizedImage = resizer.Resize(width, height, FluxJpeg.Core.Filtering.ResamplingFilters.LowpassAntiAlias);
				Stream imageStream = new MemoryStream();

				if (type == ImageType.Jpeg) {
					// Encode the resized image as Jpeg
					JpegEncoder jpegEncoder = new JpegEncoder(resizedImage, quality, imageStream);
					jpegEncoder.Encode();
				} else {
					int[] pixelBuffer = new int[resizedImage.Height * resizedImage.Width];
					byte[][,] resizedRaster = resizedImage.Raster;

					// Convert FJCore raster to PixelBuffer
					for (int y = 0; y < resizedImage.Height; y++) {
						for (int x = 0; x < resizedImage.Width; x++) {
							int color = 0;

							color = color | resizedRaster[0][x, y] << 16; // R
							color = color | resizedRaster[1][x, y] << 8;  // G
							color = color | resizedRaster[2][x, y];       // B

							pixelBuffer[(y * resizedImage.Width) + x] = color;
						}
					}

					// Encode the resized image as Png
					PngEncoder pngEncoder = new PngEncoder(pixelBuffer, resizedImage.Width, resizedImage.Height, false, PngEncoder.FILTER_NONE, Deflater.BEST_COMPRESSION);
					byte[] pngBuffer = pngEncoder.pngEncode();
					imageStream.Write(pngBuffer, 0, pngBuffer.Length);
				}

				return imageStream;
			} catch {
				// Ignore the error and let the server resize the image
			}

			return image_stream;
        }

		private byte[] StrToByteArray(string str) {
			System.Text.UTF8Encoding encoding = new System.Text.UTF8Encoding();

			return encoding.GetBytes(str);
		}

		#endregion
	}

	/// <summary>
	///  Upload event arguments class.
	/// </summary>
	public class UploadEventArgs : EventArgs {
		#region private fields
		private string response;
		private long chunk;
		private int chunks;
		#endregion

		/// <summary>
		///  Main constructor for the upload event.
		/// </summary>
		/// <param name="response">Response contents as a string.</param>
		public UploadEventArgs(string response) : this(response, 0, 0) {
		}

		/// <summary>
		///  Main constructor for the upload event.
		/// </summary>
		/// <param name="response">Response contents as a string.</param>
		/// <param name="chunk">Current chunk number.</param>
		/// <param name="chunks">Total chunks.</param>
		public UploadEventArgs(string response, long chunk, int chunks) {
			this.response = response;
			this.chunk = chunk;
			this.chunks = chunks;
		}

		/// <summary>Response from upload request.</summary>
		public string Response {
			get { return response; }
		}

		/// <summary>Chunk number.</summary>
		public long Chunk {
			get { return chunk; }
		}

		/// <summary>Total number of chunks.</summary>
		public int Chunks {
			get { return chunks; }
		}
	}

	/// <summary>
	///  Error event arguments class.
	/// </summary>
	public class ErrorEventArgs : EventArgs {
		#region private fields
		private string message;
		private long chunk;
		private int chunks;
		#endregion

		/// <summary>
		///  Main constructor for the error event.
		/// </summary>
		/// <param name="message">Error message.</param>
		public ErrorEventArgs(string message) : this(message, 0, 0) {
			this.message = message;
		}

		/// <summary>
		///  Main constructor for the error event.
		/// </summary>
		/// <param name="message">Error message.</param>
		/// <param name="chunk">Current chunk number.</param>
		/// <param name="chunks">Total chunks.</param>
		public ErrorEventArgs(string message, long chunk, int chunks) {
			this.message = message;
			this.chunk = chunk;
			this.chunks = chunks;
		}

		/// <summary>Chunk number.</summary>
		public long Chunk {
			get { return chunk; }
		}

		/// <summary>Total number of chunks.</summary>
		public int Chunks {
			get { return chunks; }
		}

		/// <summary>Error message.</summary>
		public string Message {
			get { return message; }
		}
	}

	/// <summary>
	///  Progress event arguments class.
	/// </summary>
	public class ProgressEventArgs : EventArgs {
		#region private fields
		private long loaded, total;
		#endregion

		/// <summary>
		///  Main constructor for the progress events args.
		/// </summary>
		/// <param name="loaded">Number of bytes uploaded.</param>
		/// <param name="total">Total bytes to upload.</param>
		public ProgressEventArgs(long loaded, long total) {
			this.loaded = loaded;
			this.total = total;
		}

		/// <summary>Total bytes to upload.</summary>
		public long Total {
			get { return total; }
		}

		/// <summary>Number of bytes upload so far.</summary>
		public long Loaded {
			get { return loaded; }
		}
	}
}

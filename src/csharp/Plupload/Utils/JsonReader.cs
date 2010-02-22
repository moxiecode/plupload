/*
 * $Id: JSONReader.cs 9 2007-05-27 10:47:07Z spocke $
 *
 * Copyright © 2007, Moxiecode Systems AB, All rights reserved. 
 */

using System;
using System.IO;
using System.Text;
using System.Collections;
using System.Collections.Generic;

namespace Moxiecode.Plupload.Utils {
	class Stack {
		private List<object> items;

		public Stack() {
			items = new List<object>();
		}

		public void Push(object item) {
			items.Add(item);
		}

		public object Pop() {
			object item = items[items.Count - 1];

			items.RemoveAt(items.Count - 1);

			return item;
		}
	}

	/// <summary>
	/// 
	/// </summary>
	public enum JsonLocation {
		/// <summary> </summary>
		InArray,

		/// <summary> </summary>
		InObject,

		/// <summary> </summary>
		Normal
	}

	/// <summary>
	/// 
	/// </summary>
	public enum JsonToken {
		/// <summary> </summary>
		Boolean,

		/// <summary> </summary>
		Integer,

		/// <summary> </summary>
		String,

		/// <summary> </summary>
		Null,

		/// <summary> </summary>
		Float,

		/// <summary> </summary>
		StartArray,

		/// <summary> </summary>
		EndArray,

		/// <summary> </summary>
		PropertyName,

		/// <summary> </summary>
		StartObject,

		/// <summary> </summary>
		EndObject
	}

	/// <summary>
	///  Description of JSONReader.
	/// </summary>
	public class JsonReader {
		private TextReader reader;
		private JsonToken token;
		private object val;
		private JsonLocation location;
		private Stack lastLocations;
		private bool needProp;

		/// <summary>
		/// 
		/// </summary>
		/// <param name="reader"></param>
		public JsonReader(TextReader reader) {
			this.reader = reader;
			this.val = null;
			this.token = JsonToken.Null;
			this.location = JsonLocation.Normal;
			this.lastLocations = new Stack();
			this.needProp = false;
		}

		public static object ParseJson(String json) {
			JsonReader reader = new JsonReader(new StringReader(json));

			return reader.ReadValue();
		}

		/// <summary>
		/// 
		/// </summary>
		public JsonLocation Location {
			get { return location; }
		}

		/// <summary>
		/// 
		/// </summary>
		public JsonToken TokenType {
			get {
				return this.token;
			}
		}

		/// <summary>
		/// 
		/// </summary>
		public object Value {
			get {
				return this.val;
			}
		}

		/// <summary>
		/// 
		/// </summary>
		/// <returns></returns>
		public bool Read() {
			int chr = this.reader.Read();

			if (chr != -1) {
				switch ((char) chr) {
					case '[':
						this.lastLocations.Push(this.location);
						this.location = JsonLocation.InArray;
						this.token = JsonToken.StartArray;
						this.val = null;
						this.ReadAway();
						return true;

					case ']':
						this.location = (JsonLocation)this.lastLocations.Pop();
						this.token = JsonToken.EndArray;
						this.val = null;
						this.ReadAway();

						if (this.location == JsonLocation.InObject)
							this.needProp = true;

						return true;

					case '{':
						this.lastLocations.Push(this.location);
						this.location = JsonLocation.InObject;
						this.needProp = true;
						this.token = JsonToken.StartObject;
						this.val = null;
						this.ReadAway();
						return true;

					case '}':
						this.location = (JsonLocation) this.lastLocations.Pop();
						this.token = JsonToken.EndObject;
						this.val = null;
						this.ReadAway();

						if (this.location == JsonLocation.InObject)
							this.needProp = true;

						return true;

					// String
					case '"':
					case '\'':
						return this.ReadString((char) chr);

					// Null
					case 'n':
						return this.ReadNull();

					// Bool
					case 't':
					case 'f':
						return this.ReadBool((char) chr);

					default:
						// Is number
						if (Char.IsNumber((char) chr) || (char) chr == '-' || (char) chr == '.')
							return this.ReadNumber((char) chr);

						return true;
				}
			}

			return false;
		}

		/// <summary>
		/// 
		/// </summary>
		/// <returns></returns>
		public override string ToString() {
			switch (this.token) {
				case JsonToken.Boolean:
					return "[Boolean] = " + ((bool) this.Value ? "true" : "false");

				case JsonToken.EndArray:
					return "[EndArray]";

				case JsonToken.EndObject:
					return "[EndObject]";

				case JsonToken.Float:
					return "[Float] = " + Convert.ToDouble(this.Value);

				case JsonToken.Integer:
					return "[Integer] = " + ((int) this.Value);

				case JsonToken.Null:
					return "[Null]";

				case JsonToken.StartArray:
					return "[StartArray]";

				case JsonToken.StartObject:
					return "[StartObject]";

				case JsonToken.String:
					return "[String]" + (string) this.Value;

				case JsonToken.PropertyName:
					return "[PropertyName]" + (string) this.Value;
			}

			return base.ToString();
		}
		
		#region private methods

		private bool ReadString(char quote) {
			StringBuilder buff = new StringBuilder();
			this.token = JsonToken.String;
			bool endString = false;
			int chr;

			while ((chr = this.reader.Peek()) != -1) {
				switch (chr) {
					case '\\':
						// Read away slash
						chr = this.reader.Read();

						// Read escape code
						chr = this.reader.Read();
						switch (chr) {
								case 't':
									buff.Append('\t');
									break;

								case 'b':
									buff.Append('\b');
									break;

								case 'f':
									buff.Append('\f');
									break;

								case 'r':
									buff.Append('\r');
									break;

								case 'n':
									buff.Append('\n');
									break;

								case 'u':
									buff.Append((char) Convert.ToInt32(ReadLen(4), 16));
									break;

								default:
									buff.Append((char) chr);
									break;
						}

						break;

						case '\'':
						case '"':
							if (chr == quote)
								endString = true;

							chr = this.reader.Read();
							if (chr != -1 && chr != quote)
								buff.Append((char) chr);

							break;

						default:
							buff.Append((char) this.reader.Read());
							break;
				}

				// String terminated
				if (endString)
					break;
			}

			this.ReadAway();

			this.val = buff.ToString();

			// Needed a property
			if (this.needProp) {
				this.token = JsonToken.PropertyName;
				this.needProp = false;
				return true;
			}

			if (this.location == JsonLocation.InObject && !this.needProp)
				this.needProp = true;

			return true;
		}

		private bool ReadNull() {
			this.token = JsonToken.Null;
			this.val = null;

			this.ReadAway(3); // ull
			this.ReadAway();

			if (this.location == JsonLocation.InObject && !this.needProp)
				this.needProp = true;

			return true;
		}

		private bool ReadNumber(char start) {
			StringBuilder buff = new StringBuilder();
			int chr;
			bool isFloat = false;

			this.token = JsonToken.Integer;
			buff.Append(start);

			while ((chr = this.reader.Peek()) != -1) {
				if (Char.IsNumber((char) chr) || (char) chr == '-' || (char) chr == '.') {
					if (((char) chr) == '.')
						isFloat = true;

					buff.Append((char) this.reader.Read());
				} else
					break;
			}

			this.ReadAway();

			if (isFloat) {
				this.token = JsonToken.Float;
				this.val = Convert.ToDouble(buff.ToString().Replace('.', ','));
			} else
				this.val = Convert.ToInt32(buff.ToString());

			if (this.location == JsonLocation.InObject && !this.needProp)
				this.needProp = true;

			return true;
		}

		private bool ReadBool(char chr) {
			this.token = JsonToken.Boolean;
			this.val = chr == 't';

			if (chr == 't')
				this.ReadAway(3); // rue
			else
				this.ReadAway(4); // alse

			this.ReadAway();

			if (this.location == JsonLocation.InObject && !this.needProp)
				this.needProp = true;

			return true;
		}

		private void ReadAway() {
			int chr;
			
			while ((chr = this.reader.Peek()) != -1) {
				if (chr != ':' && chr != ',' && !Char.IsWhiteSpace((char) chr))
					break;

				this.reader.Read();
			}
		}

		private string ReadLen(int num) {
			StringBuilder buff = new StringBuilder();
			int chr;

			for (int i=0; i<num && (chr = this.reader.Read()) != -1; i++)
				buff.Append((char) chr);

			return buff.ToString();
		}
		
		private void ReadAway(int num) {
			for (int i=0; i<num && this.reader.Read() != -1; i++) ;
		}

		private object ReadValue() {
			Stack parents = new Stack();
			object cur = null;
			string key = null;
			object obj;

			while (this.Read()) {
				switch (this.TokenType) {
					case JsonToken.Boolean:
					case JsonToken.Integer:
					case JsonToken.String:
					case JsonToken.Float:
					case JsonToken.Null:
						if (cur is Dictionary<string, object>) {
							((Dictionary<string, object>)cur)[key] = this.Value;
						} else if (cur is List<object>)
							((List<object>) cur).Add(this.Value);
						else
							return this.Value;

						break;

					case JsonToken.PropertyName:
						key = (string) this.Value;
						break;

					case JsonToken.StartArray:
					case JsonToken.StartObject:
						if (this.TokenType == JsonToken.StartObject) {
							obj = new Dictionary<string, object>();
						} else {
							obj = new List<object>();
						}

						if (cur is Dictionary<string, object>) {
							((Dictionary<string, object>)cur)[key] = obj;
						} else if (cur is List<object>) {
							((List<object>)cur).Add(obj);
						}

						parents.Push(cur);
						cur = obj;

						break;

					case JsonToken.EndArray:
					case JsonToken.EndObject:
						obj = parents.Pop();

						if (obj != null)
							cur = obj;

						break;
				}
			}

			return cur;
		}

		#endregion
	}
}

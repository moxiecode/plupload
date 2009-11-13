// Namespaces
plupload = {}

// Classes
plupload.FlashRuntime = function() {
	/// <summary>FlashRuntime implementation.</summary>
}

plupload.FlashRuntime.isSupported = function() {
	/// <summary>Checks if the Flash is installed or not.</summary>
	/// <returns type="boolean">true/false if the runtime exists.</returns>
}

plupload.FlashRuntime.init = function(uploader) {
	/// <summary>Initializes the upload runtime.</summary>
	/// <param name="uploader" type="plupload.Uploader">Uploader instance that needs to be initialized.</param>
}

plupload.GearsRuntime = function() {
	/// <summary>Gears implementation.</summary>
}

plupload.GearsRuntime.isSupported = function() {
	/// <summary>Checks if the Google Gears is installed or not.</summary>
	/// <returns type="boolean">true/false if the runtime exists.</returns>
}

plupload.GearsRuntime.init = function(uploader) {
	/// <summary>Initializes the upload runtime.</summary>
	/// <param name="uploader" type="plupload.Uploader">Uploader instance that needs to be initialized.</param>
}

plupload.Html5Runtime = function() {
	/// <summary>HMTL5 implementation.</summary>
}

plupload.Html5Runtime.isSupported = function() {
	/// <summary>Checks if the browser has HTML 5 upload support or not.</summary>
	/// <returns type="boolean">true/false if the runtime exists.</returns>
}

plupload.Html5Runtime.init = function(uploader) {
	/// <summary>Initializes the upload runtime.</summary>
	/// <param name="uploader" type="plupload.Uploader">Uploader instance that needs to be initialized.</param>
}

plupload.Uploader = function() {
	/// <summary>Uploader class, an instance of this class will be created for each upload field.</summary>
	/// <field name="files" type="Array">Array of File instances.</field>
	/// <field name="settings" type="Object">Object with name/value settings.</field>
	/// <field name="total" type="plupload.QueueProgress">Total progess information.</field>
	/// <field name="id" type="String">Unique id for the Uploader instance.</field>
}

plupload.Uploader.prototype.init = function() {
	/// <summary>Initializes the Uploader instance and adds internal event listeners.</summary>
}

plupload.Uploader.prototype.browse = function(browse_settings) {
	/// <summary>Browse for files to upload.</summary>
	/// <param name="browse_settings" type="Object">name/value collection of settings.</param>
}

plupload.Uploader.prototype.start = function() {
	/// <summary>Starts uploading the queued files.</summary>
}

plupload.Uploader.prototype.stop = function() {
	/// <summary>Stops the upload of the queued files.</summary>
}

plupload.Uploader.prototype.getFile = function(id) {
	/// <summary>Returns the specified file object by id.</summary>
	/// <param name="id" type="String">File id to look for.</param>
	/// <returns type="plupload.File">File object or undefined if it wasn't found;</returns>
}

plupload.Uploader.prototype.removeFile = function(file) {
	/// <summary>Removes a specific file.</summary>
	/// <param name="file" type="plupload.File">File to remove from queue.</param>
}

plupload.Uploader.prototype.removeAll = function() {
	/// <summary>Clears the upload queue.</summary>
}

plupload.Uploader.prototype.trigger = function(name, Multiple) {
	/// <summary>Dispatches the specified event name and it's arguments to all listeners.</summary>
	/// <param name="name" type="String">Event name to fire.</param>
	/// <param name="Multiple" type="Object..">arguments to pass along to the listener functions.</param>
}

plupload.Uploader.prototype.bind = function(name, func, scope) {
	/// <summary>Adds an event listener by name.</summary>
	/// <param name="name" type="String">Event name to listen for.</param>
	/// <param name="func" type="function">Function to call ones the event gets fired.</param>
	/// <param name="scope" type="Object">Optional scope to execute the specified function in.</param>
}

plupload.Uploader.prototype.unbind = function(name, func) {
	/// <summary>Removes the specified event listener.</summary>
	/// <param name="name" type="String">Name of event to remove.</param>
	/// <param name="func" type="function">Function to remove from listener.</param>
}

plupload.File = function() {
	/// <summary>File instance.</summary>
	/// <field name="id" type="String">File id this is a globally unique id for the specific file.</field>
	/// <field name="name" type="String">File name for example "myfile.gif".</field>
	/// <field name="size" type="Number">File size in bytes.</field>
	/// <field name="loaded" type="Number">Number of bytes uploaded of the files total size.</field>
	/// <field name="percent" type="Number">Number of percentage uploaded of the file.</field>
	/// <field name="status" type="Number">Status constant matching the plupload states QUEUED, UPLOADING, FAILED, DONE.</field>
}

plupload.Runtime = function() {
	/// <summary>Runtime class gets implemented by each upload runtime.</summary>
}

plupload.Runtime.isSupported = function() {
	/// <summary>Checks if the runtime is supported by the browser or not.</summary>
	/// <returns type="boolean">true/false if the runtime exists.</returns>
}

plupload.Runtime.init = function(uploader) {
	/// <summary>Initializes the upload runtime.</summary>
	/// <param name="uploader" type="plupload.Uploader">Uploader instance that needs to be initialized.</param>
}

plupload.QueueProgress = function() {
	/// <summary>Runtime class gets implemented by each upload runtime.</summary>
	/// <field name="size" type="Number">Total queue file size.</field>
	/// <field name="loaded" type="Number">Total bytes uploaded.</field>
	/// <field name="uploaded" type="Number">Number of files uploaded.</field>
	/// <field name="failed" type="Number">Number of files failed to upload.</field>
	/// <field name="queued" type="Number">Number of files yet to be uploaded.</field>
	/// <field name="percent" type="Number">Total percent of the uploaded bytes.</field>
}

plupload.QueueProgress.prototype.reset = function() {
	/// <summary>Resets the progress to it's initial values.</summary>
}

plupload.SilverlightRuntime = function() {
	/// <summary>Silverlight implementation.</summary>
}

plupload.SilverlightRuntime.isSupported = function() {
	/// <summary>Checks if Silverlight is installed or not.</summary>
	/// <returns type="boolean">true/false if the runtime exists.</returns>
}

plupload.SilverlightRuntime.init = function(uploader) {
	/// <summary>Initializes the upload runtime.</summary>
	/// <param name="uploader" type="plupload.Uploader">Uploader instance that needs to be initialized.</param>
}

// Namespaces
plupload.STOPPED = new Object();
plupload.STARTED = new Object();
plupload.QUEUED = new Object();
plupload.UPLOADING = new Object();
plupload.FAILED = new Object();
plupload.DONE = new Object();
plupload.extend = function(target, obj) {
	/// <summary>Extends the specified object with another object.</summary>
	/// <param name="target" type="Object">Object to extend.</param>
	/// <param name="obj" type="Object..">Multiple objects to extend with.</param>
	/// <returns type="Object">Same as target, the extended object.</returns>
}

plupload.cleanName = function(s) {
	/// <summary>Cleans the specified name from national characters.</summary>
	/// <param name="s" type="String">String to clean up.</param>
	/// <returns type="String">Cleaned string.</returns>
}

plupload.addRuntime = function(name, obj) {
	/// <summary>Adds a specific upload runtime like for example flash or gears.</summary>
	/// <param name="name" type="String">Runtime name for example flash.</param>
	/// <param name="obj" type="Object">Object containing init/destroy method.</param>
}

plupload.guid = function() {
	/// <summary>Generates an unique ID.</summary>
	/// <returns type="String">Virtually unique id.</returns>
}

plupload.formatSize = function(size) {
	/// <summary>Formats the specified number as a size string for example 1024 becomes 1 KB.</summary>
	/// <param name="size" type="Number" integer="true">Size to format as string.</param>
	/// <returns type="String">Formatted size string.</returns>
}

plupload.getPos = function(node, root) {
	/// <summary>Returns the absolute x, y position of a node.</summary>
	/// <param name="node" type="">HTML element or element id to get x, y position from.</param>
	/// <param name="root" type="Element" domElement="true">Optional root element to stop calculations at.</param>
	/// <returns type="object">Absolute position of the specified element object with x, y fields.</returns>
}

plupload.parseSize = function(size) {
	/// <summary>Parses the specified size string into a byte value.</summary>
	/// <param name="size" type="">String to parse or number to just pass through.</param>
	/// <returns type="Number" integer="true">Size in bytes.</returns>
}

plupload.xmlEncode = function(s) {
	/// <summary>Encodes the specified string.</summary>
	/// <param name="s" type="String">String to encode.</param>
	/// <returns type="String">Encoded string.</returns>
}

plupload.toArray = function(obj) {
	/// <summary>Forces anything into an array.</summary>
	/// <param name="obj" type="Object">Object with length field.</param>
	/// <returns type="Array">Array object containing all items.</returns>
}


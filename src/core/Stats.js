
/**
@class plupload/core/Stats
@constructor
@private
*/
define('plupload/core/Stats', [], function() {

	 return function() {
		var self = this;

		/**
		 * Total queue file size.
		 *
		 * @property size
		 * @deprecated use total
		 * @type Number
		 */
		self.size = 0;	

		/**
		 * Total size of the queue in units.
		 *
		 * @property total
		 * @since 3.0
		 * @type Number
		 */
		self.total = 0;

		/**
		 * Total bytes uploaded.
		 *
		 * @property loaded
		 * @type Number
		 */
		self.loaded = 0;


		/**
		 * Number of files uploaded successfully.
		 *
		 * @property uploaded
		 * @deprecated use done
		 * @type Number
		 */
		self.uploaded = 0;

		/**
		 * Number of items processed successfully.
		 *
		 * @property done
		 * @since 3.0
		 * @type Number
		 */
		self.done = 0;

		/**
		 * Number of failed items.
		 *
		 * @property failed
		 * @type Number
		 */
		self.failed = 0;

		/**
		 * Number of items yet to be processed.
		 *
		 * @property queued
		 * @type Number
		 */
		self.queued = 0;

		/**
		 * Percent of processed units.
		 *
		 * @property percent
		 * @type Number
		 */
		self.percent = 0;

		/**
		 * Bytes processed per second.
		 *
		 * @property bytesPerSec
		 * @deprecated use processedPerSec
		 * @type Number
		 */
		self.bytesPerSec = 0;

		/**
		 * Units processed per second.
		 *
		 * @property processedPerSec
		 * @since 3.0
		 * @type Number
		 */
		self.processedPerSec = 0;

		/**
		 * Resets the progress to its initial values.
		 *
		 * @method reset
		 */
		self.reset = function() {
			self.size             = // deprecated
			self.total            = 
			self.loaded           = // deprecated
			self.processed        =
			self.uploaded         = // deprecated
			self.done             =
			self.failed           = 
			self.queued           = 
			self.percent          =
			self.bytesPerSec      = // deprecated
			self.processedPerSec  = 0;
		};
	};
});
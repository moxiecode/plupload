/*
 * Lazy Load - jQuery plugin for lazy loading images
 *
 * Copyright (c) 2007-2013 Mika Tuupola
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.appelsiini.net/projects/lazy_preload
 *
 * Version:  1.8.4
 *
 */
/*
 * modified by michael@snaphappi.com for use with pluploader jquery UI widget
 * 	requires: https://github.com/cowboy/jquery-throttle-debounce
 */
(function($, window, document, undefined) {
    var $window = $(window);
    
    function Throttle(delay){
		this.delay = delay || 250;
		/*
		 * add callback to queue and start queue if necessary
		 */
		this.queue = function(fn){
			this._queue.push(fn);
			if (!this._isRunning) {
				this._isRunning = true;
				this._next();
			}
		}
		this.clear_queue = function(){
			this._queue = [];
		}
		// private
		this._queue = [];
		this._isRunning = false;
		this._next = function(){
			var self = this;
			if (!this.queue.length) {
				this._isRunning = false;
				return;
			}
			if (!this._isRunning) {
				try { // start and run now;
					this._isRunning = true;
					( this._queue.shift() )();
				} catch (ex){}
				self._next();
			} else {
				setTimeout(function(){
					try {
						( self._queue.shift() )();
					} catch (ex){}
					self._next();
				}, this.delay);				
			}
		}
    }

    $.fn.lazy_preload = function(options) {
        var elements = this;
        var $container;
        var settings = {
            threshold       : 0,
            failure_limit   : 0,
            event           : "scroll",
            effect          : "show",
            container       : window,
            data_attribute  : "original",	// unused
            skip_invisible  : true,
            appear          : null,
            load            : null,
            queue			: {},		// queue of plupload.Uploader file objects by file.id
        };
        
		var throttle = new Throttle(500);
		 
        function update() {
            var counter = 0;
      		
            elements.each(function() {
                var $this = $(this);
                if (settings.skip_invisible && !$this.is(":visible")) {
                    return;
                }
                if ($.abovethetop(this, settings) ||
                    $.leftofbegin(this, settings)) {
                        /* Nothing. */
                } else if (!$.belowthefold(this, settings) &&
                    !$.rightoffold(this, settings)) {
                        $this.trigger("appear");
                        /* if we found an image we'll load, reset the counter */
                        counter = 0;
                } else {
                    if (++counter > settings.failure_limit) {
                        return false;
                    }
                }
            });

        }

        if(options) {
            /* Maintain BC for a couple of versions. */
            if (undefined !== options.failurelimit) {
                options.failure_limit = options.failurelimit; 
                delete options.failurelimit;
            }
            if (undefined !== options.effectspeed) {
                options.effect_speed = options.effectspeed; 
                delete options.effectspeed;
            }

            $.extend(settings, options);
        }

        /* Cache container as jQuery as object. */
        $container = (settings.container === undefined ||
                      settings.container === window) ? $window : $(settings.container);

        /* Fire one scroll event per scroll. Not one scroll event per image. */
        if (0 === settings.event.indexOf("scroll")) {
        	// fire one scroll event at the end of the scroll
            $container.bind(settings.event, $.debounce(250, function(event) {
            	throttle.clear_queue();
		        return update();
            }));
        }
        
        this.each(function() {
            var self = this;
            var $self = $(self);

            self.loaded = false;

            /* 
             * appear => preload
             * When 'preload' is triggered preload the object in settings.queue 
             * TODO: move to settings.appear
             */
            $self.on("appear", function() {
                if (!this.loaded) {
                    if (settings.appear) {
                        var elements_left = elements.length;
                        settings.appear.call(self, elements_left, settings);
                    }
                    // instead of manipulating IMG.src to load, we are using the moxie img.onload() callbacks  
                    // instead of calling o.inSeries(queue), 
                    // get the queued cb using file.id lookup from settings.queue and run the callback
                    var id = $self.closest('.plupload_file').attr('id'),
                    	cb = settings.queue[id];
                    if ($.isFunction(cb)) {
                    	throttle.queue(function(){
                    		cb();
                    		$self.get(0).loaded = true;
                    		$self.unbind("appear");
                    	});
                    } else {
                    	// throw new Exception("lazyload callback error, id=#"+id);
                    	console.error("lazyload callback error, id=#"+id);
                    }
                }
            });

            /* When wanted event is triggered load original image */
            /* by triggering appear.                              */
            if (0 !== settings.event.indexOf("scroll")) {
                $self.bind(settings.event, function(event) {
                    if (!self.loaded) {
                        $self.trigger("appear");
                    }
                });
            }
        });

        /* Check if something appears when window is resized. */
        $window.bind("resize", function(event) {
            update();
        });
              
        /* With IOS5 force loading images when navigating with back button. */
        /* Non optimal workaround. */
        if ((/iphone|ipod|ipad.*os 5/gi).test(navigator.appVersion)) {
            $window.bind("pageshow", function(event) {
                if (event.originalEvent.persisted) {
                    elements.each(function() {
                        $(this).trigger("appear");
                    });
                }
            });
        }

        /* Force initial check if images should appear. */
        $(window).load(function() {
            update();
        });
        
        return this;
    };

    /* Convenience methods in jQuery namespace.           */
    /* Use as  $.belowthefold(element, {threshold : 100, container : window}) */

    $.belowthefold = function(element, settings) {
        var fold;
        
        if (settings.container === undefined || settings.container === window) {
            fold = $window.height() + $window.scrollTop();
        } else {
            fold = $(settings.container).offset().top + $(settings.container).height();
        }

        return fold <= $(element).offset().top - settings.threshold;
    };
    
    $.rightoffold = function(element, settings) {
        var fold;

        if (settings.container === undefined || settings.container === window) {
            fold = $window.width() + $window.scrollLeft();
        } else {
            fold = $(settings.container).offset().left + $(settings.container).width();
        }

        return fold <= $(element).offset().left - settings.threshold;
    };
        
    $.abovethetop = function(element, settings) {
        var fold;
        
        if (settings.container === undefined || settings.container === window) {
            fold = $window.scrollTop();
        } else {
            fold = $(settings.container).offset().top;
        }

        return fold >= $(element).offset().top + settings.threshold  + $(element).height();
    };
    
    $.leftofbegin = function(element, settings) {
        var fold;
        
        if (settings.container === undefined || settings.container === window) {
            fold = $window.scrollLeft();
        } else {
            fold = $(settings.container).offset().left;
        }

        return fold >= $(element).offset().left + settings.threshold + $(element).width();
    };

    $.inviewport = function(element, settings) {
         return !$.rightoffold(element, settings) && !$.leftofbegin(element, settings) &&
                !$.belowthefold(element, settings) && !$.abovethetop(element, settings);
     };

    /* Custom selectors for your convenience.   */
    /* Use as $("img:below-the-fold").something() or */
    /* $("img").filter(":below-the-fold").something() which is faster */

    $.extend($.expr[':'], {
        "below-the-fold" : function(a) { return $.belowthefold(a, {threshold : 0}); },
        "above-the-top"  : function(a) { return !$.belowthefold(a, {threshold : 0}); },
        "right-of-screen": function(a) { return $.rightoffold(a, {threshold : 0}); },
        "left-of-screen" : function(a) { return !$.rightoffold(a, {threshold : 0}); },
        "in-viewport"    : function(a) { return $.inviewport(a, {threshold : 0}); },
        /* Maintain BC for couple of versions. */
        "above-the-fold" : function(a) { return !$.belowthefold(a, {threshold : 0}); },
        "right-of-fold"  : function(a) { return $.rightoffold(a, {threshold : 0}); },
        "left-of-fold"   : function(a) { return !$.rightoffold(a, {threshold : 0}); }
    });

})(jQuery, window, document);
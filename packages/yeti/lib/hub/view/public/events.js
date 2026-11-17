/*global window */
var SimpleEvents = (function () {

    "use strict";

    var proto,
        FN_EMPTY = function () {};

    if ("object" !== typeof exports && !window.console) {
        window.console = {
            log: FN_EMPTY,
            error: FN_EMPTY
        };
    }

    function SimpleEvents(socket, debug) {
        var self = this;

        self.connected = false;

        if (debug) {
            if ("function" === typeof debug) {
                self.debug = debug;
            } else {
                self.debug = function (message) {
                    console.log(message);
                };
            }
        } else {
            self.debug = FN_EMPTY;
        }

        function onIncoming(message) {
            var data;

            switch (typeof message) {
            case "object":
                data = message.data;
                break;
            case "string":
                data = message;
                break;
            default:
                self.error("Unexpected message type " + message);
                return;
            }

            self.debug("onIncoming data: " + data);
            try {
                data = JSON.parse(data);
            } catch (ex) {
                self.error("Failed to parse " + data);
                return;
            }

            if (data.event) {
                self.debug("onIncoming event: " + data.event, ", queueUntil: " + self.queueUntilEvent);
                if (data.event === self.queueUntilEvent) {
                    self.queueUntilEvent = null;
                    self.flushQueue();
                }
                self.invokeRPC(data.event, data.args);
            } else {
                self.error("Ignoring bad data " + data);
            }
        }

        function onClose(cxn) {
            self.connected = false;
            if (self.socket.removeListener) {
                // Server-side connection.
                self.debug("onClose: removing data listener");
                self.socket.removeListener("data", onIncoming);
            }
            self.invokeRPC("close");
        }

        function onConnection(cxn) {
            self.connected = true;
            self.invokeRPC("open");
        }

        self.socket = socket;
        self.listeners = {};
        self.messageQueue = [];

        if ("function" === typeof self.socket.send) {
            // Client-side connection.
            self.socket.onclose = onClose;
            self.socket.onopen = onConnection;
            self.socket.onmessage = onIncoming;
            self.write = function (message) {
                self.socket.send.call(self.socket, message);
            };
        } else if ("function" === typeof self.socket.on) {
            // Already connected, the socket is the unique connection EE.
            // self.socket.on("connection", onConnection);
            self.write = self.socket.write.bind(self.socket);
            self.socket.on("end", function () {
                onClose();
            });
            self.socket.on("data", onIncoming);
        } else {
            self.error("SimpleEvents: Unable to attach events.");

        }
    }

    proto = SimpleEvents.prototype;

    proto.error = function (message) {
        if (console && console.error) {
            console.error(message);
        }
    };

    proto.on = function (event, fn) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(fn);
    };

    proto.removeListener = function (event, fn) {
        var match = false,
            self = this;

        if (!self.listeners[event]) {
            return false;
        }

        self.listeners[event].forEach(function (listener, index) {
            if (listener === fn) {
                match = true;
                self.listeners[event].splice(index, 1);
            }
        });

        return match;
    };

    proto.emit = function (event, args) {
        if (this.queueUntilEvent) {
            this.debug("emit: queueing " + event + " for transport later");
            this.messageQueue.push([event, args]);
            return;
        }
        this.emitNow(event, args);
    };

    proto.emitIfConnected = function (event, args) {
        if (!this.connected) {
            this.debug("emitIfConnected: dropping " + event + " because we are disconnected");
            return;
        }
        this.emitNow(event, args);
    };

    proto.emitNow = function (event, args) {
        var packet = {
            event: event,
            args: args
        };

        try {
            packet = JSON.stringify(packet);
        } catch (ex) {
            this.error("Unable to convert to JSON " + packet);
            return;
        }
        this.debug("emitNow: " + event + ", payload: " + packet);
        this.write(packet);
    };

    proto.invokeRPC = function (event, args) {
        var self = this,
            i = 0,
            cb,
            events,
            length;

        self.debug("invokeRPC: " + event);

        if (event in self.listeners) {
            events = self.listeners[event];
            length = events.length;
            for (; i < length; i += 1) {
                cb = events[i];
                if ("function" !== typeof cb) {
                    throw new Error("bad listener for ev " + event);
                }
                self.debug("invoking listener: " + (cb.name || "{anonymous}"));
                cb.call(self, args);
            }
        } else {
            self.debug("Warning: NO HANDLERS for event " + event);
        }
    };

    proto.queueUntil = function (event) {
        this.debug("queueUntil: " + event);
        this.queueUntilEvent = event;
    };

    proto.flushQueue = function () {
        this.debug("flushQueue");
        var i,
            message,
            self = this,
            length = self.messageQueue.length;
        if (length) {
            for (i = 0; i < length; i += 1) {
                message = self.messageQueue[i];
                self.debug("sending queued message " + message[0], message[1]);
                self.emit(message[0], message[1]);
            }
        }
    };

    return SimpleEvents;

}());

if ("object" === typeof exports && exports) {
    exports.SimpleEvents = SimpleEvents;
}

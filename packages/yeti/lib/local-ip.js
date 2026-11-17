"use strict";

var os = require("os");

module.exports = (function () {
    var cachedIP;

    function queryLocalIP() {
        var name,
            localIP,
            addresses,
            interfaces = os.networkInterfaces(),
            interfaceNames = Object.keys(interfaces);

        function internalOnly(address) {
            return !address.internal;
        }

        function tryAddresses(address) {
            // Prefer IPv4 addresses.
            if (!localIP || address.family === "IPv4") {
                localIP = address.address;
            }
        }

        do {
            name = interfaceNames.pop();

            // Skip Back to My Mac or VPNs.
            if (name.indexOf("utun") === 0) {
                continue;
            }

            interfaces[name]
                .filter(internalOnly)
                .forEach(tryAddresses);
        } while (interfaceNames.length && !localIP);

        if (!localIP) {
            localIP = "localhost";
        }

        return localIP;
    }

    return function getLocalIP() {
        if (!cachedIP) {
            cachedIP = queryLocalIP();
        }
        return cachedIP;
    };
}());

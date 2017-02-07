;(function(exports) {

    function random(min, max) {
        return Math.round(Math.random() * (max - min) + min);
    }

    function parseHeaders(str) {
        var obj = {}, parts;
        var headers = str.split(/\r\n/);

        for (var i = 0; i < headers.length; i++) {
            parts = headers[i].match(/^([^:]+):(.*)$/);
            if (parts) {
                obj[parts[1].toLowerCase()] = parts[2].toLowerCase();
            }
        }
        return obj;
    }

    exports.Utils = {
        random: random,
        parseHeaders: parseHeaders
    };
}(this));
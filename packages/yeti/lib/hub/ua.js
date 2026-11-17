"use strict";

// YUI 3 User-Agent formatter.
module.exports = function (ua) {
    var os, m, version, name, browser = ua;
    if ((/windows|win32/i).test(ua)) {
        os = 'Windows';
        m = ua.match(/Windows NT ([^\s]*)(;|\))/);
        if (m && m[1]) {
            switch (m[1]) {
            case '5.0':
                os += ' 2000';
                break;
            case '5.1':
                os += ' XP';
                break;
            case '5.2':
                os += ' XP 64';
                break;
            case '6.0':
                os += ' Vista';
                break;
            case '6.1':
                os += ' 7';
                break;
            case '6.2':
                os += ' 8';
                break;
            }
            if (/Tablet PC/.test(ua)) {
                os += ' Tablet PC';
            }
        }
    } else if ((/macintosh/i).test(ua)) {
        os = 'Mac OS';
    } else if ((/CrOS/i).test(ua)) {
        os = 'ChromeOS';
    } else if ((/X11/i).test(ua) || (/Linux/i).test(ua)) {
        os = 'Linux';
    } else if (/iPad|iPod|iPhone/.test(ua)) {
        m = ua.match(/OS ([^\s]*)/);
        if (m && m[1]) {
            os = 'iOS ' + m[1].replace(/_/g, '.');
        }
    } else if (/webOS/.test(ua)) {
        m = ua.match(/webOS\/([^\s]*);/);
        if (m && m[1]) {
            os = 'Palm WebOS ' + m[1];
        }
    } else if (/hpwOS/.test(ua)) {
        m = ua.match(/hpwOS\/([^\s]*);/);
        if (m && m[1]) {
            os = 'HP WebOS ' + m[1];
        }
    } else if (/Android/.test(ua)) {
        m = ua.match(/Android ([^\s]*);/);
        if (m && m[1]) {
            os = 'Android ' + m[1];
        } else {
            os = 'Android (unknown)';
        }
    }

    m = ua.match(/AppleWebKit\/([^\s]*)/);
    if (m && m[1]) {
        m = ua.match(/Version\/([^\s]*)/);
        if (m && m[1]) {
            version = m[1];
            name = 'Safari';
        }
        if (/PhantomJS/.test(ua)) {
            m = ua.match(/PhantomJS\/([^\s]*)/);
            if (m && m[1]) {
                version = m[1];
                name = 'PhantomJS';
            }
        }

        if (/webOS/.test(ua)) {
            //Palm webOS hacked UA
            m = ua.match(/Safari\/([^\s]*)/);
            if (m && m[1]) {
                version = m[1];
                name = 'Safari';
            }
        }
        if (/hpwOS/.test(ua)) {
            //Palm webOS hacked UA
            m = ua.match(/Safari\/([^\s]*)/);
            if (m && m[1]) {
                version = m[1];
                name = 'Safari';
            }
        }

        m = ua.match(/(Chrome|CrMo|CriOS)\/([^\s]*)/);
        if (m && m[1] && m[2]) {
            version  = m[2]; // Chrome
            name = 'Chrome';
        }
    }
    m = ua.match(/Opera[\s\/]([^\s]*)/);
    if (m && m[1]) {
        version = m[1];
        name = 'Opera';
        m = ua.match(/Version\/([^\s]*)/);
        if (m && m[1]) {
            version = m[1];
        }
    } else {
        m = ua.match(/MSIE\s([^;]*)/);
        if (m && m[1]) {
            version = m[1];
            name = 'Internet Explorer';
        } else { // not opera, webkit, or ie
            m = ua.match(/Gecko\//);
            if (m) {
                m = ua.match(/Firefox\/([^\s\)]*)/);
                if (m && m[1]) {
                    version = m[1];
                    name = 'Firefox';
                }
            }
        }
    }

    if (name && version && os) {
        browser = name + ' (' + version + ') / ' + os;
    }

    return browser;
};

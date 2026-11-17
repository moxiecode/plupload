"use strict";

function color(code, string) {
    return "\u001b[" + code + "m" + string + "\u001b[0m";
}

function factory(code) {
    return function (string) {
        return color(code, string);
    };
}

exports.codes = {
    bold: factory(1),
    red: factory(31),
    green: factory(32),
    blue: factory(34)
};

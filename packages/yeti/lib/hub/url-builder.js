"use strict";

module.exports = function makeURLFromComponents(mountpoint, agentId, batchId, test) {
    var url = mountpoint;

    if (url !== "/") {
        // XXX So hacky.
        url += "/";
    }

    url += "agent/" + agentId;

    if (test && batchId) {
        // XXX if test is true,
        // batchId should always be set
        url += "/batch/" + batchId;
        url += "/test/" + test;
    }

    return url;
};

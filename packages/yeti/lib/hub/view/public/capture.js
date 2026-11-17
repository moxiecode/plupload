/*jshint browser:true */
/*global YUI */
(function () {
    "use strict";

    function capture(resource) {
        YUI({
            delayUntil: "domready"
        }).use("tempest", function bootInjectedDriver(Y) {
            var driver = new Y.InjectedDriver({
                captureOnly: true,
                resource: resource
            });

            driver.connectWithHandshake();
        });
    }

    window.Yeti = {
        capture: capture
    };
}());

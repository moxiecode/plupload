"use strict";

var PHANTOMJS_MIN_VERSION = "1.5.0";

var vows = require("vows");
var assert = require("assert");

var path = require("path");
var fs = require("graceful-fs");
var http = require("http");

var child_process = require("child_process");
var semver = require("semver");

var Hub = require("../../lib/hub");

var hub = require("../lib/hub");

if (process.env.TRAVIS) {
    // Debug test errors that only occur on Travis CI.
    var _exit = process.exit;
    process.exit = function (code) {
        var e = new Error();
        console.warn("TRAVIS: process.exit was called! Code:", code, "Stack:", e.stack);
        return _exit(code);
    };
}

// PhantomJS version check
child_process.exec("phantomjs -v", function (err, stdout) {
    var message;
    if (err) {
        message = "Failed to start PhantomJS > {version}, error given: " + err;
    } else if (!semver.satisfies(stdout, ">=" + PHANTOMJS_MIN_VERSION)) {
        message = "Tests require PhantomJS {version} or newer. " +
            "Please upgrade PhantomJS by visiting phantomjs.org";
    }
    if (message) {
        throw new Error(message.replace(/\{version\}/, PHANTOMJS_MIN_VERSION));
    }
});

function didNotThrow(topic) {
    if (topic instanceof Error) {
        assert.fail(topic, {}, "Topic error: " + topic.stack);
    }
}

function getPathname() {
    /*global window:true */
    // This function runs in the scope of the web page.
    return window.location.pathname;
}

function captureContext(batchContext) {
    return {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (err, page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("The capture page took too long to load."));
                }, 10000),
                    openAttempts = 0,
                    loaded = false;

                lastTopic.client.once("agentConnect", function (agent) {
                    lastTopic.client.once("agentSeen", function () {
                        page.evaluate(getPathname, function (url) {
                            clearTimeout(timeout);
                            loaded = true;
                            vow.callback(null, {
                                url: url,
                                page: page,
                                agent: agent
                            });
                        });
                    });
                });

                if (process.env.TRAVIS) {
                    page.onConsoleMessage = function () {
                        console.log.apply(this, [
                            "PhantomJS console message:"
                        ].concat(Array.prototype.slice.apply(arguments)));
                    };
                }

                page.onError = function () {
                    console.log.apply(this, [
                        "PhantomJS error message:"
                    ].concat(Array.prototype.slice.apply(arguments)));
                };

                if (process.env.RESOURCE_DEBUG) {
                    page.onResourceRequested = function () {
                        console.log.apply(this, [
                            "PhantomJS resource requested:"
                        ].concat(Array.prototype.slice.apply(arguments)));
                    };
                }

                (function opener() {
                    page.open(lastTopic.url, function (err, status) {
                        if (status !== "success") {
                            openAttempts += 1;
                            if (openAttempts > 5) {
                                vow.callback(new Error("Failed to load page, URL: " + lastTopic.url +
                                       ", status: " + status));
                                return;
                            }
                            if (!loaded) {
                                if (process.env.TRAVIS) {
                                    console.log("Failed to open load page, URL: " + lastTopic.url +
                                        ", attempt " + openAttempts +
                                        ", scheduling next attempt in 500ms.");
                                }
                                setTimeout(opener, 500);
                            }
                        }
                    });
                }());
            });
        },
        "did not throw": didNotThrow,
        "is ok": function (pageTopic) {
            assert.ok(pageTopic.page);
        },
        "which fires agentConnect with the agent details": function (pageTopic) {
            assert.isString(pageTopic.agent);
        },
        "when querying for connected agents": {
            topic: function (pageTopic, browserTopic, yetiTopic) {
                var vow = this;
                yetiTopic.client.getAgents(function (err, agents) {
                    vow.callback(err, {
                        getAgentsResult: agents,
                        agentName: pageTopic.agent
                    });
                });
            },
            "the result is an array": function (topic) {
                assert.isArray(topic.getAgentsResult);
            },
            "this agent is in the list": function (topic) {
                assert.strictEqual(topic.getAgentsResult[0], topic.agentName);
            }
        },
        "for a batch": batchContext
    };
    /* TODO agentDisconnect is not yet implemented.
    "visits Yeti briefly for the agentDisconnect event": {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("Timed out."));
                }, 500);

                lastTopic.client.once("agentDisconnect", function (agent) {
                    clearTimeout(timeout);
                    vow.callback(null, agent);
                });

                page.open(lastTopic.url, function (status) {
                    if (status !== "success") {
                        vow.callback(new Error("Failed to load page."));
                    }
                    lastTopic.client.once("agentConnect", function (agent) {
                        page.close();
                    });
                });
            });
        },
        "which fires with the agent details": function (agent) {
            assert.isString(agent);
        }
    } */
}

function createBatchTopic(createBatchConfiguration) {
    return function (pageTopic, browser, lastTopic) {
        var vow = this,
            results = [],
            agentCompleteFires = 0,
            agentErrorFires = 0,
            agentSeenFires = 0,
            agentBeatFires = 0,
            timeout = setTimeout(function () {
                vow.callback(new Error("Batch dispatch failed for " + lastTopic.url));
                process.exit(1);
            }, 20000),
            batch = lastTopic.client.createBatch(createBatchConfiguration);

        batch.on("agentResult", function (agent, details) {
            results.push(details);
        });

        batch.on("agentScriptError", function (agent, details) {
            vow.callback(new Error("Unexpected script error: " + details.message));
        });

        batch.on("agentError", function (agent, details) {
            agentErrorFires = agentErrorFires + 1;
        });

        batch.on("agentBeat", function (agent, details) {
            agentBeatFires = agentBeatFires + 1;
        });

        lastTopic.client.on("agentSeen", function (agent) {
            agentSeenFires = agentSeenFires + 1;
        });

        batch.on("agentComplete", function (agent) {
            agentCompleteFires = agentCompleteFires + 1;
        });

        batch.on("complete", function () {
            lastTopic.client.once("agentSeen", function (agent) {
                clearTimeout(timeout);
                pageTopic.page.evaluate(getPathname, function (pathname) {
                    pageTopic.page.close();
                    vow.callback(null, {
                        expectedPathname: pageTopic.url,
                        finalPathname: pathname,
                        agentResults: results,
                        agentBeats: agentBeatFires,
                        agentSeenFires: agentSeenFires,
                        agentErrorFires: agentErrorFires,
                        agentCompleteFires: agentCompleteFires
                    });
                });
            });
        });
    };
}

function waitForPathChange(page, cb) {
    // When PhantomJS loads a new page,
    // begin checking for the new URL and
    // call the callback with the new URL
    // if one is detected within 200ms.
    //
    // XXX: When we can use PhantomJS 1.6,
    // replace with the onUrlChanged event.
    var originalPathname,
        attempts = 0;

    page.evaluate(getPathname, function (err, pathname) {
        originalPathname = pathname;
        cb(pathname); // Record the first URL.
    });

    page.onLoadStarted = function () {
        (function pathnameObserver() {
            page.evaluate(getPathname, function (err, pathname) {
                if (pathname !== originalPathname) {
                    originalPathname = pathname;
                    cb(pathname);
                } else if (attempts > 20) {
                    attempts = 0;
                } else {
                    attempts += 1;
                    setTimeout(pathnameObserver, 10);
                }
            });
        }());
    };
}

function clientFailureContext(createBatchConfiguration) {
    return captureContext({
        topic: function (pageTopic, browser, lastTopic, hub) {
            var vow = this,
                results = [],
                firstPathname = null,
                finalPathname = null,
                sessionEndFires = 0,
                agentErrorFires = 0,
                agentSeenFires = 0,
                agentBeatFires = 0,
                timeout = setTimeout(function () {
                    vow.callback(new Error("Recovery to capture page failed for " + lastTopic.url));
                    process.exit(1);
                }, 20000),
                visitedPaths = [],
                clientSession,
                batch;

            function maybeCallback() {
                if (sessionEndFires && finalPathname) {
                    vow.callback(null, {
                        hub: hub,
                        expectedPathname: firstPathname,
                        finalPathname: finalPathname,
                        sessionEndFires: sessionEndFires,
                        visitedPaths: visitedPaths
                    });
                }
            }

            // Recall that:
            // Client (test provider) <-> Hub (server) <-> Agent (browser)
            //
            // In this test, we will disconnect the client
            // very soon after submitting a batch to the hub
            // and then make sure the agent has moved back to
            // the capture page.

            waitForPathChange(pageTopic.page, function (pathname) {
                visitedPaths.push(pathname);
                if (firstPathname === null) {
                    firstPathname = pathname;
                }
                // Capture page + tests + Capture page
                // 2 + tests = full test cycle
                if (visitedPaths.length >= 2 + createBatchConfiguration.tests.length) {
                    clearTimeout(timeout);
                    pageTopic.page.close();
                    finalPathname = pathname;
                    maybeCallback();
                } else if (pathname.indexOf("fixture") !== -1) {
                    // The URL is a test page.
                    // Kill the Yeti Client session.
                    // We should expect the Hub to send
                    // the user back to the capture page.
                    lastTopic.client.end();
                    // Note: we call end() before the
                    // browser actually can listen to events;
                    // loading has only just begun at this point.
                    // This, we must buffer events for sending later.
                }
            });

            batch = lastTopic.client.createBatch(createBatchConfiguration);

            lastTopic.session.on("end", function () {
                // Hub reports a client session disconnection.
                sessionEndFires += 1;
                maybeCallback();
            });
        },
        "the agent returned to the capture page": function (topic) {
            assert.strictEqual(topic.finalPathname, topic.expectedPathname);
        },
        "the session end event fired once": function (topic) {
            assert.strictEqual(topic.sessionEndFires, 1);
        }
    });
}

function clientTimeoutContext(createBatchConfiguration) {
    return captureContext({
        topic: createBatchTopic(createBatchConfiguration),
        "did not throw": didNotThrow,
        "the browser returned to the capture page": function (topic) {
            assert.strictEqual(topic.finalPathname, topic.expectedPathname);
        },
        "the agentComplete event fired once": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, 1);
        },
        "the agentError event fired once": function (topic) {
            assert.strictEqual(topic.agentErrorFires, 1);
        }
    });
}

function visitorContext(createBatchConfiguration) {
    return captureContext({
        topic: createBatchTopic(createBatchConfiguration),
        "did not throw": didNotThrow,
        "the browser returned to the capture page": function (topic) {
            assert.strictEqual(topic.finalPathname, topic.expectedPathname);
        },
        "the agentComplete event fired once": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, 1);
        },
        "the agentSeen event fired for each test and for capture pages": function (topic) {
            // Test pages. + Return to capture page.
            // (Batch tests) + 1 = Expected fires.
            assert.strictEqual(topic.agentSeenFires, createBatchConfiguration.tests.length + 1);
        },
        "the agentResults are well-formed": function (topic) {
            assert.isArray(topic.agentResults);
            assert.strictEqual(topic.agentResults.length, createBatchConfiguration.tests.length);

            var result = topic.agentResults[0];

            assert.include(result, "passed");
            assert.include(result, "failed");
            assert.include(result, "total");
            assert.include(result, "ignored");
            assert.include(result, "duration");
            assert.include(result, "name");
            assert.include(result, "timestamp");
        },
        "the client-side test passed": function (topic) {
            assert.strictEqual(topic.agentResults[0].passed, 1);
            assert.strictEqual(topic.agentResults[0].failed, 0);
        },
        "the agentBeat event fired for each beat received": function (topic) {
            // Beats are subjective, they are a ping and not really trackable
            // since they may be throttled they may not match up to the actual
            // number of tests being executed, so we just need to make sure
            // a ping actually happened.
            assert.ok(topic.agentBeats);
            //There should be at least one beat per test executed, maybe more
            assert.ok(topic.agentBeats >= createBatchConfiguration.tests.length);
        }
    });
}

function errorContext(createBatchConfiguration) {
    return captureContext({
        topic: createBatchTopic(createBatchConfiguration),
        "did not throw": didNotThrow,
        "the browser returned to the capture page": function (topic) {
            assert.strictEqual(topic.finalPathname, topic.expectedPathname);
        },
        "the agentComplete event fired once": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, 1);
        },
        "the agentError event fired for all tests": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, createBatchConfiguration.tests.length);
        },
        "the agentSeen event fired for capture pages": function (topic) {
            // (Nothing; all tests invalid) + Return to capture page.
            // 1 = Expected fires.
            assert.strictEqual(topic.agentSeenFires, 1);
        },
        "the agentResults is an empty array": function (topic) {
            assert.isArray(topic.agentResults);
            assert.strictEqual(topic.agentResults.length, 0);
        }
    });
}

var DUMMY_PROTOCOL = "YetiDummyProtocol/1.0";

var SERVER_TEST_FIXTURE = fs.readFileSync(path.join(__dirname, "fixture/attach-server.html"), "utf8");
var YUI_TEST_FIXTURE = fs.readFileSync(path.resolve(__dirname, "../../dep/dev/yui-test.js"), "utf8");

function attachServerContext(testContext, explicitRoute) {
    var route, testFixture;

    if (explicitRoute) {
        route = explicitRoute;
    } else {
        route = "/yeti";
    }

    testFixture = SERVER_TEST_FIXTURE.replace(/\{route\}/g, route);

    return {
        topic: function () {
            var vow = this,
                server = http.createServer(function (req, res) {
                    if (req.url === "/fixture") {
                        res.writeHead(200, {
                            "Content-Type": "text/html"
                        });
                        res.end(testFixture);
                    } else if (req.url === "/yui") {
                        res.writeHead(200, {
                            "Content-Type": "application/javascript"
                        });
                        res.end(YUI_TEST_FIXTURE);
                    } else {
                        res.writeHead(404, {
                            "Content-Type": "text/plain"
                        });
                        res.end("You failed.");
                    }
                });

            server.on("upgrade", function (req, socket, head) {
                if (req.headers.upgrade === DUMMY_PROTOCOL) {
                    socket.write([
                        "HTTP/1.1 101 Why not?",
                        "Upgrade: " + DUMMY_PROTOCOL,
                        "Connection: Upgrade",
                        "",
                        "dogcow"
                    ].join("\r\n"));
                }
            });

            server.listen(function () {
                vow.callback(null, server);
            });
        },
        teardown: function (server) {
            server.close();
        },
        "did not throw": didNotThrow,
        "is connected": function (server) {
            assert.isNumber(server.address().port);
        },
        "attached to a Yeti Hub": {
            topic: function (server) {
                var vow = this,
                    hub = new Hub();

                if (!explicitRoute) {
                    hub.attachServer(server);
                } else {
                    hub.attachServer(server, route);
                }

                return hub;
            },
            "did not throw": didNotThrow,
            "is ok": function (hub) {
                assert.ok(hub.server);
            },
            "when sending a non-Yeti upgrade request": {
                topic: function (hub) {
                    var vow = this,
                        req = http.request({
                            port: hub.hubListener.server.address().port,
                            host: "localhost",
                            headers: {
                                "Connection": "Upgrade",
                                "Upgrade": DUMMY_PROTOCOL
                            }
                        });

                    req.end();

                    req.on("error", vow.callback);

                    req.on("upgrade", function (res, socket, head) {
                        socket.end();
                        vow.callback(null, {
                            res: res,
                            head: head
                        });
                    });
                },
                "the data is correct": function (topic) {
                    assert.strictEqual(topic.head.toString("utf8"), "dogcow");
                }
            },
            "used by the Hub Client": {
                // TODO: Handle without trailing slash.
                topic: hub.clientTopic(route + "/"),
                teardown: function (topic) {
                    topic.client.end();
                },
                "a browser for testing": hub.phantomContext({
                    "visits Yeti": testContext
                })
            }
        }
    };
}

function attachServerBatch(definition) {
    var batch = {},
        routeWords = ["foo", "bar", "baz", "quux"];

    Object.keys(definition).forEach(function (name) {
        var options = definition[name],
            route = "/" + routeWords.sort(function () {
                return 1 - Math.random() * 2;
            }).join("-");

        batch[name] = attachServerContext(visitorContext(options));
        batch[name + " with a custom route"] = attachServerContext(visitorContext(options), route);
    });

    return batch;
}

var basedir = path.join(__dirname, "..", "..");

function fixtures(basenames) {
    return basenames.map(function (basename) {
        return path.join(__dirname, "fixture", basename);
    });
}

function withTests() {
    return {
        basedir: basedir,
        tests: fixtures(Array.prototype.slice.call(arguments))
    };
}

vows.describe("Yeti Functional")
    .addBatch(hub.functionalContext({
        "visits Yeti": visitorContext(withTests("basic.html", "local-js.html", "404-script.html"))
    }))
    .addBatch(hub.functionalContext({
        "visits Yeti with a query string parameter": visitorContext({
            basedir: basedir,
            tests: fixtures(["query-string.html"]),
            query: "dogcow=moof"
        })
    }))
    .addBatch(hub.functionalContext({
        "visits Yeti with test that will timeout": clientTimeoutContext({
            basedir: basedir,
            tests: fixtures(["long-async.html", "basic.html"]),
            timeout: 3 // long-async.html takes 10s to run, we expect it to be skipped
        })
    }))
    .addBatch(hub.functionalContext({
        "visits Yeti then aborts during the batch": clientFailureContext(withTests("long-async.html"))
    }))
    .addBatch(hub.functionalContext({
        "visits Yeti with invalid files": errorContext(withTests("this-file-does-not-exist.html"))
    }))
    .addBatch(attachServerBatch({
        "A HTTP server with an upgrade listener (for Yeti paths)": {
            tests: ["/fixture"],
            useProxy: false
        }
    }))
    .export(module);

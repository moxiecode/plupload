# A Brief History of Yeti

## 0.2.23 / In Development

## 0.2.22 / 2013-05-08

  * Automatically restart stalled browsers when using WebDriver.
  * Avoid Selenium proxy in Sauce Labs to support IE 6-9. (04a04af)
  * Sauce Labs maximum duration is set by Yeti to 2 hours. (90fa17f)
  * Support for `HTTP_PROXY` and `HTTPS_PROXY` environment variables when installing Yeti dependencies. Fix #34.
  * Crash fix: prevent calling _launch twice when starting a browser. (797bb4d)
  * Crash fix: properly close duplicate connection. Fix #38.
  * Bugfix: Yeti exits with code 1 when tests fail using the JUnit XML reporter. (002766a)
  * Bugfix: Fix bug in Batch.disallowAgentId. (3100efd)
  * Bugfix: Uncaught exceptions are now reported in JUnit XML results. (06ded16)
  * Bugfix: Improve handling of browser-sent events on load. (b73e787)
  * Upgrade glob and request dependencies. Fix #37, #40.

## 0.2.21 / 2013-04-11

  * Batches that use WebDriver only use browsers launched by WebDriver, not existing browsers.
  * Accept `latest` as a WebDriver browser version. (8fbe878)
  * Add browsers used by Sauce Labs. (f7af3f6)
  * Fix server-side `wd-url` command-line option. (c9592a3)
  * Fix issue with echoecho JSONP when using a query string like `&callback=foo`. (cd6b2a1)
  * Fix possible hang during WebDriver browser launching. (8bf4efe)
  * Fix possible quit before JUnit XML was completely written to stdout. (9ebabc5)

## 0.2.20 / 2013-03-20

  * Report results for the correct test. Never run tests twice. Fix Trac #129.
  * Run Android tests faster by removing unneeded timeout between tests. (c252285)
  * Improve error messages that can occur during WebDriver launching. (559d887, 048a722)
  * Allow client to set `wd-url` for a Hub to launch browsers.
    <https://github.com/yui/yeti/pull/32>
  * Prevent calling WebDriver launcher callback twice, which can cause a crash. (ac13083)

## 0.2.19 / 2013-03-14

  * Report uncaught errors.
    <https://github.com/yui/yeti/pull/31>
      * Fix agentError event.
      * Catch uncaught errors that occur before domready.
  * Increase timeout to first ping from 2s to 60s.
    <https://github.com/yui/yeti/pull/30>
  * Fix bug that would cause some tests to never run. (88f26d3, 8703aea)
  * Prevent WebDriver-launched browsers from timing out during testing. (a9b7e10)
  * Reduce WebDriver CLI options to `wd-url`. (4b2b8a3)
    * Old options from earlier 0.2.x versions are maintained for compatibility.

## 0.2.18 / 2013-03-09

  * Fix test timeout feature; rapid disconnects for crashed browsers
    <https://github.com/yui/yeti/pull/29>
    * Replace timeout feature with a test-specific timeout and a browser-response timeout.
    * Browser has to keep responding or else it gets killed within 3-5 seconds.
    * Each test must complete within the test-specific timeout.
    * Introduce some robustness enhancements to the client-side script.
    * If a browser crash happens during a test run, attempt to run that test again.
  * Upgrade YUI from 3.7.3 to 3.8.1.
  * Fix agentDisconnect event and unload handler.
  * Use minified scripts for release.

## 0.2.17 / 2013-03-04

  * Fix #129, amount of tests being ran are not consistent.
  * Fix "Operation Aborted" error on capture page for IE.
  * Fix a bug that could cause WebDriver browsers to never close.
  * Fix a potential crash related to Blizzard session cleanup.
  * Introduce end event for the Yeti API.
  * Improved unit tests.
  * Lots of internal refactoring in lib/hub.
  * All internal modules export 1 thing.

## 0.2.16 / 2013-01-22

  * Fix #126, script dependencies are included in npm package.
  * Fix #131, add support for Dojo Objective Harness (DOH).
  * Fix #132, inject test runner only into files in the batch.

## 0.2.15 / 2013-01-10

  * Fix #121, ensure socket is truthy during browser setup.
  * Fix #122, entity encode failure messages in XML.
  * WebDriver browser launching support.
  * Add iPad and PhantomJS as recognized browsers.

## 0.2.14 / 2012-11-21

  * Fix #112, support Jasmine, Mocha frameworks. Improve QUnit support.
  * Fix #109, distribute batch workload in parallel.
  * Fix #110, include time attribute in JUnit output.
  * Fix #113, fix `yeti -v` and `yeti --help`.
  * Fix #115, Yeti CLI tests should use free ports.
  * Fix #114, `--port` used for making default URL.
  * Fix #87, remove NFE for IE8 support.
  * Feature: New instances of a browser already in a Batch can join the Batch.
  * Bugfix: Prevent zombie browser errors.
  * Bugfix: Do not allow more than 1 socket with the same Agent ID. (c50d476)
  * Bugfix: False CLI test failure when ran offline. (a2773f8)

## 0.2.13 / 2012-11-01

  * Fix #103, add AJAX testing routes provided by echoecho.
  * Fix #108, add basic support for QUnit.
  * Fix #107, new error event for non-essential 404s, omitted by the CLI.
  * Fix #106, feedback line clears before test results for cleaner output.
  * Fix #105, improved feedback line reporter time formatting.
  * Fix #102, socketWrite crash after end().
  * Fix #91, browser test driver rewrite using YUI.

## 0.2.12 / 2012-10-12

  * Fix #11, introduce `--junit` option to output JUnit XML.
  * Fix #96, `--hub` option properly accepts urls and Booleans.
  * Fix #98, resolved a flaky event test race condition.
  * Fix #100, prevent crashes from malformed Yeti RPC calls.
  * Free up RPC garbage when the other side disconnects.

## 0.2.11 / 2012-09-28

  * Fix feedback line for Windows. Use portable line-clearing code.
  * Fix CLI icons for Windows.
  * Redesigned capture page.

## 0.2.10 / 2012-09-21

  * Display LAN and Local IPs for connecting browsers.
  * Use `.yeti.json` configuration file when available.
  * Add the `basedir` option to specify the directory Yeti is allowed to serve.
  * Add the `glob` option to locate test files matching a pattern.
  * Hub URLs without an explicit port set in the URL now correctly use port 80.
  * Install unminified SockJS client script to workaround an issue in IE 10.
  * Detect Chrome browser for mobile devices.
  * Do not change Yeti behavior when stderr is not a TTY.
  * Remove broken assertions in Yeti's RPC system (Blizzard).

## 0.2.9 / 2012-08-27

  * Configurable query string.
  * Configurable timeout.
  * Provide YUI Test Coverage results.
  * Prevent race condition during IE6 page navigation.
  * Capture page reconnects after server comes back online.
  * Reset heartbeat timer after test files are served.
  * Test results print on stdout instead of stderr.
  * Yeti's RPC system (Blizzard) will buffer writes if its socket is not writable.
  * Improved doc landing page.

## 0.2.8 / 2012-08-06

  * New feedback line details Yeti's status during your batch.
  * Remove dependency on director, plates, and union modules.

## 0.2.7 / 2012-08-01

  * Node.js v0.8 support.
  * Return connected browsers to capture page when test batch is aborted.
  * Identify browsers by pathname instead of cookies where possible.

## 0.2.6 / 2012-06-15

  * Node.js v0.7.11 support.
  * Internet Explorer 6 support.
  * Android 2.3 support.
  * Replace Socket.io with SockJS.
  * Fix Bug #85: Submit multiple batches to a Hub at the same time.
  * Ignore script errors generated by Firefox failing to load a script. (Dav Glass) 
  * "Agent disconnected" events & notifications. (Dav Glass)
  * Windows 7 developer tools with `.\jake.bat`. (Clarence Lenug)
  * Fix Bug #78: HTTP 405 error sent instead of 404. (Clarence Lenug)
  * Faster communication between the Yeti Hub and Client.
  * Removed dependency on substack's `binary` module.
  * Increased test coverage.
  * Various small improvements.

## 0.2.5 / 2012-06-01

  * Security: Yeti Client will only serve files to the connected
    Hub within the directory the Client was started in.
    More details: http://yeti.cx/blog/2012/06/yeti-0-2-5-released/
  * Fix Bug #76 Run fixture YUI Tests offline;
    really no longer depend on yui.yahooapis.com at runtime.
  * Fix Bug #74 `$yetify` JavaScript should not be injected into CSS.
  * Avoid crashing Yeti on certain types of bad requests.

## 0.2.4 / 2012-05-18

  * Fix Bug #64 Run tests where the first script tag is inside an HTML comment.
  * Fix Bug #63 Run tests that try to load non-existent resources.
  * Fix Bug #44 Run tests offline; no longer depend on yui.yahooapis.com.

## 0.2.3 / 2012-05-08

  * Fix Bug #62 IE7+ does not run the test/fixture/basic.html test.

## 0.2.2 / 2012-04-23

  * Fix Bug #59 Fix `--version` command line option. (Ryuichi Okumura)
  * Fix Bug #60 Fix code problems reported by the linter.
  * Fix Bug #61 Improve Yeti HTML documentation, include contributor information.

## 0.2.1 / 2012-04-11

  * Fix Bug #46 Yeti Hub with attachServer cannot serve Socket.io to browsers.
  * Fix Bug #48 JavaScript files served by Yeti incorrectly contain injected script.
  * Fix Bug #53 Firefox throws a script error during testing.
  * Fix Bug #36 Handle test 404s.
  * Fix Bug #40 Yeti Hub exits without error when its port is in use.
  * Fix Bug #52 attachServer 'route' argument is required for proper function.
  * Fix Bug #54 Close API for client connection.

## 0.2.0 / 2012-03-07

  * Rewrite. Requires Node.js v0.6.x.
  * Yeti Hub (test server) can serve tests to browsers from remote machines.
  * Yeti Hub can be attached to other servers.
  * New documentation.

## 0.1.8 / 2011-10-19

  * Switched to socket.io for browser communication.
  * Exit on batch completion: no more Ctrl-C when done.
  * IE6 and Opera compatibility fixes. (Dav Glass)
  * Better browser identification. (Dav Glass)
  * Workaround /undefined route. (Dav Glass)

## 0.1.7 / 2011-05-03

  * Updated to latest Express and Connect.
  * Tested with npm 1.0.
  * Use nopt instead of optparse.

## 0.1.6 / 2011-03-29

  * Replaced optparse with built-in copy of optparse, since it isn't available on npm.

## 0.1.5 / 2011-03-29

  * Replaced optimist with optparse for CLI option parsing.
    Optimist didn't work with recent npm versions.

## 0.1.4 / 2011-02-05

  * Fix for changed Node v0.3 HTTP API.

## 0.1.3 / 2010-12-08

  * Require `--server` to start the server.
  * Add usage statement.
  * Windows support: Fix fatal error under Cygwin. (#9)
  * Changed: Options must be "--port=8000" instead of "--port 8000".
  * Upgrade Express to 1.0.0.
  * Upgrade Connect to 0.5.0.
  * Upgrade Jade to 0.5.7.
  * Upgrade Optimist to 0.1.1.

## 0.1.2 / 2010-11-10

  * Better fault tolerance: 404s, syntax errors, etc.
  * Added some fun stats to the test runner.
  * Fix missing module "jade" errors. (#5)
  * Upgraded to Express 1.0.0rc4.

## 0.1.1 / 2010-09-29

  * YUI 2.x support.
  * Internet Explorer 9 now reports test results.
  * UI improvements. (Dav Glass)
  * CLI changes: exception handlers, bug report URL, graceful shutdown, etc.
  * Fixed an issue when spaces where in the path of the test. (#2)
  * Upgraded to Express 1.0.0rc3.

## 0.1.0 / 2010-08-25

  * Report full User-agent string.
  * Corrected dependency versions in package.json.
  * Minor enhancements for future releases.

## 0.1.0rc3 / 2010-08-16

  * Open source under BSD!
  * Better caching of test resources.
  * Prevent some IE memory leaks.
  * --solo option to exit on arrival of 1 result per file, with summary.

## 0.1.0rc2 / 2010-08-11

  * Security: Yeti now only serves from the cwd you're in or the --path directory.
  * Polished the test runner page.
  * Removed dependency on class.js.
  * Files served in the same test run are cached.

## 0.1.0rc / 2010-08-05

Public release candidate.

  * Added YUI favicon.
  * Added additional cli tests.

## 0.1.0demo / 2010-08-03

Public demo.

  * Works with any standalone HTML document.
  * Added Vows test scripts.
  * Broke up app.js into modules to make testing easier.
  * Cleaned up inject.js, app.js and cli.js.

## 0.0.6 / 2010-07-23

  * Server mode.
  * Display failed test details.
  * Added window.onerror handler.

## 0.0.5 / 2010-07-20

  * Added --port option to override the default port 8000.
  * Removed frozen dependencies from vendor directory.

## 0.0.4 / 2010-07-19

  * Safari opens tests much more reliably. (AppleScript is no longer used.)
  * Updated to Express 1.0.0beta.

## 0.0.3 / 2010-07-19

  * Added Firefox and Chrome browsers.

## 0.0.2 / 2010-07-19

  * First release to npm.
  * Test reporting looks better.
  * Multiple file support.

## 0.0.1 / 2010-07-17

  * Published to GitHub.

# JSCovReporter

This is a testing framework agnostic in-browser Javascript coverage reporter. It works with <a href="https://github.com/arian/CoverJS">CoverJS</a> instrumented code. The UX and appearance of the report mimic Mocha's <a href="http://visionmedia.github.com/mocha/#htmlcov-reporter">HTMLCov runner</a> which only works with nodejs. JSCovReporter should work with any testing framework such as QUnit, Jasmine, Mocha, Buster or anything you use.

The files included here are borrowed from Mocha project and have been slightly modified to work with the HTML produced by this reporter and work well with <a href="https://github.com/visionmedia/mocha">Mocha's</a> <a href="http://visionmedia.github.com/mocha/#html-reporter">HTML runner</a>, currently the only Mocha in-browser runner. This is what Mocha looks like when used with JSCovRepoter:

<img src="https://a248.e.akamai.net/camo.github.com/ff1d7436abd2dd1def46904edd8233e2f7a5c1f4/687474703a2f2f692e696d6775722e636f6d2f4155556e412e706e67" alt/>

## Setup

* JSCovRepoter depends on <a href="https://github.com/documentcloud/backbone">Backbone</a> (Tested with version 0.9.2) and <a href="https://github.com/documentcloud/underscore">Underscore</a> (or <a href="https://github.com/bestiejs/lodash">Lodash</a>). So make sure you include those in your HTML test runner file.

* Download from this repository and include `reporter.js`, `reporter.css` and `JSCovReporter.js` files in your runner.

* Your test runner body will need to contain this DOM, besides the one that your testing framework needs. Most likely you want these after the div for your framework, so that coverage appears after testing results:

```html
    <div id="coverage"></div>
    <div id="menu"></div>
```

## Usage

### Instrument your Javascript code

You will first need to instrument your javascript code using <a href="https://github.com/arian/CoverJS">CoverJS</a>. Install it using nodejs npm package manager:

    npm install coverjs

Add coverjs bin to your PATH and then do:

    coverjs mylibrary.js --output instrumented

This will create an `instrumented`directory, containing an instrumented `mylibrary.js`, these are the files you have to link in your HTML test runner.

### Generate a report

When the testing suite is done, just create a `JSCovReporter` instance passing it CoverJS' global coverObject as `coverObject` argument:

```javascript
    if (typeof window.__$coverObject !== 'undefined') {
        var reporter = new JSCovReporter({ coverObject: window.__$coverObject });
    }
```

In this case we are making sure coverObject exists, this way your runner will work with or without instrumented code.

### Mocha usage example

For example in <a href="https://github.com/visionmedia/mocha">Mocha</a> you can easily plug it in using `run` callback:

```javascript
    mocha.run(function () {
        if (typeof window.__$coverObject !== 'undefined') {
            var reporter = new JSCovReporter({ coverObject: window.__$coverObject });
        }
    });
```

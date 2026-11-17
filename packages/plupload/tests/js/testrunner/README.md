TestRunner
==========

To visualize coverage data we currently use [JSCovReporter](https://github.com/jayarjo/JSCovReporter), which seems to be simple enough and pretty. We include it as a submodule under `coverage/js/`.

*Supposed file structure:*

```
tests/
	js/
	project/
		Example.html
		tests.js
	index.html
```

This way `TestRunner` can be included into an arbitrary project as a submodule under `js/` folder, without interfering with test files.

*index.html*

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Test Runner</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge" />

<link rel="stylesheet" href="js/testrunner.css" type="text/css" />
<script src="js/testrunner.js"></script>
<script>
	TestRunner.addSuites([
		"project/tests.js"
	]);
</script>
</head>
<body></body>
</html>
```

*project/tests.js*

```javascript
{
	"title": "example",
	"tests": [
		{ "title": "Example", "url": "Example.html" }
	]
}
``` 

*project/Example.html*

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Test File</title>

<!-- qunit -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
<link rel="stylesheet" href="http://code.jquery.com/qunit/qunit-git.css" type="text/css" />
<script src="http://code.jquery.com/qunit/qunit-git.js"></script>

<!-- testrunner -->
<script src="../js/reporter.js"></script>

<script type="text/javascript">

QUnit.config.reorder = false;

module("Example", {
	setup: function() {},

	teardown: function() {}
});


test("Are E.T.s among us?", function() {
	ok(!false, "4 sure.");
});

</script>
</head>
<body>
	<h1 id="qunit-header">Test Suite</h1>
	<h2 id="qunit-banner"></h2>
	<h2 id="qunit-userAgent"></h2>
	<ol id="qunit-tests">
	</ol>
    <div id="qunit-fixture"></div>
</body>
</html>
```

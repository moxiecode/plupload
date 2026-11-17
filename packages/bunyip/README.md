# bunyip

Automate client-side unit testing in real browsers using the CLI

## Getting Started
Install the module with: `npm install -g bunyip`. This is a CLI tool so it needs to be globally installed.

### BrowserStack account
In order for bunyip to flex its real muscle I recommend you get a paid [BrowserStack account](http://www.browserstack.com/pricing) as all paid accounts have access to their API. Without the API you'll need to connect your own slave browsers to bunyip.

### localhost sharing service
If you wish to test on devices that are not part of your local network you'll be required to setup a tunneling service. I recommend [pagekite](https://pagekite.net/support/quickstart/) as it gives you a nice free chunk of data and allows you to specify a reusable subdomain. [Showoff.io](https://showoff.io/) is another good option.

### Setup the config.js file
If you don't wish to use BrowserStack or a localhost sharing service you can skip this step. If you look inside the bunyip package folder you'll see a `config.json` file. Edit the values to whatever you need it to be. After that you can leave it under the package folder or move to whatever place is more convenient to you. In the latter case you will be able to invoke bunyip with custom config via -c option, like this:

```bash
bunyip -c /path/to/custom/config.json index.html
```

```js
{
	"hub": "localhost",
	"port": 9000,
	"timeout": 480,
	"loglevel": "silent",

	"browserstack": {
		"username": "user",
		"password": "pass",
		"version": 2
	},
	"tunnel": {
		"url": "bunyip.pagekite.me",
		"cmd": "pagekite.py <port> <url>"
	}
}
```


## Test suite adaptors

Behind the scenes bunyip uses a tool called Yeti unfortunately Yeti only works with YUI Test. However I have written some [adaptors](https://github.com/ryanseddon/yeti-adaptors) for QUnit and jasmine, go check out my other repo for examples on using them with your current test suites.

If you use another client-side testsuite please feel free to contribute it to my [yeti-adaptors](https://github.com/ryanseddon/yeti-adaptors) repo.

## Examples

```bash
bunyip index.html
```

The above command will launch a simple Yeti hub on port 9000 and use the `index.html` inside your current working directory.

```bash
bunyip -c ~/config.json index.html
```
This will try to load config.json from user's home directory (*nix)

```bash
bunyip -p 1337 index.html
```

This will change the port that is used. The global config value will be updated for you so don't worry.

### BrowserStack workers

```bash
bunyip -b ios index.html
```

Assuming you have a BrowserStack paid account and have setup a localhost sharing service the `-b ios` will send off a command to launch all iOS devices (3 iPhones and 3 iPads) on BrowserStack and once they're connected you can run your test suite.

```bash
bunyip -s
```

This will query the BrowserStack API for any device or browsers that are currently running on your account.

```bash
bunyip -k <id> or all
```

If you no longer need a specific worker or you wish to destroy all of them you can either specify a single worker id or `all` and it will destroy said worker(s).

```bash
bunyip -h
```

For more info specify the help flag to get more info about each command flag available.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/cowboy/grunt).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Ryan Seddon  
Licensed under the MIT license.

# mOxie

mOxie is combined name for XHR2 and File API pollyfills that we've extracted from [Plupload](https://github.com/moxiecode/plupload) in order to make it more flexible and give it opportunity for further growth. But now that pollyfills are separate, they can be used independently.

XHR2 and File API pollyfills are multi-runtime, which means that they will fallback to Flash and SilverLight (additionally there's Java runtime in production) or even "good old" HTML4, when there are no HTML5 capabilities found in current browser.

## Table of Contents

* [Building Instructions](#building-instructions)
  * [Prerequisites](#prerequisites)
  * [Compile JavaScript](#compile-javascript)
  * [Compile Flash](#compile-flash)
  * [Compile Silverlight](#compile-silverlight)
  * [Generate API Documentation](#generate-api-documentation)
  * [Build Packages](#build-packages)
* [Getting Started](#getting-started)
* [API Reference](https://github.com/moxiecode/moxie/wiki/API)
* [Support](#support)
* [Contribute](#contribute)
* [License](#license)



### Building Instructions

It may sound a bit odd, but the best building environment for mOxie is Windows computer. Mainly because it is not currently possible to build Silverlight component on alternative platforms. There used to be a [Moonlight](http://www.mono-project.com/Moonlight) project, which was meant to fill in the gap for *nix systems, but there was no noticeable activity on the site since 2009, its feature-set has freezed somewhere in the mid-Silverlight 4, and more importantly, a component that is produced after compilation is not exactly a Silverlight component, hence the alternative name and all the compatibility issues in the latest browsers.

So, although these instructions are quite generic, they still have Windows workstation in mind. If you do not have Windows workstation, you can easily [virtualize](https://www.virtualbox.org/wiki/Screenshots) one.

#### Prerequisites

The best way to start is to clone the _mOxie_ repository, with all it's submodules:

```
git clone --recursive https://github.com/moxiecode/moxie.git
```

Building environment is based on [Node.js](http://nodejs.org/), mainly because it is cool and easy, but even more importantly, because it is powered by JavaScript (we love JavaScript :). Node.js binaries (as well as Source) [are available](http://nodejs.org/download/) for all major operating systems.

In addtion to Node.js some additional modules are required, simply change your working directory to where you have extracted mOxie package and run: `npm install`. All dependencies will be downloaded and installed automatically.

*Note:* currently for unknown reason, locally installed Node.js modules on Windows, may not be automatically added to the system PATH. So if `jake` commands below are not recognized you will need to add them manually:

```
set PATH=%PATH%;%CD%\node_modules\.bin\
```

#### Compile JavaScript

Plupload runtimes - the main source for these pollyfills historically came in monolithic state. Nothing could have been added to them or removed. This wasn't convenient enough, since not everybody required all the functionality and resulting JS file still got quite big for mere file uploader. Taking this into account we made pollyfills granular. There are still some internal dependencies that cannot be broken, but several big components (such as image manipulation logic, for example) can easily be separated now.

Basic JavaScript compiler can be invoked with: `jake mkjs`. It will compile all the components and runtimes into several versions of one monolithic `moxie.js` file (minified and development versions among them). Results will be written to `bin/js`.

But as I mentioned it doesn't have to be monolithic anymore and you can include only the parts that you require. For example basic file uploader, without progress indication support can get as small as 12kb gzipped. In order to leverage that granularity you must invoke JavaScript compiler with the list of components that you absolutely want to use and list of runtimes to fallback to. For example:

```
jake mkjs[file/FileInput,xhr/XMLHttpRequest] runtimes=html5,flash
```

This will compile JavaScript file having support for the file picker and XMLHttpRequest Level 2 pollyfill with two runtimes - HTML5 and Flash (resulting file size ?).

Currently there are only several major components that you should care about (the rest will be pulled in as dependecies automatically). These are:

* `file/FileInput`
* `file/FileDrop`
* `file/FileReader`
* `xhr/XMLHttpRequest`
* `image/Image`

And several runtimes (Java is in production right now):

* _html5_
* _flash_
* _silverlight_
* _html4_
* _[googledrive](https://github.com/moxiecode/moxie/wiki/Additional-Runtimes)_
* _[dropbox](https://github.com/moxiecode/moxie/wiki/Additional-Runtimes)_

Use combination of these in `jake mkjs` to acquire customized JavaScript file.

To compile all available runtimes, run:

```
jake mkjs runtimes=all
```

#### Compile Flash

To build Flash component you will also need Flex 4.x SDK, which is freely available from [Adobe site](http://www.adobe.com/devnet/flex/flex-sdk-download.html). Flex SDK comes as a package, not binary. So you will have to manually extract it somewhere and ensure that compiler is available across the system. Depending on a platform you might also require to install [Java Runtime Environment \(JRE\)](http://www.java.com/inc/BrowserRedirect1.jsp?locale=en). To put Flex compiler (`mxmlc`) into the system PATH, execute the following in your command-prompt window:

**For Windows** (we assume here that SDK was extracted to `Program Files\flex_sdk_4.x`, use your own path if it was different):

```
set PATH=%PATH%;%PROGRAMFILES%\flex_sdk_4.x\bin
```

**For *nix** (replace `/opt/flex_sdk_4.x` with the path to extracted SDK)

```
export PATH=$PATH:/opt/flex_sdk_4.x/bin
```

Although be **warned**, as this will set the system PATH **for current session only**, in order to set it forever, check your platform specific documentation.

Once you have it, you can run `jake mkswf` in your command-prompt, from mOxie directory and corresponding component files will get compiled and written to `bin/flash/` directory. There will be two versions: `Moxie.swf`, which includes client-side image manipulation logic, and `Moxie.min.swf`, twice as small, but without it.

#### Compile Silverlight

To build Silverlight component you need [.NET Framework 4](http://www.microsoft.com/en-us/download/details.aspx?id=17851) and [Silverlight 4 SDK](http://www.microsoft.com/en-us/download/details.aspx?id=7335) (and of course, as we [mentioned above](#build-instructions), a Windows PC). These are binary packages so you will not have to extract them manually, but you will still need to set the PATH to make compiler (`msbuild.exe`) available across the system. So after you install both, open your command prompt and type in something like this:

```
set PATH=%PATH%;%WINDIR%\Microsoft.NET\Framework\v4.x
```

Make sure that version suffix (v4.x) corresponds to actual .NET Framework version and physical folder where `msbuild` executable resides. Again be **warned**, that this will set the system PATH **for current session only**, in order to set it forever, check documentation specific to your platform.

Once you have `msbuild.exe` in the system PATH you can run `jake mkxap` and two Silverlight components will be compiled to `bin/silverlight` directory: `Moxie.xap`, a version with image manipulation logic compiled in and much smaller `Moxie.min.xap` - without it.

#### Generate API Documentation

JavaScript files contain descriptions for all public classes and methods as well as the examples of their typical usages. All of these informations can be easily extracted into a linked HTML-based API reference (thanks to [YUIDoc](http://yui.github.com/yuidoc/)).

To get the documentation, execute: `jake docs`. Reference will appear under `docs/` folder.

#### Build Packages

It is also possible to build fully packacged releases, customized or not, zipped and ready to be shared or shipped, containing JS files, Flash/Silverlight shims and documentation.

All of the following commands will generate packages under `tmp/` folder.

* `jake release` - Generates full user and development packages.
* `jake package` - Generates full user package.
* `jake package[comma-separated-list-of-components-to-include] runtimes=comma-separated-list-of-runtimes-to-use` (see [all available options](#compile-js-options))

### Getting started

You can customize various parameters, such as the path the the Moxie.swf file by changing properties on `mOxie.Env` after the script is loaded:

    <script src="moxie.js"></script>
    <script>mOxie.Env.swf_url = './flash/Moxie.min.swf';</script>

Also see the [File Picker](https://github.com/moxiecode/moxie/wiki/File-Picker) example on the wiki.

### Support

We are actively standing behind our products. We ask you to [file bug reports](https://github.com/moxiecode/moxie/issues?state=open) if you encounter any. We may not
react to them instantly, but we constantly bear them in my mind as we extend the code base.

### Contributing

We are open to suggestions and code revisions, however there are some rules and limitations that you might
want to consider first.

* Code that you contribute will automatically be licensed under the AGPLv3, but will not be limited to AGPLv3.
* Although all contributors will get the credit for their work, copyright notices will be changed to [Ephox](http://www.ephox.com/).
* Third party code will be reviewed, tested and possibly modified before being released.

These basic rules help us earn a living and ensure that code remains Open Source and compatible with AGPLv3 license. All contributions will be added to the changelog and appear in every release and on the site.

### License

Copyright 2016, [Ephox](http://www.ephox.com/)
Released under [AGPLv3 License](https://github.com/moxiecode/moxie/blob/master/license.txt).

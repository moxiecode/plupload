# Plupload

Plupload is a cross-browser multi-runtime file uploading API. Basically, a set of tools that will help you to 
build a reliable and visually appealing file uploader in minutes.

Historically, Plupload comes from a dark and hostile age of no HTML5, hence all the alternative fallbacks, 
like Flash, Silverlight and Java (still in development). It is meant to provide an API, that 
will work anywhere and in any case, in one way or another. While having very solid fallbacks, Plupload 
is built with the future of HTML5 in mind.

## Table of Contents
* [Backstory](#backstory)
* [Structure](#structure)
  * [File API and XHR L2 pollyfills](https://github.com/moxiecode/moxie)
  * [Plupload API](https://github.com/moxiecode/plupload/wiki/API)
  * UI Widget
  * Queue Widget
* [Building Instructions](#build)
* Getting Started
* [Frequently Asked Questions](https://github.com/moxiecode/plupload/wiki/Frequently-Asked-Questions)
* [Support](#support)
* [Contributing](#contribute)
* [Contact Us](http://www.moxiecode.com/contact.php)

<a name="backstory" />
### Backstory

Plupload started in a time when uploading a file in a responsive and customizable manner was a real pain. 
Internally, browsers only had the `input[type="file"]` element. It was ugly and clunky at the same time. 
One couldn't even change it's visuals, without hiding it and coding another one on top of it from scratch. 
And then there was no progress indication for the upload process... Sounds pretty crazy today.

It was very logical for developers to look for alternatives and writing their own implementations, using 
Flash and Java, in order to somehow extend limited browser capabilities. And so did we, in our search for 
a reliable and flexible file uploader for 
our [TinyMCE](http://www.tinymce.com/index.php)'s
[MCImageManager](http://www.tinymce.com/enterprise/mcimagemanager.php). 

Quickly enough though, Plupload grew big.  It easily split into a standalone project. 
With major *version 2.0* it underwent another huge reconstruction, basically 
[from the ground up](http://blog.moxiecode.com/2012/11/28/first-public-beta-plupload-2/), 
as all the low-level runtime logic has been extracted into separate [File API](http://www.w3.org/TR/FileAPI/) 
and [XHR L2](http://www.w3.org/TR/XMLHttpRequest/) pollyfills (currently known under combined name of [mOxie](https://github.com/moxiecode/moxie)), 
giving Plupload a chance to evolve further.

<a name="structure" />
### Structure

Currently, Plupload may be considered as consisting of three parts: low-level pollyfills, 
Plupload API and Widgets (UI and Queue). Initially, Widgets were meant only to serve as examples 
of the API, but quickly formed into fully-functional API implementations that now come bundled with 
the Plupload API. This has been a source for multiple misconceptions about the API as Widgets were 
easily mistaken for the Plupload itself. They are only implementations, such as any of you can 
build by yourself out of the API.

* [Low-level pollyfills (mOxie)](https://github.com/moxiecode/moxie) - have their own [code base](https://github.com/moxiecode/moxie) and [documentation](https://github.com/moxiecode/moxie/wiki) on GitHub.
* [Plupload API](/moxiecode/plupload/wiki/API)
* [UI Widget]()
* [Queue Widget]()

<a name="build" />
### Building instructions

Plupload depends on File API and XHR2 L2 pollyfills that currently have their 
[own repository](https://github.com/moxiecode/moxie) on GitHub. However, in most cases you shouldn't 
care as we bundled the latest build of mOxie, including full and minified JavaScript source and 
pre-compiled `SWF` and `XAP` components, with the repository here. You can find everything you may
need under `js/` folder.

There are cases where you might need a custom build, for example free of unnecessary runtimes, half the 
original size, etc. The difficult part of this task comes from mOxie and its set of additional runtimes 
that require special tools on your workstation in order to compile. 
Consider [build instructions for mOxie](https://github.com/moxiecode/moxie#build-instructions) - 
everything applies to Plupload as well.

First of all, if you want to build custom Plupload packages you will require [Node.js](http://nodejs.org/), 
as this is our build environment of choice. Node.js binaries (as well as Source)
[are available](http://nodejs.org/download/) for all major operating systems.

In addtion to Node.js some additional modules will be required. Change your working directory to where you
have extracted Plupload repo and run: `node bootstrap`. All dependencies will be downloaded and installed 
automatically. Bootstrap will also try to populate `src/moxie/` folder with the actual mOxie source, as 
Plupload includes it as a sub-module and doesn't contain the source. You should have 
[git](http://git-scm.com/) installed on your system for this operation to succeed. If you don't have one 
and you still require the source, you will need to manually download it from 
[the repository](https://github.com/moxiecode/moxie) and extract to the above folder.

*Note:* Currently, for an unknown reason, locally installed Node.js modules on Windows, may not be automatically 
added to the system PATH. So, if `jake` commands below are not recognized you will need to add them manually:

```
set PATH=%PATH%;%CD%\node_modules\.bin\
``` 

<a name="support" />
### Support

We are actively standing behind the Plupload and now that we are done with major rewrites and refactoring,
the only real goal that we have ahead is making it as reliable and bulletproof as possible. We are open to 
all the suggestions and feature requests. We ask you to file bug reports if you encounter any. We may not 
react to them instantly, but we constantly bear them in my mind as we extend the code base.

In addition to dedicated support for those who dare to buy our OEM licenses, we got 
[discussion boards](http://www.plupload.com/punbb/index.php), which is like an enormous FAQ, 
covering every possible application case. Of course, you are welcome to file a bug report or feature request, 
here on [GitHub](https://github.com/moxiecode/plupload/issues).

<a name="contribute" />
### Contributing

We are open to suggestions and code revisions, however there are some rules and limitations that you might 
want to consider first.

* Code that you contribute will automatically be licensed under the LGPL, but will not be limited to LGPL.
* Although all contributors will get the credit for their work, copyright notices will be changed to [Moxiecode Systems AB](http://www.moxiecode.com/).
* Third party code will be reviewed, tested and possibly modified before being released.

These basic rules help us earn a living and ensure that code remains Open Source and compatible with LGPL license. All contributions will be added to the changelog and appear in every release and on the site. 

You can read more about how to contribute at: [http://www.plupload.com/contributing](http://www.plupload.com/contributing)

Plupload is a cross-browser multi-runtime file uploading API. Basically a set of tools that will help you to build reliable and visually appealing file uploader in minutes.

Historically Plupload comes from dark and hostile age of no HTML5, hence all the alternative fallbacks, like Flash, Silverlight and Java (still in development). It is meant to provide you with an API, that will work anywhere and in any case, in one way or another. But while having very solid fallbacks, Plupload is fully oriented onto a nice and bright future of HTML5.

## Table of Contents
* [Backstory](#backstory)
* [Structure](#structure)
* [Support](#support)
* [Contributing](#contribute)
* [Contact us](http://www.moxiecode.com/contact.php)

<a name="backstory" />
### Backstory

Plupload has started in times, when uploading a file in responsive and customizable manner was real pain. Internally browsers had only `input[type="file"]` element, that was ugly and clunky at the same time. One couldn't even change it's visuals, without hiding it and coding another one on top of it from scratch. And then there was no progress indication for upload process... Sounds pretty crazy today.

It was very logical that developers started to look for alternatives and writing their own implementations, using Flash and Java, in order to somehow extend limited browser capabilities. And so did, in a search for reliable and flexible file uploader for our [TinyMCE](http://www.tinymce.com/index.php)'s [MCImageManager](http://www.tinymce.com/enterprise/mcimagemanager.php). Quickly enough though, Plupload grew up so big, that easily split into a standalone project. With major *version 2.0* it underwent another huge reconstruction, basically [from the ground up](http://blog.moxiecode.com/2012/11/28/first-public-beta-plupload-2/), as all the low-level runtime logic has been extracted into separate [File API](http://www.w3.org/TR/FileAPI/) and [XHR L2](http://www.w3.org/TR/XMLHttpRequest/) pollyfills (currently known under combined name of [mOxie](https://github.com/moxiecode/moxie)), giving Plupload a chance to evolve further.

<a name="structure" />
### Structure

Currently Plupload may be considered as consisting of three parts: low-level pollyfills, Plupload API and Widgets (UI and Queue). Initially Widgets were meant to only serve as examples to the API, but quickly formed into fully-functional API implementations that now come bundled with the Plupload API. This has been a source for multiple misconceptions about the API as Widgets were easily mistaken for the Plupload itself, while they are only implementations. Such as any of you can build by yourself out of the API.

* [Low-level pollyfills (mOxie)](https://github.com/moxiecode/moxie) - have their own [code base](https://github.com/moxiecode/moxie) and [documentation](https://github.com/moxiecode/moxie/wiki) on GitHub.
* [[Plupload API|API]]
* [UI Widget]()
* [Queue Widget]()

<a name="support" />
### Support

We are actively standing behind the Plupload and now that we are done with major rewrites and refactoring, the only real goal that we have ahead is making it as reliable and bulletproof as possible. We are open to all the suggestions and feature requests. We ask you to file the bug reports, if you encounter any. We may not react to them instantly, but we constantly bear them in my mind as we extend the code base.

In addition to dedicated support for those who dare to buy our OEM licenses, we got [discussion boards](http://www.plupload.com/punbb/index.php), that basically can be considered as an enormous FAQ, covering every possible application case. And of course you are welcome to file a bug report or feature request, here on [GitHub](https://github.com/moxiecode/plupload/issues).

<a name="contribute" />
### Contributing

We are open to suggestions and code revisions, however there are some rules and limitations that you might want to consider first.

* Code that you contribute will automatically be licensed under the LGPL, but will not be limited to LGPL.
* Although all contributors will get the credit for their work, copyright notices will be changed to [Moxiecode Systems AB](http://www.moxiecode.com/).
* Third party code will be reviewed, tested and possibly modified before being released.

These basic rules help us earn for the living and ensure that code remains Open Source and compatible with LGPL license. All contributions will be added to the changelog and appear in every release and on the site. 

You can read more about how to contribute to this project at [http://www.plupload.com/contributing](http://www.plupload.com/contributing)

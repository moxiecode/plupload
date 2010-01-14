Plupload - Cross browser and platform uploader API
===================================================

What is Plupload
-----------------
Plupload is a JavaScript API for dealing with file uploads it supports features like multiple file selection, file type filtering,
request chunking, client side image scaling and it uses different runtimes to achieve this such as HTML 5, Silverlight, Flash, Gears and BrowserPlus.

What you need to build Plupload
-------------------------------
* Install the Java JDK or JRE packages you can find it at: [http://java.sun.com/javase/downloads/index.jsp](http://java.sun.com/javase/downloads/index.jsp)
* Install Apache Ant you can find it at: [http://ant.apache.org/](http://ant.apache.org/)
* Add Apache Ant to your systems path environment variable, this is not required but makes it easier to issue commands to Ant without having to type the full path for it.

How to build Plupload
----------------------

In the root directory of Plupload where the build.xml file is you can run ant against different targets.

`ant`

Will combine, preprocess and minify the Plupload classes into the js directory. It will not build the Silverlight and Flash .xap and .swf files.

`ant moxiedoc`

Will generate API Documentation for the project using the Moxiedoc tool. The docs will be generated to the docs/api directory.

`ant release`

Will produce release packages. The release packages will be placed in the tmp directory.

Contributing to the Plupload project
-------------------------------------
You can read more about how to contribute to this project at [http://www.plupload.com/contributing](http://www.plupload.com/contributing)

# CI Scripts

These scripts are made to be ran by Jenkins. They generate code coverage in HTML
and LCOV, lint result HTML, and test result XML. The results of these scripts are
meant to be integrated with reporting provided by Jenkins.

While these scripts can be ran by anyone, even outside Jenkins, they are made to be
ran inside Yahoo!'s private Jenkins system, which is why certain variables are used.

Yeti also uses the public [Travis](http://travis-ci.org) CI for testing public
pull requests. Travis does not use these scripts. See the `.travis.yml` file
and `npm help test` to understand what runs on Travis.

#!/bin/sh
DIR="$( cd "$( dirname "$0" )" && pwd )"
node $DIR/../node_modules/.bin/jshint $@

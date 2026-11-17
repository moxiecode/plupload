#!/bin/sh
if [ -x "`dirname "$0"`/node.exe" ]; then
  "`dirname "$0"`/node.exe" "`dirname "$0"`/node_modules/.bin/jake" "$@"
else
  node "`dirname "$0"`/node_modules/.bin/jake" "$@"
fi

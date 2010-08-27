#!/bin/sh

if [ -z "$FLEX_HOME" ]; then
  FLEX_HOME=/opt/flex/flex
fi

export FLEX_HOME

$FLEX_HOME/bin/mxmlc \
	-compiler.source-path src \
	-compiler.optimize \
	-compiler.use-resource-bundle-metadata \
	-compiler.show-actionscript-warnings \
	-compiler.show-binding-warnings \
	-compiler.show-unused-type-selector-warnings \
	-compiler.strict \
	-compiler.accessible=false \
	-use-network \
	-static-link-runtime-shared-libraries \
	-output ../../../js/plupload.flash.swf \
	src/com/plupload/Plupload.as

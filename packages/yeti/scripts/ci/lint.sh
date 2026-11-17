#!/bin/sh
SRC_DIR=${SRC_DIR:-.}
LINT_OUTPUT_DIR=${LINT_OUTPUT_DIR:-tmp}
cd ${SRC_DIR}
make lint | sed '1,2d' | \
    ./node_modules/.bin/ronn -5 | \
    sed -e 's/p>/pre>/g' > ${LINT_OUTPUT_DIR}/jslint.html

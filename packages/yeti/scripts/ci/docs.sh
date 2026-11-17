#!/bin/sh
SRC_DIR=${SRC_DIR:-.}
DOCS_DIR=${DOCS_DIR:-tmp}
cd ${SRC_DIR}
make html-api html
mv build_docs/* ${DOCS_DIR}

#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

die () {
    echo "$@"
    printf "\nusage: %s [arguments-to-yeti]" $0
    exit 1
} >&2

try () {
    hash npm 2>&- || die "Could not find npm."
    npm i $1 || die "Unable to install Node.js module $1"
}

RAMPANT="$DIR/../node_modules/.bin/rampant"

[ -x "$RAMPANT" ] || try rampant

"$RAMPANT" "$DIR/../cli.js" $@

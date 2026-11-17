#!/bin/bash

die () {
    filenames=($(ls -F scripts | grep '*' | sed -e 's/.sh\*//'))
    scripts=$(printf '\t%s\n' "${filenames[@]}")
    echo >&2 "$@\n\n\
usage: $0 script-name [args ...]\n\n\
Available scripts:\n$scripts"
    exit 1
}

[ $# -lt 1 ] && die "No script specified."

script=./scripts/$1.sh

[ -x $script ] || die "Could not execute: $script"

shift 1
$script $@

# Fork notes

Inlined from [jayarjo/amdlc](https://github.com/jayarjo/amdlc) `master` @ `3c20a41` (previously `https://github.com/jayarjo/amdlc/tarball/master`).

That repo forks [spocke/amdlc](https://github.com/spocke/amdlc). It branched from upstream at `60a33dd` (2014-11-27, "Bumped version number includes moduleOverrides fix."). At import, the fork was 8 commits ahead of upstream and 9 behind.

## Changes vs upstream (by Davit Barbakadze, 2015)

- `5ce0815` Initialize the default reporter right away, so calling individual methods on their own doesn't hit an undefined error.
- `b044e4e` `utils.extend()` supports nested objects and arrays.
- `9a1c7ed` Expose all available options; hide compile methods that aren't needed; cleanup.
- `f1b6ba2` Coverage output no longer requires options.
- `beab6dd` Add `defined()` to check whether a given module was included.
- `6f9d43b` Fix the output line when compiling the coverage version.
- `ec986a9` Export `defined()` from the dev loader.
- `3c20a41` `parseModule()` reports which file the error was found in.

Files touched: `lib/AmdCompiler.js`, `lib/AmdDevLoader.js`, `lib/Utils.js`.

## Changes made when inlining

- `package.json`: removed `devDependencies`, added `"private": true`.

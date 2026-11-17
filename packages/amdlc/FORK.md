# amdlc (inlined fork)

- Source: https://github.com/jayarjo/amdlc @ `3c20a41` (2015-10-20)
- Fork of: https://github.com/spocke/amdlc, branched at `60a33dd` (2014-11-27, "Bumped version number includes moduleOverrides fix.")
- Upstream has 9 later commits that are not included here.

## Fork changes vs upstream

8 commits by Davit Barbakadze (2015-05 → 2015-10), touching `lib/AmdCompiler.js`, `lib/AmdDevLoader.js`, `lib/Utils.js`:

- `defined()` helper to check whether a module was included in the build, exported from the dev loader too (`beab6dd`, `ec986a9`)
- Expose all compiler options; hide internal compile methods; cleanup (`9a1c7ed`)
- `utils.extend()` deep merge of nested objects and arrays (`b044e4e`)
- Coverage build: options not required; fixed output line (`f1b6ba2`, `6f9d43b`)
- Default reporter initialized immediately so individual methods can be called on their own (`5ce0815`)
- `parseModule()` errors include the file that failed (`3c20a41`)

## Monorepo changes

None. Code is identical to the fork.

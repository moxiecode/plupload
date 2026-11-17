# yeti (inlined fork)

- Source: https://github.com/jayarjo/yeti @ `18a6665` (2013-05-10)
- Fork of: https://github.com/yui/yeti, branched at `3cb6bda` (2013-05-09, "Add tests for WebDriver desiredCapabilities.")
- Upstream has 156 later commits that are not included here.

## Fork changes vs upstream

One commit, `18a6665` "Wait until QUnit is loaded, before checking for it in inject.js." In `lib/hub/view/public/inject.js`, the `QUnit.config.autostart = false` check is deferred to `window.onload`, so it still applies when QUnit loads after the injected script.

## Monorepo changes

- `package.json`: version `0.2.23pre` → `0.2.23-pre` (npm rejects the original as invalid semver)
- `package.json`: removed `devDependencies` (yeti's own test tooling, including GitHub tarball deps `istanbul` and `mocks`)

## Notes

- Supports Node `~0.8.0 || ~0.10.0` only. Requiring it on modern Node throws in `lib/hub/http/listener.js`.
- The `postinstall` script runs `scripts/fetch_deps.js`, which downloads QUnit/YUI/etc. into `dep/` from legacy URLs.

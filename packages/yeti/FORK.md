# Fork notes

Inlined from [jayarjo/yeti](https://github.com/jayarjo/yeti) `master` @ `18a6665` (previously `https://github.com/jayarjo/yeti/tarball/master`, pulled in through bunyip).

That repo forks [yui/yeti](https://github.com/yui/yeti). It branched from upstream at `3cb6bda` (2013-05-10, "Add tests for WebDriver desiredCapabilities."). At import, the fork was 1 commit ahead of upstream and 156 behind.

## Changes vs upstream

- `18a6665` (Davit Barbakadze, 2013-05-10) Wait until QUnit has loaded before checking for it in `lib/hub/view/public/inject.js`. The `QUnit.config.autostart = false` assignment is now wrapped in `window.onload`.

## Changes made when inlining

- `package.json`: removed `devDependencies` (they included git tarball deps), added `"private": true`.
- `package.json`: changed `version` from `0.2.23pre` to `0.2.23-pre`, because npm rejects the original as invalid semver.
- The `postinstall` script is unchanged. It still downloads test framework files from the network.
- This package's own `.gitignore` excludes `scripts/coverage.sh` and `scripts/ci/coverage.sh`, so git doesn't track them.

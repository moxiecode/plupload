# Fork notes

Inlined from [jayarjo/bunyip](https://github.com/jayarjo/bunyip) `master` @ `f7e0acf` (previously `https://github.com/jayarjo/bunyip/tarball/master`).

That repo forks [ryanseddon/bunyip](https://github.com/ryanseddon/bunyip). It branched from upstream at `0100694` (2012-06-09, "Remove switch statement and simplify the platform helper keywords"). At import, the fork was 129 commits ahead of upstream and 28 behind. In practice it's a rewrite, almost all by Davit Barbakadze between 2012 and 2014. Full list: https://github.com/ryanseddon/bunyip/compare/master...jayarjo:bunyip:master

## Changes vs upstream (summary)

- **Config**: JSON/JS config file (`config.js`) with farm-specific sections, replacing `lib/config-template.js`. Options in `lib/options.js` were reworked and long options are camel-cased.
- **Agent farms**: new `lib/farm.js` (an `AgentFarm` base class that is an `EventEmitter`), with `lib/browserstack.js` and `lib/saucelabs.js` built on it. Tunnel and tunnelier handling moved into the farms, replacing `lib/helpers.js` and `lib/tunnel.js`. The fork dropped the `browserstack` npm dependency. It briefly added TestSwarm and PageKite support (2012), then removed both (2013-05).
- **Yeti integration**: new `lib/yeti.js` with promise-based launching. Tests start automatically once all requested agents connect. `79d543a` switched the dependency to the jayarjo/yeti fork, which has the QUnit load fix.
- **New helpers**: `lib/agent.js`, `lib/collection.js`, `lib/color.js`, `lib/download.js` (fetches the tunnelier zip into `tools/`), `lib/ip.js` (checks for private ranges and localhost), `lib/util.js`.
- **CLI/entry**: `main()` is the package entry. It accepts a completion callback and exits with a matching status code. Adds a silent mode.
- **Tests**: switched to mocha, chai and sinon (`test/`). Adds `.jshintrc`.

## Changes made when inlining

- `package.json`: removed `devDependencies`, added `"private": true`.
- `package.json`: the `yeti` dependency changed from `https://github.com/jayarjo/yeti/tarball/master` to the inlined workspace `0.2.23-pre`.
- `tools/` is empty apart from its `.gitignore`. bunyip downloads the tunnelier there at runtime.

# bunyip (inlined fork)

- Source: https://github.com/jayarjo/bunyip @ `f7e0acf` (2014-05-26)
- Fork of: https://github.com/ryanseddon/bunyip, branched at `0100694` (2012-06-09, "Remove switch statement and simplify the platform helper keywords")
- Upstream has 28 later commits that are not included here.

## Fork changes vs upstream

About 115 commits by Davit Barbakadze (2012-06 → 2014-05). This is effectively a rewrite (26 files, +2684/−328). Summary:

- **2012-06/07: config + TestSwarm**: config switched to JSON (`config.json`) with custom-config option; BrowserStack and tunnel logic consolidated; TestSwarm support (detailed reports, reconnecting and reusing workers); tunnels kept across sessions with list/kill commands.
- **2013-05: farm rewrite**: TestSwarm and PageKite dropped (`dadda81`); new config/options layer; agent requesting refactored into "farms" with SauceLabs support (`3f52aec`) and reactivated BrowserStack (`4f9366d`), including tunnelier download and launch; private-IP/localhost detection module; file downloader module; silent mode; entry point changed to `main()`; Yeti launching rewritten with promises; testing starts automatically once all requested agents connect.
- **2014-05: agents + tests**: `Agent` wrapper and `Collection` classes; `AgentFarm` is an EventEmitter with `go()`/`resolveAgents()`/`getPendingAgent()`; SauceLabs API renamed (`requestAgents`, `closeAgent`, `shutDown`, public `launchTunnelier`); configurable agent timeout; exits with a proper code on tester or farm failure; `main()` takes an exit callback; tests switched to mocha + chai + sinon; tunnelier zip stored on a sled-owned server.
- **Yeti fork dependency**: `yeti` points to `jayarjo/yeti` for its QUnit fix (`79d543a`; see `../yeti/FORK.md`).

Full list: `git log 0100694..f7e0acf` in the fork repo.

## Monorepo changes

- `package.json`: `yeti` dependency `https://github.com/jayarjo/yeti/tarball/master` → `0.2.23-pre` (the inlined workspace package)
- `package.json`: removed `devDependencies` (mocha, sinon, chai, grunt, mockery…)

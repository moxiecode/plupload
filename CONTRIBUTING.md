# Contributing

## Repository layout

This is an npm workspaces monorepo:

| Path | What |
|---|---|
| `packages/plupload` | The `plupload` npm package: sources (`src/`), i18n sources (`src/i18n/`), examples, tests and the Jakefile build. |
| `packages/moxie` | mOxie (private, not published separately). Its prebuilt `bin/` is used by the plupload build. |
| `js/` | Committed build output, used by bower and composer consumers. Do not edit by hand. |
| `scripts/` | Build/pack helpers. |

## Setup

```sh
npm install
```

The root `.npmrc` sets `ignore-scripts=true`, since a legacy test dependency (`yeti` via `bunyip`) has a broken install script.

## Building

```sh
npm run build
```

This builds `packages/plupload/js/` (gitignored) and mirrors it to the committed root `js/`.

Translations are edited in `packages/plupload/src/i18n/` and copied into `js/i18n/` by the build.

## Publishing a new version

Publishing is done by hand. You need publish rights for `plupload` on npm (`npm login`).

1. Bump `version` and `releaseDate` in `packages/plupload/package.json`.
2. Build:
   ```sh
   npm run build
   ```
3. Review and commit the rebuilt root `js/` together with the version bump:
   ```sh
   git commit -am "vX.Y.Z"
   ```
4. Tag the release:
   ```sh
   git tag vX.Y.Z
   git push origin master vX.Y.Z
   ```
5. Check the tarball contents and publish:
   ```sh
   npm pack --dry-run -w packages/plupload --ignore-scripts=false
   npm run release
   ```

`npm run release` first verifies that the tarball file list matches `scripts/npm-files.txt`, then runs `npm publish`.

6. Create the GitHub release from the tag:
   ```sh
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "<what changed>"
   ```
   Or use the GitHub UI: Releases → Draft a new release, pick the `vX.Y.Z` tag, add notes and publish.

   GitHub attaches the source zip and tarball automatically. Thanks to the `export-ignore` rules in `.gitattributes`, these only contain `js/`, `readme.md`, `license.txt`, `SECURITY.md` and `bower.json`.

### How the tarball is assembled

The npm package keeps the same structure as the pre-monorepo releases. Before packing, `scripts/prepack.js` copies these into `packages/plupload` (all gitignored there):

- the root files `bower.json`, `composer.json`, `license.txt`, `readme.md`, `SECURITY.md`, `.jshintrc`, `.gitattributes`
- `packages/moxie` as `src/moxie`, without the files that were never published

`scripts/postpack.js` removes them again.

Because `ignore-scripts=true` is set, these hooks only run when `--ignore-scripts=false` is passed. Always publish with `npm run release`, never with a bare `npm publish`, or the tarball will be missing `src/moxie` and the root files.

If you intentionally change which files are published, update `scripts/npm-files.txt`.

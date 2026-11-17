# Contributing

## Repository layout

This is an npm workspaces monorepo:

| Path | What |
|---|---|
| `packages/plupload` | Plupload sources (`src/`), i18n sources (`src/i18n/`), tests, the PHP upload handler example (`examples/handler-php/`) and the Jakefile build. |
| `packages/moxie` | mOxie (private, not published). Its prebuilt `bin/` is used by the plupload build. |
| `js/` | Committed build output, shipped in the release archive and used by bower and composer consumers. Do not edit by hand. |
| `examples/` | Examples shipped in the release archive. They load the root `js/`. |
| `scripts/` | Build and release helpers. |

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

## Releasing a new version

Plupload 3.x is released as a GitHub release archive (a `git archive` of the tag), not on npm.
What goes into the archive is controlled by the `export-ignore` rules in `.gitattributes`.

1. Bump `version` and `releaseDate` in `packages/plupload/package.json`.
2. Build:
   ```sh
   npm run build
   ```
3. Stage the rebuilt root `js/` together with the version bump and check the archive contents against the previous release:
   ```sh
   git add -A
   npm run check-archive
   ```
   This downloads the source archive of the latest `v3.*` tag from GitHub and compares it with a `git archive` of what is staged.
   Only the files you expect to change (typically the rebuilt `js/plupload*.js`) should be listed. A diff is printed for each changed file (long minified lines are split for readability); add `--quiet` to only list the file names.
   To compare against a specific release, pass a tag or a local tarball: `npm run check-archive -- v3.1.4` or `npm run check-archive -- path/to/v3.1.5.tar.gz`.
4. Commit and tag the release:
   ```sh
   git commit -m "vX.Y.Z"
   git tag vX.Y.Z
   git push origin 3.x vX.Y.Z
   ```
5. Create the GitHub release for the tag (see below).

### Creating the GitHub release

The release download is the source archive GitHub generates for the tag (`Source code (zip)` / `Source code (tar.gz)`).
GitHub builds it with `git archive`, so its contents are the files committed at the tag minus the `export-ignore` paths in `.gitattributes`.
Nothing needs to be uploaded.

With the GitHub CLI:

```sh
gh release create vX.Y.Z --repo moxiecode/plupload --verify-tag --latest \
  --title "vX.Y.Z" --notes "Short summary of the changes"
```

- `--verify-tag` makes sure the tag you pushed in step 4 is used, instead of GitHub creating a new tag.
- `--latest` marks this release as the latest Plupload release on GitHub.

Or in the browser:

1. Open https://github.com/moxiecode/plupload/releases/new.
2. Under **Choose a tag**, select the existing `vX.Y.Z` tag.
3. Set the title to `vX.Y.Z` and describe the changes.
4. Make sure **Set as the latest release** is ticked.
5. Click **Publish release**.

Afterwards, check that the published archive is exactly the tagged tree:

```sh
npm run check-archive -- vX.Y.Z vX.Y.Z
```

The first argument downloads the release archive of `vX.Y.Z` from GitHub, the second compares it with a `git archive` of the same tag. It should report no differences.

# Contributing

## Add an entry

1. Pick the section matching what the project does. Create a unique kebab-case entry directory; IDs must be unique across all sections.

   | Section | Record path | Purpose |
   |---|---|---|
   | Mods | `data/mods/<id>/mod.yaml` | Extend the stock workflow, including add-ons |
   | Apps | `data/apps/<id>/app.yaml` | Separate music apps with their own workflow |
   | Games | `data/games/<id>/game.yaml` | Games and game runtimes |
   | Tools | `data/tools/<id>/tool.yaml` | Launchers, converters, emulators and companion tools |
   | Guides | `data/guides/<id>/guide.yaml` | Handbooks, references and modding instructions |
   | Developers | `data/dev/<id>/dev.yaml` | SDKs, libraries and platform sources |

2. Add the YAML record. The folder supplies `id` and `section`; omit both from YAML. Do not add the old `category` field.

   ```yaml
   name: My Project
   description: A concise description of what the project does and where it runs.
   repo: owner/repository
   author: owner
   tags: [sequencer, midi]
   install: sd-card
   ```

   A public GitHub `repo` is preferred — it powers stars, README, and releases on the detail page. Optional fields include `requires` (entry IDs from any section), `firmware`, `website`, and `status` (`stable`, `beta`, `experimental`, `archived`, `concept`). State firmware compatibility only when the project documents it. GitHub stars/releases/activity are enriched automatically when `repo` is set.

   For paid or closed releases that are not on GitHub, omit `repo` and set `website` instead (required without a repo). Set `author_url` for a maker's website or profile. GitHub enrichment and star-list matching skip entries without `repo`.

   Use `price: free`, `paid`, or `pay-what-you-want`; omitted prices default to `free`. Optional `price_note` adds a short clarification such as `Suggested €9.99` (up to 160 characters). Use `source: open` or `closed`; the default is `open` with a repository and `closed` without one. Set it explicitly when the repository hosts only downloads or documentation for closed-source software. These labels describe access to the project; its licence may have additional conditions.

   Add documented quick facts: `runs_on: [device]` (`device`, `desktop`, `browser`, `docs`) and `audience: [musician]` (`musician`, `player`, `developer`, `curious`). Installation choices are `sd-card`, `boot-thingy`, `web-installer`, `ssh`, `desktop`, `usb-midi`, and `none`. Describe the primary installation route; a browser installer does not mean the installed project runs in a browser. Leave uncertain facts out.

3. Put optional media beside the YAML, credit its upstream source in `data/media-sources.json`, then run `npm test` and `npm run build` before opening a pull request.

## Add images

| Entry-relative path | Purpose |
|---|---|
| `logo.svg` (or `.png`, `.webp`, `.jpg`, `.jpeg`, `.gif`) | Project logo |
| `screenshots/01-splash.png` | Screenshots or photos, sorted by filename; first image becomes the card image |

For example, an app's image belongs at `data/apps/<id>/screenshots/01-splash.png`. Screenshots support PNG, WebP, JPEG and GIF. Prefer files at or below **500 KB**; validation warns for larger files. Media directories without the correct YAML record, duplicate IDs, unknown sections and incorrect record filenames fail validation.

The media-source `file` value stays relative to the entry directory, such as `screenshots/01-splash.png`; retain `source`, `repo` and any existing notes. Use media you have permission to publish and preserve applicable notices.

`scripts/build-data.js` copies source images into generated `static/media/<id>/` and writes those URLs into the public catalog. Do not edit or commit generated media, `src/lib/data.json`, `src/lib/server/details.json` or `static/catalog.json`. The originals remain beside the YAML.

MPC Sample screen captures (320x240, or similar 4:3 images) and device photos are both supported. Existing entry IDs and dependency references should remain unchanged when moving an entry between sections.

## Refreshed project content

Run `npm run enrich` with `GITHUB_TOKEN` set to refresh `data/github.json` and the committed raw Markdown caches in `data/readme/<id>.md`. The daily enrichment workflow commits both. Unchanged content is not rewritten; API failures preserve the previous snapshot. Do not edit the README caches manually.

The cache records the default branch and README path, the latest three release descriptions (up to 12,000 characters each), contributors, open issues and last default-branch commit date. The GitHub open-issue counter includes pull requests. Contributors include anonymous contributors where GitHub reports them; GitHub may cache the count.

Builds sanitize README/release Markdown, resolve relative links and images against the source repository, remove badges and matching duplicate titles, and keep full content in server-only detail data. Only canonical detail pages receive rich content; redirect pages return just an ID and canonical URL. The public catalog and homepage import contain summaries and quick facts only. Dependency cards receive only referenced entries' IDs, sections, names and thumbnail paths. A release's `truncated` flag links readers back to its full GitHub page; empty or absent READMEs produce empty HTML.

## Entries from the star list

The daily star-list workflow opens one `star-list` pull request per missing repository on `auto/add-<id>`. It guesses a section from repository metadata, then README keywords, and adds a draft YAML record for review. It skips IDs already used in any section and existing open PRs. Each candidate runs `npm test`; a failure produces a draft PR with the error log. Existing remote files are preserved on retries. The tracking issue links to the PRs and closes once every starred repository is in the catalog.

Review the guessed section and description, and add a screenshot when available, before merging. Automation writes only `auto/add-*` branches and never updates `main` directly. In **Settings > Actions > General > Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests**. The workflow needs contents, pull-requests and issues write permissions; `STAR_LIST_TOKEN` remains an optional separate token for reading the list.

Preview locally with `node scripts/check-star-list.js --dry-run` (uses the local `gh` login when no token is set). Dry run prints proposed YAML and PR bodies without changing files, branches, PRs or issues. Section guesses and descriptions are starting points, not verified project research.

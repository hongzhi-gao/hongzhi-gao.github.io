# Hongzhi Gao · Engineering Atlas

The portfolio opens two source maps. The IoTDB and TsFile map shows client access, ConfigNode, query execution, persistence, IoTConsensus V1 and Pipe. Mooncake separates placement metadata from direct payload transfers and marks the pinned synchronous object-replica proposal. Select a node to find source files and mapped contributions. Use the path buttons to follow illustrative traffic.

## Local development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
npm run check
npm test
npm run evidence
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run evidence` fetches commit-pinned raw public files. `CHROMIUM_PATH` can select an existing Chromium binary for the browser suite. For serving the static output, run `npm run preview` after `npm run build`. Search indexes the published article bodies at build time.

## Add a project or exhibit

1. Register the public repository and relevant paths in `config/projects.json`. Use `modulePaths` for the best-supported source-path mappings.
2. Register metadata, source links pinned to commits and verified contribution records in `projects/`. Existing article embeds and archived exhibit URLs use this data.
3. Write the project drawing in `architecture/`. Define nested process and subsystem boundaries, nodes, source IDs, routed edges, illustrative paths and contribution-to-node mappings. `src/structure/data.ts` validates both registrations together at build time.
4. Reuse the engineering glyphs in `StructureGlyph.astro` or draw a structure-specific inset in `ArchitectureDrawing.astro`. The portfolio preview uses the same drawing.
5. Run source validation, build and browser checks. Inspect the map at fit and detail scales, and confirm that the same contribution selection works in both directions.

## Scheduled evolution and publishing

GitHub Pages uses the Actions publishing source. The verification workflow builds the site on PRs, pushes to `main`, and manual runs. A push to `main` publishes the verified static artifact. The evolution workflow runs daily at 02:23 UTC and supports manual dry runs. Both use a common publication concurrency group.

The deterministic sync stores per-repository checkpoints and public records in `config/discovery.json`. The first scan is bounded by the configured lookback. Later scans compare upstream commit SHAs and use overlapping updated-time windows to capture late-indexed activity. The overlap is deduplicated by stable keys. Architecture candidates are queued with immutable inputs. When scan coverage is incomplete, the run stops or surfaces a review candidate. Source-path matches indicate areas touched by an activity and do not establish ownership.

- `config/automation.json` controls the scan switch, minimum interval, lookback, candidate count, byte and token budgets, timeout, model, and whether routine semantic changes can publish directly.
- The daily workflow uses the repository-scoped GitHub token. For local public scans, run `GH_TOKEN="$(gh auth token)" npm run sync -- --dry-run`. The HTTP client honors proxy environment variables.
- To enable unattended architecture analysis, set the repository Actions secret `OPENAI_API_KEY`. The optional Actions variable `ARCHITECTURE_MODEL` overrides the configured model. The API receives only bounded excerpts from registered public repositories. It has no tool or shell access.
- Locally installed and authenticated Codex can run `npm run analyze -- --codex --review --dry-run`. Use `--candidate path/to/candidate.json` to rerun one immutable candidate. Model output is schema-checked and the application constructs the permitted IR edits.
- Deterministic contributions publish after validation and browser checks. Architecture changes route to a draft PR by default. When routine publishing is enabled, conservative source-path risk and model decisions still route consensus, recovery, storage lifecycle and uncertain changes for review. With the Actions secret absent, the review workflow opens a public evidence list without generated architecture. GitHub may require a maintainer to approve the normal PR workflow created by the repository token. The automation job separately runs verification before opening that draft.
- If a scan or validation fails, the verified branch retains its previous checkpoint. Rerun the failed workflow. If Pages fails after the update commit, rerun the Pages deployment or dispatch the Pages workflow on `main`. To roll back, revert the relevant verified commit using normal Git history and run the Pages workflow on `main`.

See [verification records](VERIFICATION.md) for executed checks and scope.

## Gaming Worlds

The order of `data/gaming/gallery.json` sets the gallery order and the first scene supplies the hero. Add each scene with a unique ID, game, title, short visual description, image URL or path, official source page, copyright credit and the image's intrinsic width-to-height ratio. An optional `preview` URL or path supplies a smaller grid image while the lightbox uses the full resolution.

For images cleared for local hosting, place the files in `public/images/gaming/` and use a path such as `/images/gaming/scene.webp`. The initial collection embeds official publisher-hosted screenshots and links to the original pages. The build uses the catalog without fetching images. An unavailable image falls back to a local placeholder, keeps its source link and logs the scene ID and failing URL in the browser console.

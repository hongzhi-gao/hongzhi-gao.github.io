# Hongzhi Gao · Engineering Atlas

An interactive site for exploring Apache IoTDB, Apache TsFile and Mooncake Store from project architecture down to public source and tests. Exhibits distinguish upstream behavior, teaching examples, historical snapshots and open proposals. The Mooncake replica integration in PR #5494 is an open proposal in its pinned snapshot. Its object I/O and durable recovery prerequisites each have a separate merged exhibit.

The homepage is the workbench. Pick one of the three IoTDB modules or switch the Mooncake replica scenario in place. Each project has a direct GitHub PR list. Individual exhibits and notes keep their own permalinks.

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

1. Add a public repository and relevant path prefixes to `config/projects.json`. Use `modulePaths` to map the most specific repository paths to a module ID.
2. Add one file under `projects/` using the versioned Zod schema in `src/architecture-ir/schema.ts`. The existing project files define project metadata, modules, component identities, containment, relationships, states, a deterministic timeline, camera keyframes and source evidence.
3. Pin GitHub file references to full commit SHAs. Keep attribution in the contribution records and link the official PR. Use distinct version records for the historical baseline and the reviewed change.
4. Reuse component kinds and timeline events before extending the shared WebGL models. Renderers use the same replay state in 2D and 3D. Set `initialPosition` when a component should expand from a compact arrangement.
5. Run the checks and compare the first, middle and last steps. Add a Markdown or MDX note under `src/content/posts/` when extra context warrants it. An MDX post can import `Embed.astro` and pass a scenario ID to reuse its IR. The blog supports heading navigation, tags, categories, math, Mermaid, static SVG and full-text search.

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

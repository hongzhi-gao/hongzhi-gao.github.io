# Verification

## Local checks

| Check | Result |
| --- | --- |
| `npm run check` | Zero errors, warnings and hints on Node 24. |
| `npm test` | Three tests passed for intact IR, broken references, deterministic seeking and incremental merge deduplication. |
| `npm run evidence` | All 58 public raw files and cited line ranges resolved at their pinned revisions. |
| `npm run build` | Astro static build and Pagefind index succeeded, including four published technical articles. |
| `CHROMIUM_PATH=… npm run test:e2e` | All ten Chromium checks passed, covering core routes, replay controls, drill-down, browser back, distinct WebGL frames, collision-free TsFile labels, history switching, 320px layout, RSS, full-text body search, Mermaid, math, shared transitions and the WebGL-unavailable fallback. |
| `GH_TOKEN="$(gh auth token)" npm run sync -- --dry-run` | Real public GitHub bootstrap discovered 182 records and 13 queued candidates on this run. No tracked data was written. |
| `npm audit --omit=dev --audit-level=high` | No high or critical production advisories after upgrading Astro and Zod. Four low advisories were reported in the transitive math renderer. |

## Browser evidence

The implementation team's Chromium screenshots are under `../architecture-lab-evidence/implementation/`. The independent browser audit and inspected keyframes are under `../architecture-lab-evidence/reviewed-frames/`. Desktop and mobile use real Chromium. The desktop run uses software WebGL. The visual evidence does not establish GPU performance for other machines.

## Update rehearsal

The independent run replayed Mooncake PR #5310, a high-risk recovery record change. The real authenticated Codex model generated a schema-valid seven-event proposal. A separate checkout replayed sync, candidate generation, validation and the production build. The generated exhibit returned HTTP 200 and a repeated run preserved the same data hashes. The initial hand-curated production catalog excludes the rehearsal-generated duplicate.

The GitHub Actions hosted model stage depends on the repository's `OPENAI_API_KEY` secret. The deterministic GitHub synchronization, build, browser checks, low-risk publishing and evidence-only review have independent paths.

## Single-page workbench

The final workbench passes its 390px layout and keyboard/tab switching tests, along with in-place Mooncake comparison, scenario reload and direct PR link tests. A real Chromium run completed twenty module switches with one canvas mounted per project and no WebGL context warnings. Playback is before the stage in visual and keyboard order. Workbench screenshots are under `../architecture-lab-evidence/workbench/`.

## Obsidian and holographic redesign

The production checks cover the portfolio, both project pages, fixed source links, contributor hover and selection, path highlighting, wheel zoom, drag, fit, fullscreen, 390px touch pinch, the contribution drawer, notes search and RSS. The source-map audit inspected 1440×900, 1920×1080, 2560×1440 and 390×844 in Chromium. Browser artifacts are kept outside the checkout under `../architecture-lab-evidence/redesign/`. The canvas trail and responsive topology capture are under `../architecture-lab-evidence/holographic/`.

The source verification includes the current pinned Mooncake #5494 proposal and its bounded orphan reclamation, with upstream and proposal revisions labeled separately. The two drawings' routed edges were checked against unrelated node interiors. Geometry and source-reference checks do not establish every upstream runtime behavior. The 2560px local headless rendering sample measured 33.3 ms p50 and 33.4 ms p95 between animation frames. Touch idle paused recurring Canvas draws. Native GPU and real iOS Safari performance were not measured.

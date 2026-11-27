# Verification

## Local checks

| Check | Result |
| --- | --- |
| `npm run check` | Zero errors, warnings and hints on Node 24. |
| `npm test` | Three tests passed for intact IR, broken references, deterministic seeking and incremental merge deduplication. |
| `npm run evidence` | All 54 public raw files and cited line ranges resolved at their pinned revisions. |
| `npm run build` | Astro static build and Pagefind index succeeded, including four published technical articles. |
| `CHROMIUM_PATH=… npm run test:e2e` | Verified the core routes, replay controls, drill-down, browser back, distinct WebGL frames, collision-free TsFile labels, history switching, 320px layout, RSS and full-text body search. |
| `GH_TOKEN="$(gh auth token)" npm run sync -- --dry-run` | Real public GitHub bootstrap discovered 182 records and 13 queued candidates on this run. No tracked data was written. |
| `npm audit --omit=dev --audit-level=high` | No high or critical production advisories after upgrading Astro and Zod. Four low advisories were reported in the transitive math renderer. |

## Browser evidence

The implementation team's Chromium screenshots are under `../architecture-lab-evidence/implementation/`. The independent browser audit and inspected keyframes are under `../architecture-lab-evidence/reviewed-frames/`. Desktop and mobile use real Chromium. The desktop run uses software WebGL. The visual evidence does not establish GPU performance for other machines.

## Update rehearsal

The independent run replayed Mooncake PR #5310, a high-risk recovery record change. The real authenticated Codex model generated a schema-valid seven-event proposal. A separate checkout replayed sync, candidate generation, validation and the production build. The generated exhibit returned HTTP 200 and a repeated run preserved the same data hashes. The initial hand-curated production catalog excludes the rehearsal-generated duplicate.

The GitHub Actions hosted model stage depends on the repository's `OPENAI_API_KEY` secret. The deterministic GitHub synchronization, build, browser checks, low-risk publishing and evidence-only review have independent paths.

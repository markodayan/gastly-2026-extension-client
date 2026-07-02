# map-architecture

A Claude Code skill that analyzes unfamiliar codebases and produces a structured architectural overview, an interactive HTML diagram, and a persistent Markdown reference document.

## What it does

When invoked, the skill walks through five phases:

1. **Explore** -- systematically reads the codebase (root structure, configs, representative files per layer, data flows, external deps, tests).
2. **Written Summary** -- outputs a concise architectural summary covering purpose, tech stack, layers, key data flows, and observations.
3. **Interactive Diagram** -- generates a self-contained `architecture-overview.html` with clickable nodes, a search filter, and a dark-themed layout. No external dependencies; works fully offline.
4. **Architecture Reference** -- generates an `ARCHITECTURE.md` designed to be loaded into future Claude Code sessions so the assistant can navigate and reason about the codebase without re-exploring it.
5. **Follow-up** -- stays available to answer targeted questions about any layer, file, or design decision.

## Triggers

The skill activates on prompts like:

- "understand this codebase"
- "explain the architecture"
- "how is this project structured"
- "give me an overview"
- "walk me through this repo"

## Installation

```bash
npx skills add https://github.com/iankressin/map-architecture --skill map-architecture
```

## Outputs

| File | Purpose |
|---|---|
| `architecture-overview.html` | Interactive diagram -- open in any browser |
| `ARCHITECTURE.md` | Persistent reference for future sessions |

Both files are written to the root of the target project.

## License

MIT

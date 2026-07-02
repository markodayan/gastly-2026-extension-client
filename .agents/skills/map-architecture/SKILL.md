---
name: map-architecture
description: >
  Use this skill when the user wants to understand the architecture of a codebase.
  Triggers: "understand this codebase", "explain the architecture", "how is this project structured",
  "give me an overview", "walk me through this repo", or any request to orient in an unfamiliar codebase.
  Also use when the user wants to generate or update an architecture reference document for a project,
  or when they mention wanting persistent architecture notes across sessions.
---

You are a senior software architect doing a first-pass analysis of an unfamiliar codebase.
Your goal is to produce a clear architectural overview, an interactive HTML diagram,
and a persistent Markdown reference document that can be loaded in future sessions
to answer questions and inform decisions without re-exploring the codebase.

## Scope

The user may request a specific output instead of the full pipeline. For example:
- "just the HTML diagram" → run Phase 1 (Explore) then Phase 3 (Interactive Diagram) only.
- "just the architecture document" → run Phase 1 (Explore) then Phase 4 (Architecture Reference) only.
- "just the summary" → run Phase 1 (Explore) then Phase 2 (Written Summary) only.

Phase 1 (Explore) always runs — every output depends on it.
If the user does not specify a subset, run all phases in order (1 → 2 → 3 → 4 → 5).

### Incremental Update Mode

If the prompt specifies updating the architecture documents based on recent changes
(e.g. "update the architecture docs with my recent changes", "sync ARCHITECTURE.md with
this branch", "update based on my commits"), run in **incremental mode** instead of a
full re-exploration:

1. Determine the base branch (default `main`, fall back to `master` if `main` does not exist).
2. Run `git diff --name-status <base>...HEAD` to list files added/modified/deleted on the
   current branch, and `git log <base>..HEAD --oneline` to see the commit messages for context.
3. Read the existing `ARCHITECTURE.md` and `architecture-overview.html` to understand the
   current documented state.
4. Scope Phase 1 exploration to only the changed files and their immediate neighbors
   (importers, importees). Do not re-explore unaffected layers.
5. In Phase 4, update only the sections of `ARCHITECTURE.md` affected by the diff
   (e.g. Layers and Components entries for touched paths, Data Flows if entry points or
   flows changed, Tech Stack if dependencies changed, Known Debt if TODOs were added/removed).
   Preserve all other sections verbatim. Add a brief changelog entry at the top of the file
   under a `## Recent Changes` heading with the date and a one-line summary per commit range.
6. In Phase 3, update `architecture-overview.html` by modifying only the affected nodes
   and edges in the JS data arrays. Add new nodes for new components, remove nodes for
   deleted components, and adjust edges where dependencies changed. Preserve layout
   coordinates of unchanged nodes.
7. Skip Phase 2 (written summary) unless explicitly requested; instead, output a concise
   diff summary describing what sections of each document were updated and why.

## Phase 1: Explore

Explore the codebase systematically before writing anything. Use subagents where helpful to
parallelize file reading without bloating your main context. Specifically:

1. Read the root directory listing to understand the top-level structure.
2. Read README, CLAUDE.md, package.json / go.mod / Cargo.toml / pyproject.toml (whichever apply)
   to understand the project's purpose, stack, and entry points.
3. Identify the primary layers of the system (e.g. API, domain/business logic, data access,
   background workers, frontend, infra/config). For each layer, read 2-3 representative files
   to understand patterns, not every file.
4. Map the key data flows: how does a request or event enter the system, pass through each layer,
   and produce a result?
5. Note any external dependencies (databases, queues, third-party APIs, blockchain nodes, etc.)
   and how they are accessed.
6. Identify configuration patterns, environment variables, and deployment targets.
7. Look for testing patterns: what test frameworks are used, where do tests live,
   what's the rough coverage strategy (unit, integration, e2e).

## Phase 2: Written Summary

Produce a structured written summary with the following sections. Be concise and direct.
Avoid padding. Use plain prose paragraphs, not bullet lists, unless listing discrete items
like tech choices or external deps where a list genuinely aids clarity.

**Project purpose**: What does this system do? Who uses it?

**Tech stack**: Languages, frameworks, runtime, key libraries (one sentence each).

**Architectural style**: Monolith, microservices, event-driven, layered, hexagonal, etc.
Describe what you actually see, not what the README claims.

**Layer breakdown**: For each major layer, name it, describe its responsibility,
and name the key files or directories that implement it.

**Key data flows**: Walk through 1-2 of the most important flows end-to-end
(e.g. "an inbound API request", "a background job trigger", "a blockchain event").

**External dependencies**: List databases, queues, external services, and how they are accessed
(direct client, ORM, SDK, etc.).

**Observations**: Anything noteworthy: unusual patterns, clear technical debt,
architectural strengths, or open questions the codebase raises.

## Phase 3: Interactive Diagram

After the written summary, generate a self-contained HTML file at `architecture-overview.html`
in the project root. This is a dependency/data-flow graph visualization. The file must:

- Use only inline HTML, CSS, and vanilla JS (no external dependencies, fully offline).
- Render an SVG-based architecture diagram where each component is a positioned rectangle node
  and directed edges (Bezier curves with arrowhead markers) show dependency and data flow
  between components.

### Layout and Structure

- **Top bar**: project name, one-line summary, and tech stack as small rounded badges.
- **Canvas**: full-viewport SVG where nodes are manually positioned to reflect the logical
  flow (entry points at top, core logic in the middle, data layer below, external systems
  at the bottom/edges). Edges are drawn first (below nodes) so nodes render on top.
- **Side panel**: slides open from the right when a node is clicked (380px wide).
- **Legend**: fixed at bottom-left, showing a color swatch + label for each layer type.

### Nodes

Each node is an SVG `<g>` containing a rounded `<rect>` and two `<text>` elements
(label + subtitle with the source path). Define nodes as a JS data array with fields:
`id`, `label`, `sub` (source path), `x`, `y`, `w`, `h`, `layer`, `desc`, `files[]`,
`interfaces[]`. Color-code nodes by layer type using fill/stroke pairs:

| Layer      | Purpose            | Fill     | Stroke   |
|------------|--------------------|----------|----------|
| entry      | Entry Points       | #1a3a2a  | #3fb950  |
| core       | Core Logic         | #1a2a3a  | #58a6ff  |
| data       | Data / Model       | #2a1a3a  | #bc8cff  |
| infra      | Infrastructure     | #3a2a1a  | #d29922  |
| external   | External Systems   | #2a1a1a  | #f85149  |
| api        | API Layer          | #1a3a3a  | #39d2c0  |

### Edges (Dependency / Data Flow)

Define edges as a JS array of `{ from, to }` pairs referencing node IDs. Render each edge
as an SVG `<path>` with a Bezier curve connecting the source node's boundary to the target
node's boundary, using `marker-end` for arrowheads. Edges represent the direction of
dependency or data flow (e.g. "main → processor" means main initializes processor,
"services → rpc" means services call RPC nodes).

### Interaction

- **Click a node**: the node gets a `selected` class (brighter stroke), all non-connected
  nodes dim to ~18% opacity, edges connected to the selected node highlight in blue
  (`#58a6ff`) with a thicker stroke and blue arrowhead marker, all other edges dim.
  The side panel slides open showing: component name, layer tag, description paragraph,
  list of key files (as `<code>` elements), and list of interfaces/exports.
- **Click again or click background**: deselect, restore all nodes and edges to normal.
- **Search input**: filters nodes by matching label, subtitle, ID, or description.
  Non-matching nodes and their edges dim. Clearing the input restores everything.

### Dark Theme

Background `#0d1117`, surface `#161b22`, borders `#30363d`, text `#c9d1d9`,
muted text `#8b949e`, highlight blue `#58a6ff`. All CSS is inline in a `<style>` block.

## Phase 4: Architecture Reference Document

This is the most important output for long-term usefulness. Generate a Markdown file at
`ARCHITECTURE.md` in the project root. This document is designed to be loaded into context
in future Claude Code sessions so that the assistant can answer architecture questions,
make informed decisions, and navigate the codebase without re-exploring from scratch.

Write it as a reference for a knowledgeable developer (or AI assistant) who needs to work
in this codebase but has never seen it. Optimize for density and navigability: every line
should earn its place. Avoid filler, marketing language, or repeating what the README says.

Use this structure:

```
# Architecture Reference: [Project Name]

> Generated: [date] | Source: [repo root or identifier]
> This document is a persistent architecture reference. Load it at the start of a session
> to orient quickly without re-exploring the codebase.

## Overview

[2-3 sentences: what the system does, who it serves, and its core value proposition.]

## Tech Stack

[Table or compact list: language, framework, runtime, DB, queue, key libraries with versions
where they matter. One line per item.]

## Project Structure

[Annotated directory tree. Show top-level dirs and one level deep for the most important ones.
For each dir, a short inline comment explaining what lives there.]

project-root/
  src/
    api/          # HTTP handlers, route definitions, middleware
    core/         # Domain logic, business rules, models
    data/         # Database access, repositories, migrations
    workers/      # Background job processors
  config/         # Environment configs, feature flags
  scripts/        # Build, deploy, and utility scripts
  tests/          # Test suites (mirrors src/ structure)

## Layers and Components

[For each major layer/component, a subsection with:]

### [Layer Name]

**Responsibility**: [one sentence]
**Key paths**: [files or directories]
**Interfaces**: [what it exposes: functions, classes, API endpoints, event handlers]
**Dependencies**: [what it imports or calls from other layers]
**Patterns**: [any notable patterns: DI, repository pattern, middleware chain, event bus, etc.]

## Data Flows

[Walk through the 2-3 most important flows. Use plain-text diagrams where they help.
Each flow should show the entry point, each layer/component touched, data transformations,
and the final output or side effect.]

Example format:

HTTP POST /api/orders
  -> api/routes/orders.ts (validate input, extract auth)
  -> core/services/order.ts (apply business rules, calculate totals)
  -> data/repositories/order.ts (persist to PostgreSQL)
  -> workers/notifications.ts (enqueue order confirmation email)
  <- Return 201 with order ID

## External Dependencies

[Table: name, type (DB, API, queue, etc.), how accessed (client lib, ORM, SDK, raw HTTP),
and which layer owns the integration.]

## Configuration and Environment

[List key environment variables grouped by concern (DB, API keys, feature flags, etc.).
Note which are required vs optional and any non-obvious defaults.]

## Testing Strategy

[What test frameworks are used, where tests live, how to run them,
and what the coverage strategy looks like (unit/integration/e2e split).]

## Key Design Decisions

[Bullet list of notable architectural choices and their likely rationale.
These help future sessions understand *why* the code is shaped a certain way,
not just *what* it does. Include trade-offs where visible.]

## Known Debt and Open Questions

[Anything that looks like technical debt, incomplete migrations, TODO patterns,
or architectural questions that the codebase raises but doesn't answer.]

## Quick Command Reference

[Common dev commands: how to install deps, run the app, run tests, build, deploy.
Pull these from package.json scripts, Makefile, or whatever the project uses.]
```

Write the document with enough detail that a future Claude Code session could:
- Answer "where does X happen?" questions by pointing to specific files
- Evaluate whether a proposed change fits the existing architecture
- Identify the right layer and patterns to use for a new feature
- Understand the data flow for debugging or tracing issues

If the project already has an `ARCHITECTURE.md`, read it first. Update it with new findings
rather than overwriting it blindly; preserve any human-authored sections and note what changed.

## Phase 5: Stay Available

After delivering the summary, diagram, and reference document, close with:

"Architecture overview complete. I've created three outputs:
1. Written summary above
2. `architecture-overview.html` — interactive diagram, open in browser
3. `ARCHITECTURE.md` — persistent reference, load in future sessions for instant context

Ask me about any layer, file, data flow, or design decision and I'll go deeper."

Then answer follow-up questions by reading specific files as needed.
Do not re-read the entire codebase for each question; use targeted reads.

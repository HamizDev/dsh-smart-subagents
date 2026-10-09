# Changelog

## 0.3.0 — Unified one-install distribution

- Installs the pinned `@nanmicoder/dsh-agent-teams@0.1.22` as a normal npm runtime dependency.
- Explicitly mounts AgentTeams in the *same* Cordis bundle patch as Smart Subagents. Transitive bundle patches are not automatically mounted by DSH.
- Reuses AgentTeams' real Team collaboration dashboard, task scheduler, approval flow, member sessions, and client UI; no duplicated UI or fabricated progress.
- Preserves native-subagent routing and conditional Value Router compatibility; Value Router is not bundled because its npm distribution has not been independently verified.
- Adds composition tests and English/Simplified Chinese documentation with one-command installation instructions.
- npm publication requires ownership/authorization for the `@hamizdev` npm scope. Local tarball and GitHub source alone are **not** equivalent to a published npm spec.

## 0.2.0 — 2026-10-09

- Added optional scope-aware AgentTeams detection and preference for coordinated work.
- Kept real Team collaboration dashboard with the AgentTeams owner; avoided fake progress/duplicate scheduler.
- Added staged approval guidance, native fallback and no-double-scheduling guidance.
- Added explicit Value Router cooperation without overriding its model-route decisions.
- Added compatibility tests and expanded documentation.
- Added full English and Simplified Chinese READMEs.

## 0.1.0 — 2026-10-09

- Initial Codex-inspired native subagent delegation policy and four modes.

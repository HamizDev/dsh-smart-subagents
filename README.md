# DSH Smart Subagents

**English** | [简体中文](README.zh-CN.md)

> **v0.2.0** — Codex-inspired, automatic subagent-delegation guidance for DeepSeek Harness (DSH), with optional [AgentTeams](https://github.com/NanmiCoder/dsh-agent-teams) and [Value Router](https://github.com/zhuifengqug/dsh-value-router) integration.

Smart Subagents is a **small, scope-aware policy plugin**: it helps the primary agent decide when delegation is useful and which **existing** DSH tool to call. It is not a separate agent executor, task scheduler, or UI.

## How it works

| Task | Preferred path | What you see |
| --- | --- | --- |
| A quick, sequential request | Main agent | Regular conversation |
| Independent research, review, or bounded coding | Native DSH `subagent` / `subagent_fork` | Native subagent execution and results |
| Coordinated tasks with member roles, dependencies, or team tracking | **AgentTeams**, if installed and available to the agent | Its real **Team collaboration** workspace |
| Model/provider/effort selection | Native DSH routing; optionally **Value Router** | Router/host state and AgentTeams' actual member routes |

**The team member roster, progress bar, task DAG, and run history in the sample screenshot are implemented by AgentTeams.** This plugin does not draw a duplicate panel or invent progress. [See AgentTeams' own UI and documentation](https://github.com/NanmiCoder/dsh-agent-teams#view-teams-in-the-workspace).

## Features

- Four routing-policy modes: `off`, `conservative`, **`balanced` (default)**, and `aggressive`.
- Automatically recommends **direct execution, native subagents, or an AgentTeams plan** based on the task; model behavior remains non-deterministic.
- Only treats `agent_teams_create` visible **in the current agent scope** as permission to plan a new team; a status-only tool does not qualify.
- Prefers **staged review and approval** for new teams. Follow the AgentTeams protocol and click **Approve & Run** before dispatch.
- Avoids double-scheduling: tasks owned by AgentTeams must not be independently launched again via native `subagent`.
- Leaves model routes, white lists, fallback and effort decisions to DSH / Value Router (when installed).
- Never bypasses native approvals, sandboxing, recursion limits or user-defined constraints.
- `maxParallel` is a **suggestion**, not an enforced runtime concurrency limit.

## Requirements and compatibility

- DSH with an active `systemPrompt` and `tools` service; native delegation tools must be exposed for native subagent dispatch.
- The companion **AgentTeams v0.1.22** and **Value Router v0.10.0** documentation target **DSH 0.2.0-rc.2**. Check your **Desktop's embedded Harness version** before installing: a global `dsh` CLI might not manage the Desktop profile.
- Node.js `^22.19.0 || >=24.0.0` for local package development.
- **AgentTeams and Value Router are optional**. Smart Subagents does not auto-install or auto-enable them.

The three-plugin combination has undergone source-level compatibility review and local policy tests; **it has not been end-to-end verified on your DSH Desktop installation**.

## Installation

### 1. Install AgentTeams (optional, provides the real UI)

In **DSH Desktop → Plugins → Add plugin**, use the exact npm package specification:

```text
@nanmicoder/dsh-agent-teams@0.1.22
```

Enable the plugin. Its **Team collaboration** tab, member list, actual task statuses and dependency graph are owned by AgentTeams. You may also use it directly with `/agent-teams <goal>`.

### 2. Install Smart Subagents

Download the `hamizdev-dsh-smart-subagents-0.2.0.tgz` asset from the [v0.2.0 Releases page](https://github.com/HamizDev/dsh-smart-subagents/releases/tag/v0.2.0), **once published**, or build the archive from this repository:

```powershell
npm test
npm pack
# Run in the directory containing the .tgz file:
dsh plugin --profile desktop add .\hamizdev-dsh-smart-subagents-0.2.0.tgz --ignore-scripts
```

Alternatively, use DSH Desktop's built-in plugin manager if it supports local package files. **Restart DSH** after installing. The standalone CLI and the embedded Desktop installation can use different profiles/runtimes.

### 3. Configure Value Router (optional)

Install [Value Router](https://github.com/zhuifengqug/dsh-value-router) separately, then configure its `low`, `medium`, `high`, `max` routes and host subagent allowlist. Value Router is the owner of model selection; Smart Subagents does **not** replace its decisions or supply a fake fallback.

## Configuration

The built-in `cordis.patch.yml` injects this default Cordis row:

```yaml
- insert:
    - id: smart-subagents
      name: '@hamizdev/dsh-smart-subagents'
      config:
        mode: balanced
        maxParallel: 3
        preferForkForContext: true
        preferAgentTeams: true
        teamMinWorkstreams: 2
        requireTeamApproval: true
```

| Setting | Default | Description |
| --- | --- | --- |
| `mode` | `balanced` | `off` / `conservative` / `balanced` / `aggressive` |
| `maxParallel` | `3` | Suggested concurrent native workers (1–8), **not enforced** |
| `preferForkForContext` | `true` | Prefer fork when prior conversation context is needed |
| `preferAgentTeams` | `true` | Suggest AgentTeams on suitably coordinated tasks if its create tool is actually visible |
| `teamMinWorkstreams` | `2` | Suggested minimum substantial team workstreams (2–6; conservative mode requires at least 3) |
| `requireTeamApproval` | `true` | Suggest the native staged plan, followed by explicit user approval |

Turning `requireTeamApproval` off **does not authorize bypassing review**; an agent should only request immediate execution if the user explicitly asks for it.

## Try it

Ask DSH:

> Review the authentication module, investigate the UI performance regression independently, and prepare focused tests for both. Decide whether a team would help, and show me the plan before starting any team work.

With the appropriate AgentTeams tools exposed, the main agent may create a **staged team plan**. Review the member models, roles, task DAG and dependencies, then select **Approve & Run** in the real Team collaboration panel. If the team tools are absent, the plugin can guide native subagent delegation instead. For a trivial request, it can advise the main agent to work alone.

**Validation:** Check for real native tool calls or actual AgentTeams tasks and progress. Merely saying “I delegated” in the conversation is not evidence that any child was started.

## Architecture and limitations

1. Adds one Cordis `systemPrompt.section` at order `2750` and checks native/team tools per agent scope. Its text is empty when no viable tools are available.
2. It **does not register** a model-facing tool, mutate other plugin configuration, create workspaces, access credentials or issue network requests.
3. **AgentTeams** owns real task lifecycle, dashboard data, member conversations and approval UX. **Value Router** owns provider/model/reasoning-effort selection. Smart Subagents only guides the main model's choice.
4. It does not enforce concurrency, compel model tool use, automatically turn every conversation into a team, or guarantee routing quality.
5. If the host runtime or companion plugins are incompatible, do not force installation or claim the dashboard works. Verify on the target machine.

## Development and testing

```sh
npm run verify
```

Uses the Node.js built-in test runner. Tests exercise configuration defaults, scope-aware capability discovery, native and team pathways, approval safety, Value Router ownership and policy lifecycle. An end-to-end test with installed DSH Desktop + AgentTeams + Value Router is still required.

## Related projects

- [DeepSeek Harness — native subagent tools](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/subagent/tool-subagent)
- [NanmiCoder/dsh-agent-teams — real team scheduler and UI](https://github.com/NanmiCoder/dsh-agent-teams)
- [zhuifengqug/dsh-value-router — model routing](https://github.com/zhuifengqug/dsh-value-router)

MIT License © 2026 HamizDev. See [LICENSE](LICENSE).

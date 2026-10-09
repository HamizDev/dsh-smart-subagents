# DSH Smart Subagents

**English** | [简体中文](README.zh-CN.md)

**v0.3.0 — one install, native subagents + AgentTeams workspace.** A Codex-inspired autonomous delegation policy for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

> **Release status:** Source and the local `.tgz` archive are available; do not use the npm install spec until `@hamizdev/dsh-smart-subagents@0.3.0` is actually published to npm. The package name cannot be reserved or published by creating a GitHub repository.

## What is included?

| Feature | Owner | Included in the single npm installation? |
| --- | --- | --- |
| Automatic task delegation policy | **Smart Subagents** (this project) | Yes |
| Native one-shot or background subagents | **DSH** built-in subagent tools | Already in compatible DSH presets |
| Durable teams, real status, members, task DAG and **Team collaboration** UI | [**AgentTeams**](https://github.com/NanmiCoder/dsh-agent-teams) `0.1.22` | **Yes**, pinned runtime dependency, automatically mounted |
| Four-tier model routing, provider rotation and fallback | [**Value Router**](https://github.com/zhuifengqug/dsh-value-router) | **Optional external integration**, not bundled yet |

No fabricated progress bars or duplicate team schedulers. The actual team panel is provided by AgentTeams and reads live/persisted team state. The native UI appears only when the version-compatible DSH client successfully loads the companion.

## Install — a single npm package spec

**Required:** DSH Desktop with compatible embedded Harness. The recommended target is Harness **`0.2.0-rc.2`** with AgentTeams **`0.1.22`**. The standalone `dsh --version` may not correspond to your Desktop's internal version.

When v0.3.0 is published to npm:

1. Open **DSH Desktop → Plugins → Add plugin**.
2. Paste exactly:

   ```text
   @hamizdev/dsh-smart-subagents@0.3.0
   ```

3. Select **Enable now**, and restart DSH if prompted.
4. Ask DSH to perform a multi-part task; it can propose an AgentTeams plan. Approve the plan via **Approve & Run** before the team begins.
5. Open **View team / Team collaboration** to inspect actual team members, models, task states and dependencies.

For a CLI-managed profile, **only if it controls the same DSH installation**:

```sh
dsh plugin --profile desktop add --save-exact @hamizdev/dsh-smart-subagents@0.3.0
```

### Test an unpublished build

From this checkout, create a local package with `npm pack`; then install the generated tarball through your Desktop's plugin manager or compatible `dsh plugin` CLI:

```powershell
npm test
npm pack
dsh plugin --profile desktop add .\hamizdev-dsh-smart-subagents-0.3.0.tgz --ignore-scripts
```

**Important:** Running `npm pack` offline checks this package's declared artifacts, but does **not** prove its npm dependency can be downloaded or the DSH runtime integration succeeds. The dependency is fetched by DSH's package manager when the archive is installed.

### Already installed AgentTeams separately?

This distribution mounts AgentTeams under its **canonical `agent-teams` plugin ID**. Do **not** keep an independent AgentTeams bundle enabled in the **same** DSH profile, as double mounting can cause collisions or redundant agents/UI. First back up your profile/team state, disable or uninstall the existing independent AgentTeams bundle, and then enable the all-in-one package. This plugin doesn't delete any team files. Other profiles are independent.

## How automatic delegation works

- **Trivial / sequential:** the primary agent works directly.
- **Independent, bounded investigations or reviews:** call available native `subagent` or `subagent_fork` tools when useful.
- **Multiple coordinated workstreams:** propose an AgentTeams **staged** plan with a roster, DAG and dependencies. The user inspects and approves it before execution.
- **Routing:** leave `provider`, `model` and `reasoning_effort` decisions to the current DSH host and optional Value Router. Do not override explicit routes or whitelist checks.

The agent decides when delegation helps; this is **model-level guidance**, not a forced execution interceptor. `maxParallel` is advisory. The actual permission, tool availability, approval and runtime limits belong to DSH / AgentTeams. Team membership and task progress are **never simulated**.

## Configuration

The package declares `dsh.bundle.patch` and contributes **both rows in the same bundle**. DSH does **not** activate the patch files of transitive dependencies automatically; that is why simply adding AgentTeams to npm `dependencies` is insufficient.

```yaml
- insert:
    - id: agent-teams
      name: '@nanmicoder/dsh-agent-teams'
      config:
        stateDir: .agent-teams
        memberProvider: spawn
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

| Key | Default | Purpose |
| --- | --- | --- |
| `mode` | `balanced` | `off`, `conservative`, `balanced`, `aggressive` |
| `maxParallel` | `3` | Suggested native concurrent workers (1–8); not enforced |
| `preferForkForContext` | `true` | Prefer a fork if full prior parent context is needed |
| `preferAgentTeams` | `true` | Prefer teams for coordinated work if the `agent_teams_create` tool is visible |
| `teamMinWorkstreams` | `2` | Suggested minimum number of substantial workstreams (2–6) |
| `requireTeamApproval` | `true` | Staged plan requiring explicit approval before execution |

## Compatibility with Value Router

[Value Router](https://github.com/zhuifengqug/dsh-value-router) provides sophisticated `low / medium / high / max` routing, model rotation and fallbacks; those decisions are *not* reimplemented in this package. If you separately install and configure a compatible Value Router, Smart Subagents leaves the provider/model decisions to it and AgentTeams. At this time, the router's exact installable npm artifact has **not been verified**, so we do not pin an invented npm dependency or silently run build scripts during installation.

## Packaging, publication and testing

```sh
npm test
npm run verify
npm pack
```

The code and packaging assertions are tested locally. **An end-to-end test on DSH Desktop is still needed** to verify its Host loader, browser Team collaboration panel, and any optional router. CI does not substitute for a real Desktop test.

Publishing the one-line npm spec requires the owner of the **npm `@hamizdev` scope** to authenticate to npm and run `npm publish --access public` (or configure an authorized npm trusted publisher). GitHub ownership alone is not sufficient. Do not share npm passwords or tokens in an issue or chat.

## Acknowledgements / License

- [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) — MIT; the actual multi-agent scheduler and visual dashboard.
- [zhuifengqug/dsh-value-router](https://github.com/zhuifengqug/dsh-value-router) — optional route integration.
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — original subagent infrastructure.

Smart Subagents is licensed under MIT (see [LICENSE](LICENSE)). All companion projects remain independently maintained under their own licenses.
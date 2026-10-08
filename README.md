# DSH Smart Subagents / DSH 智能子智能体调度

**v0.1.0** · Codex-inspired automatic subagent delegation policy for DeepSeek Harness (DSH).

A lightweight, model-driven policy plugin that prompts the primary agent to autonomously delegate bounded, independent workstreams using **existing native DSH subagent tools**. It does not implement a separate executor or force child execution.

## Features / 功能

- Automatic delegation decisions for meaningful independent investigations, reviews and tests.
- Four modes: `off`, `conservative`, `balanced` (default), and `aggressive`.
- Suggested concurrency of up to three agents by default (configurable 1–8); **advisory only**.
- Scope-aware checking of `subagent` and `subagent_fork` tools.
- Respects DSH's native model authorization, sandboxes, depth restrictions, and permissions.
- Never changes Codex, Claude Code, local agent settings or `dsh-smart-compact`.

## Install / 安装

Requires a compatible DSH build and Node.js 22.19+ or 24+.

```powershell
npm test
npm pack
dsh plugin --profile desktop add .\hamizdev-dsh-smart-subagents-0.1.0.tgz --ignore-scripts
```

Restart DSH after installing and verify the current Agent preset actually exposes native delegation tools. The plugin will not automatically enable missing tools.

## Configuration / 配置

```yaml
- insert:
    - id: smart-subagents
      name: '@hamizdev/dsh-smart-subagents'
      config:
        mode: balanced
        maxParallel: 3
        preferForkForContext: true
```

| Mode | Behavior |
| --- | --- |
| `conservative` | Delegate only for two or more substantial independent workstreams |
| `balanced` | Proactively delegate parallelizable, bounded investigations or reviews |
| `aggressive` | Favor independent review or test work when beneficial |
| `off` | Disable policy injection |

## Verify / 验证

```powershell
npm test
npm run verify
```

Use a task containing multiple independent subtasks and check the actual `subagent` / `subagent_fork` tool calls. A model merely claiming delegation in text is **not** evidence of successful execution.

**Limitations:** Model-driven, not deterministic. No hard concurrency cap, no backend changes, and no guaranteed spawning. Requires enabled native DSH delegation tools; runtime integration on end-user systems is not yet verified.

## Official references / 参考文档

- [DSH subagent subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/subagent.md)
- [Native subagent tool](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/tool-subagent/README.md)
- [DSH system prompts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/system-prompt/README.md)

License: MIT. © 2026 HamizDev.

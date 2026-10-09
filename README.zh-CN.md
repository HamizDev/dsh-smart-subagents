# DSH Smart Subagents（智能子智能体调度）

[English](README.md) | **简体中文**

**v0.3.2 — 一次安装，获得自动分派和真实团队协作面板。** 适用于 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的 Codex 风格自动子智能体分工策略。

> **npm 发布状态：** 软件包已从 v0.3.1 起正式上线 npm。以下 v0.3.2 安装规格需要等待 GitHub OIDC 自动发布成功后使用；可在 [npm 软件包页面](https://www.npmjs.com/package/@hamizdev/dsh-smart-subagents) 核实已发布的版本。

## 一个插件里有哪些能力？

| 功能 | 来源 | 一次 npm 安装是否提供？ |
| --- | --- | --- |
| 按任务复杂度建议自动分工 | **Smart Subagents**（本项目） | **是** |
| 普通 / 后台子智能体 | **DSH 原生** `subagent` / `subagent_fork` | 由兼容 DSH 预设提供 |
| 持久化团队、成员状态、任务 DAG、进度条及截图中的**团队协作面板** | [**AgentTeams**](https://github.com/NanmiCoder/dsh-agent-teams) `0.1.22` | **是**，作为固定版本依赖自动安装并加载 |
| Low/Medium/High/Max 模型路由与供应商轮转 | [**Value Router**](https://github.com/zhuifengqug/dsh-value-router) | **可选兼容**，暂未内置发布包 |

团队列表、真实任务进度、依赖图和成员使用的模型来自 AgentTeams 的运行数据，**不会生成假进度条，也不会额外实现第二套团队调度器**。完整面板能否显示还取决于 DSH Desktop 是否加载了版本兼容的客户端插件。

## 安装：只填一个 npm 包名

**运行环境：** 推荐 Harness 内核 **`0.2.0-rc.2`**，对应 AgentTeams **`0.1.22`**。注意 DSH Desktop 自带内核；全局终端执行 `dsh --version` 不一定是桌面端内核的真实版本。

v0.3.2 **自动发布到 npm 后**：

1. 进入 **DSH Desktop → 插件（Plugins）→ 添加插件（Add plugin）**。
2. 输入以下完整包名：

   ```text
   @hamizdev/dsh-smart-subagents@0.3.2
   ```

3. 选择 **立即启用（Enable now）**，按提示重启 DSH。
4. 让 DSH 执行含多个独立子任务的复杂工作；Smart Subagents 可以自动建议创建 AgentTeams 团队计划。
5. 在团队面板核对成员和任务后，点击 **Approve & Run（确认并启动团队）**。
6. 点击 **View team / Team collaboration（查看团队／团队协作）**，就能看到真实团队状态、任务依赖和每个成员的模型。

仅在 CLI 与桌面端确实共享同一个 Profile 时，可以通过命令安装：

```powershell
dsh plugin --profile desktop add --save-exact @hamizdev/dsh-smart-subagents@0.3.2
```

### 在本地测试安装包

先从仓库构建 `.tgz`：

```powershell
npm test
npm pack
dsh plugin --profile desktop add .\hamizdev-dsh-smart-subagents-0.3.2.tgz --ignore-scripts
```

如果 DSH Desktop 插件管理器支持本地包导入，也可以直接选取该 `.tgz`。注意：`npm pack` 本身只检查文件完整性，不代表网络上能取回依赖，也不代表 DSH Desktop 中的 UI 已完成实际验证；安装时 DSH 包管理器仍需解析 AgentTeams 依赖。

### 之前已单独装过 AgentTeams 怎么办？

整合包以 AgentTeams 官方的 `agent-teams` ID 加载模块。**同一个 DSH Profile 不应再同时启用另一份独立 AgentTeams 插件**，否则可能出现重复加载、工具冲突或界面重复。

建议先备份现有配置及 `.agent-teams` 团队状态，然后停用或卸载单独安装的 AgentTeams，再启用 Smart Subagents 整合包。本插件不会自动删除团队数据；不同 Profile 之间彼此独立。

## 自动分工原理

- **简单、必须串行完成的任务：** 主智能体直接做。
- **独立调查、代码检查、局部测试：** 根据实际工具能力调用 DSH 原生 `subagent` / `subagent_fork`。
- **多个角色与依赖任务：** 使用 AgentTeams 生成待审批计划，包括成员、职责和 DAG；用户同意后才执行。
- **模型选择：** 由 DSH 或已启用的 Value Router 决定 `provider / model / reasoning_effort`，不会擅自换掉你的主模型、修改模型白名单或绕过指定路线。

这是针对模型的**分派策略**，不是强制启动子智能体的底层拦截器。`maxParallel` 只是指导数字；实际并发、审批、权限与任务状态由 DSH／AgentTeams 执行和记录。

## 配置结构

DSH 只会自动启用顶层安装包的 `dsh.bundle.patch`，不会自动执行 npm 依赖的其他插件配置，因此本项目把 **AgentTeams 和 Smart Subagents 显式挂载在同一个配置文件内**：

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

| 参数 | 默认值 | 功能 |
| --- | --- | --- |
| `mode` | `balanced` | `off`（关闭）/ `conservative`（保守）/ `balanced`（均衡）/ `aggressive`（积极） |
| `maxParallel` | `3` | 建议同时运行的普通子智能体数量（1–8），并非强制限制 |
| `preferForkForContext` | `true` | 子任务需要前文时优先使用 `subagent_fork` |
| `preferAgentTeams` | `true` | 有协调任务且当前能调用 `agent_teams_create` 时优先使用团队 |
| `teamMinWorkstreams` | `2` | 建议组成团队的实质工作流数量（2–6） |
| `requireTeamApproval` | `true` | 生成需要用户明确批准的团队计划 |

## 和 Value Router 的关系

朋友的 [Value Router](https://github.com/zhuifengqug/dsh-value-router) 提供四档难度线路、供应商轮转、模型降级和备用线路。本插件不会重新实现一套可能冲突的路由器。如果你已经另外正确安装并启用了兼容的 Value Router，Smart Subagents 会保留它与 AgentTeams 的模型选择行为。

**暂未把 Value Router 写成强制 npm 依赖：** 当前尚未独立核实到其可直接安装的 npm 发布产物，不能伪造包名、假定 GitHub 源码已编译完毕，或在 DSH 安装时偷偷执行构建脚本。

## 测试和发布

```powershell
npm test
npm run verify
npm pack
```

源码与安装包经过本地检查，但**完整的 DSH Desktop + AgentTeams + Value Router 联合运行仍需真机集成测试**，尤其需要核对服务端插件加载、浏览器客户端 UI 和用户审批流程。

此 npm 包已经由 **npm `@hamizdev` 的拥有者**完成首次发布，后续版本改由仓库的 [GitHub OIDC Trusted Publishing 工作流](.github/workflows/publish-npm.yml)自动发布，无需在 GitHub 中保存 npm 发布 Token。请勿在聊天、Issue 中提供 npm 密码或 Token。

## 致谢及许可

- [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) — 提供真实多智能体执行器及可视化面板，MIT 协议。
- [zhuifengqug/dsh-value-router](https://github.com/zhuifengqug/dsh-value-router) — 可选模型路由插件。
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — 原生子智能体基础设施。

本项目采用 MIT 许可证（见 [LICENSE](LICENSE)）。其他插件依旧由各自作者独立维护并遵守各自许可证。
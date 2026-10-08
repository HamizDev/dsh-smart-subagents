# DSH Smart Subagents（智能子智能体调度）

[English](README.md) | **简体中文**

> **v0.2.0** — 为 DeepSeek Harness（DSH）提供类似 Codex 的自动子智能体分派策略，可选配 [AgentTeams](https://github.com/NanmiCoder/dsh-agent-teams) 和 [Value Router](https://github.com/zhuifengqug/dsh-value-router)。

Smart Subagents 是一个**按当前智能体权限动态生效的策略插件**：帮助主智能体判断任务是否适合分派，以及应该调用哪种**已有**的 DSH 工具。它不重新实现子智能体执行器、任务调度器，也不自己绘制团队 UI。

## 工作方式

| 任务情况 | 推荐执行方式 | 界面效果 |
| --- | --- | --- |
| 简单、连续依赖的任务 | 主智能体直接执行 | 普通对话 |
| 可独立完成的调查、审查或小范围编码 | DSH 原生 `subagent` / `subagent_fork` | 原生子智能体调用与结果 |
| 有多名成员、任务依赖或需要进度跟踪的大型任务 | 安装且可用时优先 **AgentTeams** | 它提供的真实 **Team collaboration 团队协作面板** |
| 选择模型、供应商和推理等级 | DSH 原生路由；可选 **Value Router** | 宿主路由数据及 AgentTeams 实际成员模型 |

**你截图里的成员列表、分段进度条、任务 DAG（依赖图）和历史记录由 AgentTeams 提供。** 本插件不会渲染第二套面板，更不会伪造进度。可在 [AgentTeams 仓库](https://github.com/NanmiCoder/dsh-agent-teams#view-teams-in-the-workspace) 查看界面和使用说明。

## 功能特性

- 四档策略：`off`（关闭）、`conservative`（保守）、**`balanced`（均衡，默认）**、`aggressive`（积极）。
- 根据任务特征，引导主智能体自主选择**自己完成、普通子智能体、AgentTeams 团队计划**；实际行为仍取决于模型。
- 仅当当前智能体真实可见 `agent_teams_create` 时，才认定它有权创建团队；单独拥有 `agent_teams_status` 不算。
- 默认先制作**可审查的团队计划**；用户在 AgentTeams 原生面板点击 **Approve & Run（确认并启动）** 后才执行。
- 避免重复调度：已交给 AgentTeams 的工作不再另外启动普通 `subagent` 重复修改。
- 不接管模型、白名单、备用线路和推理等级；这些由 DSH / Value Router 决定。
- 尊重宿主沙盒、审批、子智能体深度限制和用户明确要求。
- `maxParallel` 只是**并行数量建议**，不是底层强制并发上限。

## 运行要求与兼容性

- DSH 已加载 `systemPrompt`、`tools` 服务；如需普通子智能体，应在当前预设启用原生委派工具。
- **AgentTeams v0.1.22** 与 **Value Router v0.10.0** 的文档均以 **DSH 0.2.0-rc.2** 为主要适配版本。安装前应核实 **DSH Desktop 内嵌 Harness 的实际版本**，全局 `dsh` CLI 版本不一定代表桌面版版本。
- 本地开发、测试要求 Node.js `^22.19.0 || >=24.0.0`。
- **AgentTeams 和 Value Router 都是可选插件**；安装 Smart Subagents 不会自动安装或启用它们。

目前已进行源代码兼容性检查和本地策略测试，但**三个插件在你的 DSH Desktop 上联合运行尚未完成端到端实测**。

## 安装方法

### 第一步：安装 AgentTeams（可选，提供截图中的界面）

在 **DSH Desktop → Plugins → Add plugin（添加插件）** 中输入：

```text
@nanmicoder/dsh-agent-teams@0.1.22
```

安装、启用后，AgentTeams 自己提供 Team collaboration 页面，包括团队成员、任务依赖和实时进度。也可以直接通过 `/agent-teams <任务目标>` 运行它。

### 第二步：安装 Smart Subagents

可前往 [v0.2.0 Releases 页面](https://github.com/HamizDev/dsh-smart-subagents/releases/tag/v0.2.0) 获取**已发布**的 `hamizdev-dsh-smart-subagents-0.2.0.tgz`，或者从仓库源码构建：

```powershell
npm test
npm pack
# 在包含打包文件的目录运行：
dsh plugin --profile desktop add .\hamizdev-dsh-smart-subagents-0.2.0.tgz --ignore-scripts
```

如果你的 DSH Desktop 插件管理器支持导入本地安装包，也可以在应用内安装。安装后**完整重启 DSH**。注意独立 CLI 和桌面版可能使用不同的运行时、配置及 Profile。

### 第三步：安装 Value Router（可选）

从 [Value Router 仓库](https://github.com/zhuifengqug/dsh-value-router) 单独安装并配置 `low`、`medium`、`high`、`max` 四档线路、宿主子智能体白名单和备用线路。Value Router 是模型路由的唯一负责人，Smart Subagents 不会覆盖它的选择，也不会擅自使用未经授权的备用模型。

## 配置说明

插件自带的 `cordis.patch.yml` 默认插入如下配置：

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

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| `mode` | `balanced` | `off` / `conservative` / `balanced` / `aggressive` |
| `maxParallel` | `3` | 建议的普通子智能体同时运行数量（1–8），**不强制执行** |
| `preferForkForContext` | `true` | 确实需要继承对话上下文时优先 `subagent_fork` |
| `preferAgentTeams` | `true` | 有协调需求且确实可用时选择 AgentTeams |
| `teamMinWorkstreams` | `2` | 团队任务至少具备几个实质性独立工作流（2–6；保守模式至少 3 个） |
| `requireTeamApproval` | `true` | 优先使用需要用户确认的 staged 团队计划 |

将 `requireTeamApproval` 设置为 `false` **也不意味着允许未经同意直接开工**；只有用户针对该任务明确要求立即执行时，才考虑跳过审查。

## 使用示例

向 DSH 发送：

> 分别检查登录认证逻辑、排查 UI 性能问题，并为这两个模块设计独立测试。你自己判断是否需要子智能体或团队；如果要创建团队，先让我看执行计划再开始。

当 `agent_teams_create` 在当前会话确实可用时，主智能体可以创建**待确认的团队计划**。你可以先核对每个成员的模型、职责、任务顺序和依赖关系，然后在真实 Team collaboration 面板中点击 **Approve & Run**。如果没有安装 AgentTeams，插件可以退回 DSH 原生委派工具；简单任务仍可由主智能体单独完成。

**验收标准：** 要检查实际工具调用或 AgentTeams 的真实团队记录。对话里仅声称“已经调用子智能体”，不能证明后台确实执行了工作。

## 技术原理与边界

1. 在 Cordis 的 `systemPrompt.section` 注册一段 `order: 2750` 的策略提示，并按当前智能体的工具可见性动态决定内容；不存在有效委派工具时不注入策略。
2. 插件**不会注册额外的模型工具**，不会修改其他插件配置、创建工作区、读取凭据或自行发送网络请求。
3. **AgentTeams** 负责真实成员状态、调度、消息和团队面板；**Value Router** 负责 `provider / model / reasoning_effort`；Smart Subagents 只引导主智能体决定何时调用它们。
4. 插件无法强制模型派发、强制并发限制，也不保证每个复杂任务都会创建团队。
5. 如果宿主版本或配套插件不兼容，应先解决兼容性问题，不应强装或声称面板已经可用。

## 开发与测试

```bash
npm run verify
```

使用 Node.js 内置测试运行器，覆盖配置默认值、工具权限可见性、原生与团队路径、审批约束、Value Router 兼容策略和插件生命周期。**仍需在实际的 DSH Desktop + AgentTeams + Value Router 环境下做完整集成验证。**

## 相关项目

- [DeepSeek Harness — 原生子智能体工具](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/subagent/tool-subagent)
- [NanmiCoder/dsh-agent-teams — 真实团队调度和可视化面板](https://github.com/NanmiCoder/dsh-agent-teams)
- [zhuifengqug/dsh-value-router — 模型路由](https://github.com/zhuifengqug/dsh-value-router)

MIT License © 2026 HamizDev，详见 [LICENSE](LICENSE)。

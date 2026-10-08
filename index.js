/**
 * Smart Subagents for DeepSeek Harness.
 *
 * A small, scope-aware prompt policy. It does NOT implement a second team
 * scheduler or UI. When AgentTeams is available, its native workspace is the
 * source of truth for task states and its routing integrations remain in charge.
 */
export const name = 'smart-subagents'
export const inject = ['systemPrompt', 'tools']

const MODES = new Set(['off', 'conservative', 'balanced', 'aggressive'])
export const NATIVE_TOOL_NAMES = Object.freeze([
  'subagent',
  'subagent_fork',
  'subagent_codex',
  'subagent_claude_code',
  'subagent_dsh_sdk',
])
export const TEAM_TOOL_NAMES = Object.freeze([
  'agent_teams_create',
  'agent_teams_status',
  'agent_teams_approve',
  'agent_teams_add_member',
  'agent_teams_create_task',
  'agent_teams_edit_plan',
])

export function normalizeConfig(input = {}) {
  const value = input && typeof input === 'object' ? input : {}
  const mode = MODES.has(value.mode) ? value.mode : 'balanced'
  const integer = (v, min, max, fallback) => Number.isInteger(v) && v >= min && v <= max ? v : fallback
  return {
    mode,
    maxParallel: integer(value.maxParallel, 1, 8, 3),
    preferForkForContext: value.preferForkForContext !== false,
    preferAgentTeams: value.preferAgentTeams !== false,
    teamMinWorkstreams: integer(value.teamMinWorkstreams, 2, 6, 2),
    requireTeamApproval: value.requireTeamApproval !== false,
  }
}

/** Only trust a tool actually registered in the given agent scope. */
function scopedTools(ctx, scope, candidates) {
  if (!ctx?.tools || typeof ctx.tools.get !== 'function') return []
  return candidates.filter(tool => ctx.tools.get(tool, scope) !== undefined)
}
export function visibleDelegationTools(ctx, scope) {
  return scopedTools(ctx, scope, NATIVE_TOOL_NAMES)
}
export function visibleTeamTools(ctx, scope) {
  return scopedTools(ctx, scope, TEAM_TOOL_NAMES)
}
export function detectCapabilities(ctx, scope) {
  const nativeTools = visibleDelegationTools(ctx, scope)
  const teamTools = visibleTeamTools(ctx, scope)
  return {
    nativeTools,
    teamTools,
    // Presence of status alone is not sufficient: child agents may only get status.
    canCreateTeam: teamTools.includes('agent_teams_create'),
  }
}

const thresholds = {
  conservative: 'Only delegate for multiple substantial, independently verifiable tasks with a clear net gain in quality or completion time.',
  balanced: 'Delegate proactive independent research, implementation and verification on meaningful multi-part tasks; do simple requests directly.',
  aggressive: 'Favor bounded independent workstreams including reviews and investigations, but never start a team just to meet a quota.',
}

const teamThresholds = {
  conservative: 'Prefer a team for at least THREE substantial coordinated workstreams that genuinely need shared task dependencies or durable reporting.',
  balanced: 'Prefer a team for a genuinely complex task with coordinated planning, dependent tasks, or role-based workstreams.',
  aggressive: 'Prefer a team for meaningful work with multiple roles and deliverables where task tracking provides real value.',
}

const nativeInstructions = (config, visibleTools) => {
  const preferred = config.preferForkForContext
    ? 'Use subagent_fork only when its inherited conversation context is materially needed; otherwise use a fresh subagent with a self-contained task prompt.'
    : 'Prefer a fresh subagent for independently specified tasks; fork only where clearly beneficial.'
  return `Native tools available: ${visibleTools.map(t => `\`${t}\``).join(', ')}.
For independent bounded tasks, use a native delegation tool rather than merely describing delegation. ${preferred}
Suggest at most ${config.maxParallel} simultaneous native workers, respecting tighter DSH limits.
Each child gets a clear goal, context, output format, file ownership and verification requirements. Avoid overlapping edits and unnecessary credential exposure. Only report actual tool results, not assumed outcomes.`
}

/**
 * A compatibility policy, not a tool wrapper: AgentTeams remains authoritative
 * for scheduler state, native UI and Value Router model decisions.
 */
export function buildPolicy(input, nativeTools = [], teamTools = []) {
  const config = normalizeConfig(input)
  const canTeam = config.preferAgentTeams && teamTools.includes('agent_teams_create')
  if (config.mode === 'off' || (!canTeam && nativeTools.length === 0)) return ''

  const lines = [
    '# Smart Subagents — choose an execution mode automatically',
    'Autonomously decide between working directly and delegating. The user does not need to request subagents, but do not create them for trivial or tightly sequential tasks.',
    `Delegation policy (${config.mode}): ${thresholds[config.mode]}`,
    'Do not invent team members, progress, task graphs, token usage or model selections. Use actual host/AgentTeams state. Honor the user, approvals, sandbox, native depth/tool limits and budget.',
  ]

  if (canTeam) {
    lines.push(`AgentTeams is installed in this agent scope (real tool: \`agent_teams_create\`). ${teamThresholds[config.mode]} A team is particularly useful when at least ${Math.max(config.teamMinWorkstreams, config.mode === 'conservative' ? 3 : 2)} substantial workstreams share a goal and require dependencies, a member roster or status tracking.`)
    lines.push('When choosing AgentTeams, follow the plugin\'s existing captain protocol and inspect existing team state when appropriate (\`agent_teams_status\` if visible). Prefer continuing an existing team to creating a duplicate. Build a real roster and task dependency graph through AgentTeams tools; its Team collaboration workspace is the authoritative visual dashboard.')
    if (config.requireTeamApproval) {
      lines.push('Team safety: for a new team, use the native STAGED planning flow with \`approval: "required"\` where supported. After building the plan, WAIT for the user to choose Approve & Run in the native AgentTeams panel. Never call approval tools automatically, never use \`approval: "automatic"\` unless the user explicitly requests immediate execution for that task.')
    } else {
      lines.push('Team safety: follow AgentTeams native approval policy; only bypass plan review if the user explicitly requests immediate execution for the task.')
    }
    lines.push('Value Router compatibility: leave provider/model/reasoning_effort routing to AgentTeams and an installed valueRouterRouting service; do not override, guess, or substitute an unavailable route. Without that service, keep AgentTeams/native DSH routing behavior unchanged.')
    lines.push('Do not additionally launch native subagents for work already assigned to AgentTeams. If AgentTeams cannot initialize, explain that and fall back to native tools only when the task is safe and clearly independent; never bypass an explicit blocked route or refused approval.')
  }
  if (nativeTools.length > 0) {
    lines.push(nativeInstructions(config, nativeTools))
  }
  lines.push('If tools are unavailable, or there is no meaningful parallelism, work directly. Integrate actual child results, test work products, and disclose unfinished tasks. This is prompt guidance only; no UI, scheduler or concurrency enforcement is added by this plugin.')
  return lines.join('\n\n')
}

export function apply(ctx, config = {}) {
  const c = normalizeConfig(config)
  if (c.mode === 'off') return
  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'smart-subagents:delegation-policy',
      order: 2750,
      interpolate: false,
      text: ({ scope } = {}) => {
        const capability = detectCapabilities(ctx, scope)
        return buildPolicy(c, capability.nativeTools, capability.teamTools)
      },
    }),
    'smart-subagents.prompt-policy',
  )
}

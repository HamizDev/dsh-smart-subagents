/**
 * DSH Smart Subagents
 *
 * Prompt-level, model-driven automatic delegation policy. It deliberately does
 * not spawn children behind the agent's back, intercept messages, replace DSH
 * tools, or bypass the native permission/sandbox system.
 */
export const name = 'smart-subagents'
export const inject = ['systemPrompt', 'tools']

const MODES = new Set(['off', 'conservative', 'balanced', 'aggressive'])
const TOOL_CANDIDATES = Object.freeze([
  'subagent',
  'subagent_fork',
  'subagent_codex',
  'subagent_claude_code',
  'subagent_dsh_sdk',
])

export function normalizeConfig(input = {}) {
  const mode = MODES.has(input?.mode) ? input.mode : 'balanced'
  const raw = Number(input?.maxParallel)
  const maxParallel = Number.isInteger(raw) && raw >= 1 && raw <= 8 ? raw : 3
  return {
    mode,
    maxParallel,
    preferForkForContext: input?.preferForkForContext !== false,
  }
}

/** Inspect the model-visible tools for the *current scope*, not globally. */
export function visibleDelegationTools(ctx, scope) {
  if (!ctx?.tools || typeof ctx.tools.get !== 'function') return []
  return TOOL_CANDIDATES.filter(tool => ctx.tools.get(tool, scope) !== undefined)
}

const MODE_POLICIES = {
  conservative:
    'Delegate only if at least TWO genuinely independent, substantial workstreams exist and a subagent is likely to save wall-clock time or parent-context usage. Otherwise work directly.',
  balanced:
    'Proactively delegate when there are TWO or more independently verifiable, bounded workstreams, or one substantial independent investigation/review can run while you implement. For ordinary single-focus changes, work directly.',
  aggressive:
    'Favor delegating a substantive, bounded investigation, test, code review, or isolated module task when it can run independently. Do not delegate a trivial task or create children merely to meet a quota.',
}

/**
 * Text appears in the system prompt ONLY when the agent can see an actual
 * native subagent tool in its scope. The agent decides whether to call it.
 */
export function buildPolicy(config, visibleTools) {
  const c = normalizeConfig(config)
  if (c.mode === 'off' || visibleTools.length === 0) return ''
  const tools = visibleTools.map(s => `${s}`).join(', ')
  const hasSpawn = visibleTools.includes('subagent')
  const hasFork = visibleTools.includes('subagent_fork')

  const selection = [
    hasSpawn ? '`subagent` for a fresh, self-contained task with all required context in its prompt.' : '',
    hasFork ? '`subagent_fork` when the completed parent conversation materially improves the task.' : '',
    'Other visible provider-specific tools only when their backend is appropriate and available.',
  ].filter(Boolean).join(' ')

  return `# Smart Subagents — automatic delegation policy (DSH native)
You have the following REAL delegation tools in this scope: ${tools}.
Decide AUTOMATICALLY whether to use them. The user does NOT need to ask for subagents. However, calling a tool remains your decision; this is a policy, not an obligatory spawn operation.

Dispatch threshold (${c.mode}): ${MODE_POLICIES[c.mode]}

Workflow:
1. First identify the critical path and independent tasks. Do not delegate sequential dependencies, tiny edits, simple Q&A, trivial lookups, or tasks needing sensitive permissions unavailable to a child.
2. If the threshold is met, start no more than ${c.maxParallel} child agents concurrently, always within DSH's tighter native limit if one exists. Give each child a focused, bounded, measurable deliverable, relevant paths and requirements, expected evidence, and an explicit file ownership boundary.
3. ${selection} ${c.preferForkForContext ? 'Prefer fork for genuinely context-dependent work; otherwise prefer fresh spawn.' : 'Prefer fresh spawn for isolated work whenever available.'}
4. Parallelize READ-ONLY reconnaissance, test design, and independent review by default. Permit concurrent editing only with disjoint files and no shared generated artifacts or destructive shell operations. The parent handles integration, conflicts, review, and final tests. Avoid spawning a child to independently rewrite the same files.
5. Use native background mode when appropriate; continue useful independent parent work while children run. Collect actual results or completion notices and verify material claims before concluding. Never represent a launched or running task as completed.
6. Do not recursively delegate from a child. Respect native tool restrictions, approval rules, sandbox policy, model-route authorization, depth limits, and the user's explicit instructions. Do not pass secrets, tokens, or unnecessary private data to children.
7. If the delegation tool is unavailable, errors, or is over budget, proceed directly. Avoid retry loops and unnecessary token expense. Summarize delegated contributions and limitations in the final result.

This policy changes only task-routing guidance. It neither creates agents itself nor guarantees the model will delegate.`
}

export function apply(ctx, config = {}) {
  const resolved = normalizeConfig(config)
  if (resolved.mode === 'off') return
  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'smart-subagents:delegation-policy',
      order: 2750, // before DSH's TOOL_SUBAGENT (2800) instruction
      interpolate: false,
      text: ({ scope } = {}) => buildPolicy(resolved, visibleDelegationTools(ctx, scope)),
    }),
    'smart-subagents.prompt-policy',
  )
}

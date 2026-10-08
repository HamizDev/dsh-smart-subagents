import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeConfig, detectCapabilities, visibleDelegationTools,
  visibleTeamTools, buildPolicy, apply,
} from '../index.js'

const stub = (allowed) => ({ tools: { get: (name, scope) => scope === 'captain' && allowed.includes(name) ? { name } : undefined } })

test('v0.2 configuration defaults and rejects invalid numbers and modes', () => {
  assert.deepEqual(normalizeConfig(), {
    mode: 'balanced', maxParallel: 3, preferForkForContext: true,
    preferAgentTeams: true, teamMinWorkstreams: 2, requireTeamApproval: true,
  })
  assert.equal(normalizeConfig({ mode: 'invalid', maxParallel: 9, teamMinWorkstreams: 1 }).mode, 'balanced')
  assert.equal(normalizeConfig({ maxParallel: '4' }).maxParallel, 3)
  assert.equal(normalizeConfig({ maxParallel: 8, teamMinWorkstreams: 6 }).teamMinWorkstreams, 6)
  assert.equal(normalizeConfig({ mode: 'off' }).mode, 'off')
})

test('a child with only team status is not treated as a captain', () => {
  const ctx = stub(['agent_teams_status', 'subagent_fork'])
  const result = detectCapabilities(ctx, 'captain')
  assert.equal(result.canCreateTeam, false)
  assert.deepEqual(visibleTeamTools(ctx, 'captain'), ['agent_teams_status'])
  assert.deepEqual(visibleDelegationTools(ctx, 'other'), [])
})

test('no tools / off mode produce no injected instructions', () => {
  assert.equal(buildPolicy({}, [], []), '')
  assert.equal(buildPolicy({ mode: 'off' }, ['subagent'], ['agent_teams_create']), '')
})

test('native-only mode preserves autonomous independent delegation', () => {
  const text = buildPolicy({ mode: 'balanced', maxParallel: 2 }, ['subagent', 'subagent_fork'], [])
  assert.match(text, /at most 2 simultaneous native workers/)
  assert.match(text, /subagent_fork/)
  assert.doesNotMatch(text, /AgentTeams is installed/)
})

test('team-enabled mode uses actual AgentTeams interface, staged approval and router ownership', () => {
  const text = buildPolicy({ mode: 'balanced' }, ['subagent'], ['agent_teams_create', 'agent_teams_status'])
  assert.match(text, /AgentTeams is installed/)
  assert.match(text, /approval: "required"/)
  assert.match(text, /WAIT for the user/)
  assert.match(text, /valueRouterRouting/)
  assert.match(text, /Do not additionally launch native subagents/)
  assert.match(text, /authoritative visual dashboard/)
})

test('teams-only mode works without native subagent tools', () => {
  const text = buildPolicy({ mode: 'aggressive' }, [], ['agent_teams_create'])
  assert.match(text, /AgentTeams is installed/)
  assert.doesNotMatch(text, /Native tools available:/)
})

test('disabled team integration leaves native-only fallback even if team tools exist', () => {
  const text = buildPolicy({ preferAgentTeams: false }, ['subagent'], ['agent_teams_create'])
  assert.doesNotMatch(text, /AgentTeams is installed/)
  assert.match(text, /Native tools available/)
})

test('no approval bypass is advised even when review setting is disabled', () => {
  const text = buildPolicy({ requireTeamApproval: false }, [], ['agent_teams_create'])
  assert.match(text, /only bypass plan review if the user explicitly requests/)
})

test('Cordis section dynamically respects scope changes and disposes', () => {
  let definition, disposed = false, registrations = 0
  const ctx = {
    ...stub(['agent_teams_create', 'subagent']),
    systemPrompt: { section: s => { definition = s; registrations++; return () => { disposed = true } } },
    effect: fn => { const dispose = fn(); assert.equal(typeof dispose, 'function'); dispose() },
  }
  apply(ctx, { mode: 'balanced' })
  assert.equal(registrations, 1)
  assert.equal(definition.order, 2750)
  assert.equal(definition.interpolate, false)
  assert.match(definition.text({ scope: 'captain' }), /AgentTeams is installed/)
  assert.equal(definition.text({ scope: 'child' }), '')
  assert.equal(disposed, true)
})

test('off does not mount any effect', () => {
  apply({ effect: () => { throw new Error('not off') } }, { mode: 'off' })
})

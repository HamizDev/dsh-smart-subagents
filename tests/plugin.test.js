import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeConfig, visibleDelegationTools, buildPolicy, apply } from '../index.js'

test('configuration uses safe defaults and clamps invalid values', () => {
  assert.deepEqual(normalizeConfig({}), { mode: 'balanced', maxParallel: 3, preferForkForContext: true })
  assert.equal(normalizeConfig({ mode: 'unknown' }).mode, 'balanced')
  assert.equal(normalizeConfig({ maxParallel: 999 }).maxParallel, 3)
  assert.equal(normalizeConfig({ maxParallel: 2 }).maxParallel, 2)
  assert.equal(normalizeConfig({ mode: 'off' }).mode, 'off')
})

test('disabled and missing-native-tools cases do not inject guidance', () => {
  assert.equal(buildPolicy({ mode: 'off' }, ['subagent']), '')
  assert.equal(buildPolicy({ mode: 'balanced' }, []), '')
})

test('policy encourages bounded autonomous delegation without claiming hard enforcement', () => {
  const policy = buildPolicy({ mode: 'aggressive', maxParallel: 2 }, ['subagent', 'subagent_fork'])
  assert.match(policy, /Decide AUTOMATICALLY/)
  assert.match(policy, /no more than 2 child agents/)
  assert.match(policy, /subagent_fork/)
  assert.match(policy, /READ-ONLY reconnaissance/)
  assert.match(policy, /neither creates agents itself nor guarantees/)
})

test('native tools are checked per agent scope, not assumed globally', () => {
  const a = { id: 'agent-a' }
  const b = { id: 'agent-b' }
  const ctx = {
    tools: { get: (tool, scope) => scope === a && tool === 'subagent' ? { name: tool } : undefined },
  }
  assert.deepEqual(visibleDelegationTools(ctx, a), ['subagent'])
  assert.deepEqual(visibleDelegationTools(ctx, b), [])
})

test('plugin installs dynamic section via Cordis effect and disposes it', () => {
  let section
  let disposed = false
  let sectionCount = 0
  const a = { id: 'agent-a' }
  const b = { id: 'agent-b' }
  const ctx = {
    tools: { get: (tool, scope) => scope === a && tool === 'subagent' ? { name: tool } : undefined },
    systemPrompt: { section: value => { section = value; sectionCount++; return () => { disposed = true } } },
    effect: fn => { const dispose = fn(); assert.equal(typeof dispose, 'function'); dispose() },
  }
  apply(ctx, { mode: 'balanced', maxParallel: 2 })
  assert.equal(sectionCount, 1)
  assert.equal(section.order, 2750)
  assert.equal(section.interpolate, false)
  assert.match(section.text({ scope: a }), /no more than 2/)
  assert.equal(section.text({ scope: b }), '')
  assert.equal(disposed, true)
})

test('off mode does not register anything', () => {
  apply({ effect: () => { throw new Error('unexpected effect') } }, { mode: 'off' })
})

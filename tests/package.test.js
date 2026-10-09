import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const text = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const pkg = JSON.parse(text('package.json'))
const yaml = text('cordis.patch.yml')

test('one-install package pins real AgentTeams and declares a Cordis bundle', () => {
  assert.equal(pkg.name, '@hamizdev/dsh-smart-subagents')
  assert.equal(pkg.version, '0.3.0')
  assert.equal(pkg.dependencies['@nanmicoder/dsh-agent-teams'], '0.1.22')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.publishConfig.access, 'public')
})

test('bundle explicitly mounts each plugin once under its canonical id', () => {
  assert.equal((yaml.match(/id: agent-teams\\b/g) || []).length, 1)
  assert.equal((yaml.match(/id: smart-subagents\\b/g) || []).length, 1)
  assert.equal((yaml.match(/name: '@nanmicoder\\/dsh-agent-teams'/g) || []).length, 1)
  assert.equal((yaml.match(/name: '@hamizdev\\/dsh-smart-subagents'/g) || []).length, 1)
  assert.ok(yaml.indexOf('id: agent-teams') < yaml.indexOf('id: smart-subagents'))
  assert.match(yaml, /memberProvider: spawn/)
})

test('both README languages document one-install and optional Value Router', () => {
  for (const path of ['README.md', 'README.zh-CN.md']) {
    const content = text(path)
    assert.match(content, /@hamizdev\\/dsh-smart-subagents@0\\.3\\.0/)
    assert.match(content, /Value Router/)
  }
  assert.equal(pkg.dependencies['@gjs27/dsh-value-router'], undefined)
})

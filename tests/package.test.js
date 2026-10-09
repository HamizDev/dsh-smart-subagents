import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const text = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const pkg = JSON.parse(text('package.json'))
const yaml = text('cordis.patch.yml')

test('one-install package pins real AgentTeams and declares a Cordis bundle', () => {
  assert.equal(pkg.name, '@hamizdev/dsh-smart-subagents')
  assert.match(pkg.version, /^0\.3\.[0-9]+$/)
  assert.equal(pkg.dependencies['@nanmicoder/dsh-agent-teams'], '0.1.22')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.publishConfig.access, 'public')
})

test('bundle explicitly mounts each plugin once under its canonical id', () => {
  assert.equal((yaml.match(/id: agent-teams\b/g) || []).length, 1)
  assert.equal((yaml.match(/id: smart-subagents\b/g) || []).length, 1)
  assert.equal((yaml.match(/name: '@nanmicoder\/dsh-agent-teams'/g) || []).length, 1)
  assert.equal((yaml.match(/name: '@hamizdev\/dsh-smart-subagents'/g) || []).length, 1)
  assert.ok(yaml.indexOf('id: agent-teams') < yaml.indexOf('id: smart-subagents'))
  assert.match(yaml, /memberProvider: spawn/)
})

test('both README languages document one-install and optional Value Router', () => {
  for (const path of ['README.md', 'README.zh-CN.md']) {
    const content = text(path)
    assert.ok(content.includes(`@hamizdev/dsh-smart-subagents@${pkg.version}`))
    assert.match(content, /Value Router/)
  }
  assert.equal(pkg.dependencies['@gjs27/dsh-value-router'], undefined)
})

test('OIDC publishing workflow matches npm trusted publisher and runs on version bump', () => {
  const content = text('.github/workflows/publish-npm.yml')
  assert.match(content, /name: Publish to npm/)
  assert.match(content, /id-token: write/)
  assert.match(content, /package.json/)
  assert.match(content, /npm publish --access public/)
  assert.match(content, /package-manager-cache: false/)
  assert.doesNotMatch(content, /NODE_AUTH_TOKEN/)
})

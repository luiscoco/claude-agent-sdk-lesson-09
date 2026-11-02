import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectSettings, type Resolver } from '../src/server/settings.js';
test('alpha settings inspection requires explicit opt-in', async () => {
  await assert.rejects(inspectSettings({ sources: 'project', experimentalOptIn: false }));
});
test('settings projection never returns raw environment, host paths or permission rule contents', async () => {
  const resolver: Resolver = async (options) => {
    assert.deepEqual(options?.settingSources, ['project', 'local']);
    return {
      effective: {
        env: { SECRET: 'PRIVATE' },
        model: 'PRIVATE',
        permissions: { defaultMode: 'dontAsk', deny: ['Bash', 'PRIVATE'] },
      },
      provenance: { permissions: { source: 'local', path: 'PRIVATE' } },
      sources: [{ source: 'local', settings: { env: { SECRET: 'PRIVATE' } }, path: 'PRIVATE' }],
    };
  };
  const r = await inspectSettings({ sources: 'project-local', experimentalOptIn: true }, resolver);
  assert.equal(r.rawDefaultMode, 'dontAsk');
  assert.equal(r.fixtureBashDenyPresent, true);
  assert.ok(!JSON.stringify(r).includes('PRIVATE'));
  assert.match(r.caveat, /not a permission decision/);
});
test('actual bundled settings helper exposes selected diagnostic fields', async () => {
  const r = await inspectSettings({ sources: 'project-local', experimentalOptIn: true });
  assert.equal(r.status, 'alpha');
  assert.ok(r.contributingSources.includes('project'));
  assert.ok(r.contributingSources.includes('local'));
  assert.ok(!('effective' in r));
});

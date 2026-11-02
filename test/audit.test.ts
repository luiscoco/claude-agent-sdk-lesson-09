import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditCode } from '../src/server/audit.js';
import { PRESETS, RunSchema } from '../src/shared/model.js';
const audit = (code: string) => auditCode({ code, fromVersion: '0.3.282' });
test('historical preset inventories package, session and TodoWrite mappings', () => {
  const r = audit(PRESETS.historical);
  assert.equal(r.syntax.length, 0);
  const rules = r.findings.map((x) => x.rule);
  for (const rule of ['old-package', 'historical-session', 'todo-pattern'])
    assert.ok(rules.includes(rule));
  assert.ok(r.findings.every((f) => f.line > 0 && f.column > 0));
  assert.ok(r.findings.find((f) => f.rule === 'todo-pattern')!.detail.includes('still appears'));
});
test('conceptual slide flags option nesting while modern reference has no migration findings', () => {
  assert.equal(
    audit(PRESETS.conceptual).findings.filter((x) => x.rule === 'options-nesting').length,
    2,
  );
  assert.ok(
    !audit(PRESETS.modern).findings.some(
      (x) => x.status === 'migration' || x.status === 'historical',
    ),
  );
});
test('alpha helpers stay distinct from deprecated guidance', () => {
  const r = audit(PRESETS.alpha);
  assert.ok(r.findings.some((x) => x.status === 'alpha' && x.title.includes('prewarm')));
  assert.ok(r.findings.some((x) => x.status === 'alpha' && x.title.includes('resolveSettings')));
  assert.ok(!r.findings.some((x) => x.status === 'migration'));
});
test('comments, strings and unrelated library calls are not SDK APIs', () => {
  assert.equal(
    audit(`// prewarm(); unstable_v2_createSession();
const note = "query({allowedTools:['TodoWrite']})";
import { prewarm, query } from 'unrelated-library';
prewarm(); query({ allowedTools: [] });`).findings.length,
    0,
  );
});
test('renamed and namespace SDK imports are recognized', () => {
  const r = audit(`import {query as run} from '@anthropic-ai/claude-agent-sdk';
import * as sdk from '@anthropic-ai/claude-agent-sdk';
run({prompt:'x',allowedTools:[]}); sdk.resolveSettings();`);
  assert.ok(r.findings.some((x) => x.rule === 'options-nesting'));
  assert.ok(r.findings.some((x) => x.rule === 'alpha-helper'));
});
test('syntax diagnostics, input bounds and fingerprint revisions are explicit', () => {
  assert.ok(audit('const broken = ;').syntax.length > 0);
  assert.equal(audit(PRESETS.modern).fingerprint, audit(PRESETS.modern).fingerprint);
  assert.notEqual(audit(PRESETS.modern).fingerprint, audit(PRESETS.modern + '\n').fingerprint);
  assert.throws(() => audit('x'.repeat(24001)));
  assert.throws(() => auditCode({ code: 'x', fromVersion: 'unknown', path: 'outside.ts' }));
});
test('inventory parses without executing code or leaking pasted credential text', () => {
  const r = audit(`globalThis.LESSON9_SENTINEL = true;
throw new Error('sk-ant-test_secret');`);
  assert.equal((globalThis as { LESSON9_SENTINEL?: boolean }).LESSON9_SENTINEL, undefined);
  assert.ok(!JSON.stringify(r).includes('sk-ant-test_secret'));
});
test('prewarm requires opt-in while baseline does not', () => {
  assert.equal(
    RunSchema.safeParse({ scenario: 'tasks', startup: 'prewarm', experimentalOptIn: false })
      .success,
    false,
  );
  assert.equal(
    RunSchema.safeParse({ scenario: 'tasks', startup: 'cold', experimentalOptIn: false }).success,
    true,
  );
});

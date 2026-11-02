import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Options, HookInput, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import {
  runVerification,
  practiceReport,
  claimGuidance,
  SUBJECT,
  type Dependencies,
  type QueryPort,
  type SparePort,
} from '../src/server/verify.js';
const config = { scenario: 'tasks' as const, startup: 'cold' as const, experimentalOptIn: false };
const success = {
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'Test final',
  total_cost_usd: 0.01,
} as SDKMessage;
const context = { signal: new AbortController().signal };
async function post(options: Options, name: string, tool_input: unknown, tool_response: unknown) {
  return options.hooks!.PostToolUse![0]!.hooks[0]!(
    { hook_event_name: 'PostToolUse', tool_name: name, tool_input, tool_response } as HookInput,
    'test-tool',
    context,
  );
}
async function pre(options: Options, name: string, tool_input: unknown) {
  return options.hooks!.PreToolUse![0]!.hooks[0]!(
    { hook_event_name: 'PreToolUse', tool_name: name, tool_input } as HookInput,
    'test-tool',
    context,
  );
}
function handle(options: Options, runTools = true, onClose = () => {}): QueryPort {
  return {
    close: onClose,
    [Symbol.asyncIterator]: async function* () {
      if (runTools) {
        await post(
          options,
          'TaskCreate',
          { subject: SUBJECT },
          { task: { id: 'own', subject: SUBJECT } },
        );
        await post(
          options,
          'TaskUpdate',
          { taskId: 'own', status: 'completed' },
          { success: true, taskId: 'own' },
        );
        await post(
          options,
          'TaskGet',
          { taskId: 'own' },
          { task: { id: 'own', status: 'completed' } },
        );
        await post(options, 'TaskList', {}, { tasks: [{ id: 'own', status: 'completed' }] });
      }
      yield success;
    },
  };
}
const noWarm = async () => {
  throw Error('Unexpected prewarm');
};
test('cold verification checks actual callback evidence and closes resources', async () => {
  let closed = false;
  const deps: Dependencies = {
    prewarm: noWarm,
    query: ({ options }) => {
      assert.deepEqual(options?.tools, ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList']);
      assert.equal(options?.maxBudgetUsd, 0.35);
      assert.equal(options?.permissionMode, 'default');
      assert.deepEqual(options?.skills, []);
      return handle(options!, true, () => {
        closed = true;
      });
    },
  };
  const report = await runVerification(config, new AbortController().signal, () => {}, deps);
  assert.equal(report.verified, true);
  assert.ok(closed);
  assert.equal(report.events.at(-1)?.step, 'Host cleanup');
});
test('a successful final alone cannot pass task behavior checks', async () => {
  const report = await runVerification(config, new AbortController().signal, () => {}, {
    prewarm: noWarm,
    query: ({ options }) => handle(options!, false),
  });
  assert.equal(report.sdkOk, true);
  assert.equal(report.verified, false);
  assert.ok(report.checks.some((x) => !x.passed));
});
test('task ownership guards deny foreign writes and permit only completing the created task', async () => {
  const deps: Dependencies = {
    prewarm: noWarm,
    query: ({ options }) => ({
      close() {},
      [Symbol.asyncIterator]: async function* () {
        const denied = await pre(options!, 'TaskUpdate', {
          taskId: 'foreign',
          status: 'completed',
        });
        assert.ok(JSON.stringify(denied).includes('deny'));
        const wrongSubject = await pre(options!, 'TaskCreate', { subject: 'unrelated' });
        assert.ok(JSON.stringify(wrongSubject).includes('deny'));
        await post(options!, 'TaskCreate', { subject: SUBJECT }, { task: { id: 'own' } });
        assert.deepEqual(
          await pre(options!, 'TaskUpdate', { taskId: 'own', status: 'completed' }),
          {},
        );
        assert.ok(
          JSON.stringify(
            await pre(options!, 'TaskUpdate', {
              taskId: 'own',
              status: 'completed',
              description: 'changed',
            }),
          ).includes('deny'),
        );
        yield success;
      },
    }),
  };
  await runVerification(config, new AbortController().signal, () => {}, deps);
});
test('permission scenario separates host decision from protected handler execution', async () => {
  const deps: Dependencies = {
    prewarm: noWarm,
    query: ({ options }) => ({
      close() {},
      [Symbol.asyncIterator]: async function* () {
        assert.deepEqual(options!.tools, []);
        const decision = await options!.canUseTool!(
          'mcp__migration__restricted_note',
          {},
          { signal: new AbortController().signal, toolUseID: 'test', requestId: 'test-request' },
        );
        assert.equal(decision?.behavior, 'deny');
        yield success;
      },
    }),
  };
  const r = await runVerification(
    { ...config, scenario: 'permission' },
    new AbortController().signal,
    () => {},
    deps,
  );
  assert.equal(r.permissions, 1);
  assert.equal(r.protectedCalls, 0);
  assert.equal(r.verified, true);
});
test('alpha spare is claimed once and host options stay at preparation', async () => {
  let claims = 0,
    closed = 0;
  const deps: Dependencies = {
    query: () => {
      throw Error('Unexpected cold fallback');
    },
    prewarm: async ({ options } = {}) => ({
      claimed: Promise.resolve({
        cwd: 'fixture',
        sessionId: 'test',
        parkedMs: 5,
        sdkMcpSettled: true,
      }),
      close() {
        closed++;
      },
      claim(params) {
        claims++;
        assert.ok(params.options.cwd.includes('fixtures'));
        assert.ok(!('tools' in params.options));
        return handle(options!);
      },
    }),
  };
  const r = await runVerification(
    { ...config, startup: 'prewarm', experimentalOptIn: true },
    new AbortController().signal,
    () => {},
    deps,
  );
  assert.equal(r.verified, true);
  assert.equal(claims, 1);
  assert.equal(closed, 1);
});
test('option_not_applied consumes existing query and never repeats the prompt', async () => {
  let cold = 0;
  const deps: Dependencies = {
    query: () => {
      cold++;
      throw Error('Must not repeat');
    },
    prewarm: async ({ options } = {}) => ({
      claimed: Promise.reject(Error('option_not_applied: model')),
      close() {},
      claim: () => handle(options!),
    }),
  };
  const r = await runVerification(
    { ...config, startup: 'prewarm', experimentalOptIn: true },
    new AbortController().signal,
    () => {},
    deps,
  );
  assert.equal(r.verified, true);
  assert.equal(cold, 0);
  assert.ok(r.events.some((x) => x.step === 'Claim option warning'));
});
test('refused claim closes both handles without an automatic cold retry', async () => {
  let closed = 0;
  const deps: Dependencies = {
    query: () => {
      throw Error('Must not retry');
    },
    prewarm: async ({ options } = {}) => ({
      claimed: Promise.reject(Error('cwd_not_found: fixture')),
      close() {
        closed++;
      },
      claim: () => handle(options!, false, () => closed++),
    }),
  };
  await assert.rejects(
    runVerification(
      { ...config, startup: 'prewarm', experimentalOptIn: true },
      new AbortController().signal,
      () => {},
      deps,
    ),
    /Claim refused/,
  );
  assert.equal(closed, 2);
});
test('pre-aborted, invalid and missing-result runs do not fabricate a report', async () => {
  const deps: Dependencies = {
    prewarm: noWarm,
    query: () => {
      throw Error('Should not create query');
    },
  };
  await assert.rejects(runVerification(config, AbortSignal.abort(), () => {}, deps));
  await assert.rejects(
    runVerification(
      { ...config, startup: 'prewarm' },
      new AbortController().signal,
      () => {},
      deps,
    ),
  );
  await assert.rejects(
    runVerification(config, new AbortController().signal, () => {}, {
      prewarm: noWarm,
      query: () => ({ close() {}, [Symbol.asyncIterator]: async function* () {} }),
    }),
    /without a result/,
  );
});
test('claim guidance distinguishes known refusal from already-running and unknown states', () => {
  assert.match(claimGuidance('option_not_applied: model'), /never automatically repeat/);
  assert.match(claimGuidance('cwd_not_found: folder'), /did not run/);
  assert.match(claimGuidance('new_error'), /not established/);
});
test('practice is explicitly synthetic', () => {
  const r = practiceReport(config);
  assert.equal(r.origin, 'practice');
  assert.ok(r.events[0]!.detail.includes('No SDK query'));
  assert.equal(r.costUsd, 0);
});

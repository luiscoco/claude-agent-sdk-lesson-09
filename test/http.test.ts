import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApiHandler } from '../src/server/app.js';
import { PRESETS } from '../src/shared/model.js';
import { eventParser } from '../src/shared/sse.js';
async function serve(api: ReturnType<typeof createApiHandler>) {
  const server = createServer((q, s) => void api(q, s));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    base,
    async close() {
      await api.dispose();
      server.closeAllConnections();
      await new Promise<void>((r, e) => server.close((x) => (x ? e(x) : r())));
    },
  };
}
const config = { scenario: 'tasks', startup: 'cold', experimentalOptIn: false };
test('HTTP validates origin, content type, input bounds, alpha gates and credentials', async () => {
  const host = await serve(createApiHandler({ liveAvailable: false }));
  const post = (p: string, x: unknown, headers = {}) =>
    fetch(host.base + p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(x),
    });
  try {
    const meta = await (await fetch(host.base + '/api/meta')).json();
    assert.equal(meta.liveAvailable, false);
    assert.ok(!('ANTHROPIC_API_KEY' in meta));
    assert.equal((await post('/api/verify', { mode: 'live', config })).status, 409);
    assert.equal(
      (await post('/api/verify', { mode: 'practice', config: { ...config, startup: 'prewarm' } }))
        .status,
      400,
    );
    assert.equal(
      (await post('/api/settings', { sources: 'project', experimentalOptIn: false })).status,
      400,
    );
    assert.equal(
      (
        await post(
          '/api/audit',
          { code: PRESETS.modern, fromVersion: 'unknown' },
          { Origin: 'https://outside.example' },
        )
      ).status,
      403,
    );
    assert.equal(
      (await fetch(host.base + '/api/audit', { method: 'POST', body: '{}' })).status,
      415,
    );
    assert.equal(
      (await post('/api/audit', { code: 'x'.repeat(33000), fromVersion: 'unknown' })).status,
      400,
    );
    const report = await (await post('/api/verify', { mode: 'practice', config })).json();
    assert.equal(report.report.origin, 'practice');
    const audit = await (
      await post('/api/audit', { code: PRESETS.historical, fromVersion: '0.3.282' })
    ).json();
    assert.ok(audit.findings.length > 0);
    const ref = await (await fetch(host.base + '/api/reference')).json();
    assert.equal(ref.filename, 'src/examples/modern-query.ts');
    assert.ok(ref.code.includes('permissionMode'));
  } finally {
    await host.close();
  }
});
test('live admission is single-run and shutdown aborts work with cleanup', async () => {
  let closed = 0;
  let markCreated!: () => void;
  const created = new Promise<void>((resolve) => {
    markCreated = resolve;
  });
  const api = createApiHandler({
    liveAvailable: true,
    dependencies: {
      prewarm: async () => {
        throw Error('No alpha');
      },
      query: ({ options }) => {
        markCreated();
        return {
          close() {
            closed++;
          },
          [Symbol.asyncIterator]: async function* () {
            if (!options!.abortController!.signal.aborted)
              await new Promise<void>((r) =>
                options!.abortController!.signal.addEventListener('abort', () => r(), {
                  once: true,
                }),
              );
          },
        };
      },
    },
  });
  const host = await serve(api);
  const post = () =>
    fetch(host.base + '/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'live', config }),
    });
  try {
    const first = await post();
    assert.equal(first.status, 200);
    await created;
    assert.equal((await post()).status, 409);
    await api.dispose();
    const body = await first.text();
    assert.ok(body.includes('cancelled'));
    assert.equal(closed, 1);
  } finally {
    await host.close();
  }
});
test('SSE parser retains partial messages and skips heartbeat frames', () => {
  const values: unknown[] = [];
  const parse = eventParser((x) => values.push(x));
  parse(': waiting\n\ndata: {"kind":');
  parse('"report"}\n\ndata: {"kind":"done"}\n\n');
  assert.deepEqual(values, [{ kind: 'report' }, { kind: 'done' }]);
});

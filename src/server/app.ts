import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { VERSION, RunSchema, clean } from '../shared/model.js';
import { auditCode } from './audit.js';
import { inspectSettings, type Resolver } from './settings.js';
import { practiceReport, runVerification, type Dependencies } from './verify.js';
import { PROJECT_ROOT } from './paths.js';
export function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 32768) throw Error('Body too large');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
export function createApiHandler(
  options: { liveAvailable?: boolean; dependencies?: Dependencies; resolver?: Resolver } = {},
) {
  let active: AbortController | undefined,
    finished: Promise<void> | undefined,
    closing = false;
  const available = () => options.liveAvailable ?? Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const api = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (!pathname.startsWith('/api/')) return false;
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) {
      json(res, 403, { error: 'Use the loopback application URL.' });
      return true;
    }
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
      json(res, 403, { error: 'Cross-origin requests refused.' });
      return true;
    }
    if (closing) {
      json(res, 503, { error: 'The host is closing.' });
      return true;
    }
    if (req.method === 'GET' && pathname === '/api/meta') {
      json(res, 200, {
        version: VERSION,
        liveAvailable: available(),
        model: process.env.ANTHROPIC_MODEL || 'SDK default',
      });
      return true;
    }
    if (req.method === 'GET' && pathname === '/api/reference') {
      json(res, 200, {
        filename: 'src/examples/modern-query.ts',
        code: await readFile(path.join(PROJECT_ROOT, 'src/examples/modern-query.ts'), 'utf8'),
      });
      return true;
    }
    if (
      req.method !== 'POST' ||
      !['/api/audit', '/api/settings', '/api/verify'].includes(pathname)
    ) {
      json(res, 404, { error: 'Unknown endpoint.' });
      return true;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      json(res, 415, { error: 'Send application/json.' });
      return true;
    }
    let input: unknown;
    try {
      input = await body(req);
    } catch {
      json(res, 400, { error: 'Provide valid JSON no larger than 32 KB.' });
      return true;
    }
    if (pathname === '/api/audit') {
      try {
        json(res, 200, auditCode(input));
      } catch {
        json(res, 400, {
          error: 'Supply TypeScript text up to 24,000 characters and a supported version context.',
        });
      }
      return true;
    }
    if (pathname === '/api/settings') {
      try {
        json(res, 200, await inspectSettings(input, options.resolver));
      } catch {
        json(res, 400, {
          error:
            'Settings inspection requires alpha opt-in and project or project-local fixture sources; host resolution may also be unavailable.',
        });
      }
      return true;
    }
    const parsed = z
      .strictObject({ mode: z.enum(['practice', 'live']), config: RunSchema })
      .safeParse(input);
    if (!parsed.success) {
      json(res, 400, {
        error: 'Choose a fixed scenario and startup path. Prewarm requires explicit alpha opt-in.',
      });
      return true;
    }
    if (parsed.data.mode === 'practice') {
      json(res, 200, { report: practiceReport(parsed.data.config) });
      return true;
    }
    if (!available()) {
      json(res, 409, {
        error:
          'Live verification requires your server-side ANTHROPIC_API_KEY. Audit and practice work without it.',
      });
      return true;
    }
    if (active) {
      json(res, 409, { error: 'One live verification is already active. Stop it first.' });
      return true;
    }
    const controller = new AbortController();
    active = controller;
    let release!: () => void;
    const completion = new Promise<void>((r) => {
      release = r;
    });
    finished = completion;
    const disconnect = () => controller.abort();
    res.on('close', disconnect);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const send = (event: unknown) => {
      if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(': waiting\n\n');
    }, 10000);
    try {
      const report = await runVerification(
        parsed.data.config,
        controller.signal,
        (event) => send({ kind: 'event', event }),
        options.dependencies,
      );
      send({ kind: 'report', report });
      send({ kind: 'done', status: report.verified ? 'verified' : 'checks-failed' });
    } catch (e) {
      send({
        kind: 'error',
        message: controller.signal.aborted
          ? 'Verification cancelled; no final report means execution counts are unknown.'
          : clean(e instanceof Error ? e.message : 'Verification failed.'),
      });
      send({ kind: 'done', status: controller.signal.aborted ? 'cancelled' : 'error' });
    } finally {
      clearInterval(heartbeat);
      res.removeListener('close', disconnect);
      controller.abort();
      active = undefined;
      res.end();
      release();
      if (finished === completion) finished = undefined;
    }
    return true;
  };
  return Object.assign(api, {
    async dispose() {
      closing = true;
      active?.abort();
      await finished;
    },
  });
}

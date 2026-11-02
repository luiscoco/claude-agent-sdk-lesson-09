import {
  query,
  prewarm,
  createSdkMcpServer,
  tool,
  type Query,
  type SpareProcess,
  type Options,
  type HookCallback,
  type SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { childEnvironment } from './config.js';
import { CONFIG_DIRECTORY, FIXTURE_ROOT } from './paths.js';
import {
  RunSchema,
  TASK_TOOLS,
  clean,
  type RunConfig,
  type Report,
  type RunEvent,
} from '../shared/model.js';
export const SUBJECT = 'Lesson 9 migration verification';
export const RESTRICTED = 'mcp__migration__restricted_note';
export type QueryPort = AsyncIterable<SDKMessage> & Pick<Query, 'close'>;
export type SparePort = Pick<SpareProcess, 'claimed' | 'close'> & {
  claim(input: Parameters<SpareProcess['claim']>[0]): QueryPort;
};
export type Dependencies = {
  query: (input: Parameters<typeof query>[0]) => QueryPort;
  prewarm: (input: Parameters<typeof prewarm>[0]) => Promise<SparePort>;
};
const real: Dependencies = { query, prewarm };
const object = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
function responseObject(x: unknown) {
  if (typeof x === 'string') {
    try {
      return object(JSON.parse(x));
    } catch {
      return {};
    }
  }
  return object(x);
}
export function claimGuidance(message: string) {
  const code = message.split(':')[0]!.trim();
  if (code === 'option_not_applied')
    return 'The prompt may already be running. Inspect the existing query; never automatically repeat it.';
  if (
    [
      'not_a_spare',
      'env_key_not_claimable',
      'cwd_not_found',
      'project_settings_not_claimable',
      'permission_mode_not_claimable',
      'claim_failed',
      'spare_exited',
      'spare_closed',
      'settings_not_applied',
    ].includes(code)
  )
    return 'The documented refusal says the prompt did not run. Release the spare before considering a new cold query.';
  return 'Execution state is not established. Do not automatically repeat the prompt.';
}
export function promptFor(config: RunConfig) {
  return config.scenario === 'permission'
    ? 'Call restricted_note exactly once with topic="migration". The host will deny it. Explain that denial in one sentence. Do not retry, invent contents, or call other tools.'
    : `Use only TaskCreate, TaskUpdate, TaskGet and TaskList. In this exact order: create one task with subject "${SUBJECT}" and description "Verify the Lesson 9 migration"; update only that new task to status completed (send only taskId and status); get that task; list tasks. Call each tool once. Finish with one short sentence explaining the observed task status. No TodoWrite, file operations or other work.`;
}
export function practiceReport(config: RunConfig): Report {
  return {
    origin: 'practice',
    sdkOk: true,
    verified: true,
    result:
      config.scenario === 'tasks'
        ? 'Synthetic example: the task was created, completed, inspected and listed.'
        : 'Synthetic example: the host denied access and the protected handler did not execute.',
    tools: config.scenario === 'tasks' ? Object.fromEntries(TASK_TOOLS.map((t) => [t, 1])) : {},
    permissions: config.scenario === 'permission' ? 1 : 0,
    protectedCalls: 0,
    costUsd: 0,
    startup: config.startup,
    checks:
      config.scenario === 'tasks'
        ? [
            ...TASK_TOOLS.map((name) => ({ name: `${name} observed`, passed: true })),
            { name: 'TaskGet and TaskList confirm completion', passed: true },
            { name: 'No TodoWrite execution', passed: true },
          ]
        : [
            { name: 'Host denial observed', passed: true },
            { name: 'Protected handler executions = 0', passed: true },
          ],
    events: [
      {
        step: 'Synthetic fixture',
        detail:
          'No SDK query, hook, task tool, prewarm or permission handler executes in practice.',
      },
      {
        step: 'Illustrated startup',
        detail:
          config.startup === 'prewarm'
            ? 'Synthetic prewarm → single claim → consume → close'
            : 'Synthetic ordinary query → consume → close',
      },
    ],
  };
}
export async function runVerification(
  input: unknown,
  signal: AbortSignal,
  onEvent: (event: RunEvent) => void = () => {},
  dependencies: Dependencies = real,
): Promise<Report> {
  const config = RunSchema.parse(input);
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 90000);
  const events: RunEvent[] = [];
  const emit = (step: string, detail: string) => {
    const event = { step, detail };
    events.push(event);
    onEvent(event);
  };
  const tools: Record<string, number> = {};
  const owned = new Set<string>();
  let getCompleted = false,
    listCompleted = false,
    permissions = 0,
    protectedCalls = 0;
  let handle: QueryPort | undefined, spare: SparePort | undefined;
  let final: Report | undefined;
  const deny = (reason: string) => ({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse' as const,
      permissionDecision: 'deny' as const,
      permissionDecisionReason: reason,
    },
  });
  const pre: HookCallback = async (input) => {
    if (input.hook_event_name !== 'PreToolUse') return {};
    const args = object(input.tool_input);
    if (input.tool_name === 'TaskCreate' && (owned.size > 0 || args.subject !== SUBJECT))
      return deny('Create exactly the single named lesson task.');
    if (
      input.tool_name === 'TaskUpdate' &&
      (!owned.has(String(args.taskId)) ||
        args.status !== 'completed' ||
        Object.keys(args).some((k) => !['taskId', 'status'].includes(k)))
    )
      return deny('Only complete the task created in this run.');
    if (input.tool_name === 'TaskGet' && !owned.has(String(args.taskId)))
      return deny('Read only the task created in this run.');
    return {};
  };
  const post: HookCallback = async (input) => {
    if (input.hook_event_name !== 'PostToolUse') return {};
    const name = input.tool_name;
    tools[name] = (tools[name] || 0) + 1;
    const result = responseObject(input.tool_response);
    if (name === 'TaskCreate') {
      const id = object(result.task).id;
      if (typeof id === 'string') owned.add(id);
    }
    if (name === 'TaskGet') {
      const task = object(result.task);
      getCompleted = owned.has(String(task.id)) && task.status === 'completed';
    }
    if (name === 'TaskList' && Array.isArray(result.tasks))
      listCompleted = result.tasks.some((t) => {
        const task = object(t);
        return owned.has(String(task.id)) && task.status === 'completed';
      });
    emit('Tool execution', `${name} completed; selected outcome recorded by PostToolUse.`);
    return {};
  };
  const server = createSdkMcpServer({
    name: 'migration-boundary',
    version: '1.0.0',
    tools: [
      tool(
        'restricted_note',
        'A protected note used only to verify a host denial. No note content may be released.',
        { topic: z.literal('migration') },
        async () => {
          protectedCalls++;
          return {
            content: [{ type: 'text', text: 'Protected fixture refuses execution directly.' }],
            isError: true,
          };
        },
        { annotations: { readOnlyHint: true, openWorldHint: false } },
      ),
    ],
  });
  try {
    await mkdir(CONFIG_DIRECTORY, { recursive: true });
    const parking = path.join(CONFIG_DIRECTORY, 'parking');
    await mkdir(parking, { recursive: true });
    controller.signal.throwIfAborted();
    const options: Options = {
      tools: config.scenario === 'tasks' ? [...TASK_TOOLS] : [],
      allowedTools: config.scenario === 'tasks' ? [...TASK_TOOLS] : [],
      mcpServers:
        config.scenario === 'permission'
          ? {
              migration: {
                ...server,
                tools: [{ name: 'restricted_note', permission_policy: 'always_ask' as const }],
              },
            }
          : {},
      permissionMode: 'default',
      skills: [],
      settingSources: [],
      persistSession: false,
      maxTurns: 8,
      maxBudgetUsd: 0.35,
      env: childEnvironment(),
      abortController: controller,
      hooks: {
        PreToolUse: [{ matcher: '^Task(Create|Update|Get|List)$', hooks: [pre] }],
        PostToolUse: [{ matcher: '^Task(Create|Update|Get|List)$', hooks: [post] }],
      },
      canUseTool: async (name) => {
        permissions++;
        emit('Permission decision', `${clean(name, 100)} denied by the separate host policy.`);
        return {
          behavior: 'deny',
          message: 'The lesson host denies this protected capability. Do not retry.',
        };
      },
      systemPrompt:
        'You are a concise migration verification tutor. Perform only the exact fixed task requested. Respect denials, do not use workarounds and report only observed outcomes.',
    };
    const model = process.env.ANTHROPIC_MODEL;
    if (config.startup === 'prewarm') {
      emit(
        'Alpha preparation',
        'Starting one spare with fixed host-level tools, permissions and environment.',
      );
      spare = await dependencies.prewarm({
        options: { ...options, cwd: parking },
        initializeTimeoutMs: 30000,
      });
      // Attach before claim/close: a parked spare can reject claimed asynchronously.
      const settlement = spare.claimed.then(
        (info) => ({ ok: true as const, info }),
        (error) => ({ ok: false as const, error }),
      );
      controller.signal.throwIfAborted();
      emit('Alpha claim', 'Binding the spare once to the fixed lesson workspace.');
      handle = spare.claim({
        prompt: promptFor(config),
        options: { cwd: FIXTURE_ROOT, permissionMode: 'default', ...(model ? { model } : {}) },
      });
      const claimed = await settlement;
      if (!claimed.ok) {
        const message = clean(
          claimed.error instanceof Error ? claimed.error.message : 'Unknown claim failure',
        );
        emit('Claim guidance', claimGuidance(message));
        if (!message.startsWith('option_not_applied')) throw Error('Claim refused: ' + message);
        emit(
          'Claim option warning',
          'The prompt may already be running; consume this query without a duplicate retry.',
        );
      } else
        emit(
          'Claim accepted',
          `Single-use spare accepted; parked ${Math.round(claimed.info.parkedMs || 0)} ms. This is not a latency benchmark.`,
        );
    } else {
      emit('Baseline query', 'Starting the ordinary query() path with explicit options.');
      handle = dependencies.query({
        prompt: promptFor(config),
        options: { ...options, cwd: FIXTURE_ROOT, ...(model ? { model } : {}) },
      });
    }
    for await (const message of handle) {
      controller.signal.throwIfAborted();
      if (message.type === 'result') {
        const sdkOk = message.subtype === 'success' && !message.is_error;
        const checks =
          config.scenario === 'tasks'
            ? [
                ...TASK_TOOLS.map((name) => ({
                  name: `${name} execution observed`,
                  passed: (tools[name] || 0) > 0,
                })),
                {
                  name: 'TaskGet and TaskList confirm completion',
                  passed: getCompleted && listCompleted,
                },
                { name: 'No TodoWrite execution', passed: !tools.TodoWrite },
              ]
            : [
                { name: 'Host denial observed', passed: permissions > 0 },
                { name: 'Protected handler executions = 0', passed: protectedCalls === 0 },
              ];
        final = {
          origin: 'live',
          sdkOk,
          verified: sdkOk && checks.every((c) => c.passed),
          result:
            message.subtype === 'success'
              ? clean(message.result)
              : 'The SDK returned an unsuccessful result.',
          tools: { ...tools },
          permissions,
          protectedCalls,
          costUsd: message.total_cost_usd,
          startup: config.startup,
          checks,
          events,
        };
        break;
      }
    }
    if (!final) throw Error('The SDK stream ended without a result.');
    return final;
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal.removeEventListener('abort', abort);
    try {
      handle?.close();
    } finally {
      try {
        spare?.close();
      } finally {
        await server.instance.close().catch(() => {});
        emit('Host cleanup', 'Query, spare, MCP server, timer and abort listener released.');
      }
    }
  }
}

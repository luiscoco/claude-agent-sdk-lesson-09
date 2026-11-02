import { z } from 'zod';
export const VERSION = '0.3.310';
export const TASK_TOOLS = ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'] as const;
export const AuditSchema = z.strictObject({
  code: z.string().min(1).max(24000),
  fromVersion: z.enum(['unknown', '0.3.282', '0.3.300', '0.3.310']),
});
export type AuditInput = z.infer<typeof AuditSchema>;
export type Status = 'recommended' | 'historical' | 'migration' | 'alpha' | 'review';
export type Finding = {
  rule: string;
  status: Status;
  title: string;
  detail: string;
  line: number;
  column: number;
};
export type Audit = {
  fingerprint: string;
  target: string;
  fromVersion: string;
  syntax: { message: string; line: number; column: number }[];
  findings: Finding[];
  limits: string;
};
export const RunSchema = z
  .strictObject({
    scenario: z.enum(['tasks', 'permission']),
    startup: z.enum(['cold', 'prewarm']),
    experimentalOptIn: z.boolean(),
  })
  .refine((x) => x.startup !== 'prewarm' || x.experimentalOptIn, {
    message: 'Prewarm requires explicit alpha opt-in.',
  });
export type RunConfig = z.infer<typeof RunSchema>;
export const SettingsSchema = z.strictObject({
  sources: z.enum(['project', 'project-local']),
  experimentalOptIn: z.literal(true),
});
export type RunEvent = { step: string; detail: string };
export type Report = {
  origin: 'practice' | 'live';
  sdkOk: boolean;
  verified: boolean;
  result: string;
  tools: Record<string, number>;
  permissions: number;
  protectedCalls: number;
  costUsd: number;
  startup: string;
  checks: { name: string; passed: boolean }[];
  events: RunEvent[];
};
export const clean = (x: unknown, max = 2500) =>
  typeof x === 'string' ? x.replace(/sk-ant-[\w-]+/g, '[redacted]').slice(0, max) : '';
export const PRESETS = {
  historical: `// Historical teaching sample. Never executed by this workbench.
import { unstable_v2_createSession } from '@anthropic-ai/claude-code';
const session = unstable_v2_createSession({
  allowedTools: ['TodoWrite'],
});
await session.send('Plan and track this work');
for await (const message of session.stream()) console.log(message.type);`,
  conceptual: `// Conceptual slide syntax: fix the options nesting before compiling.
import { query } from '@anthropic-ai/claude-agent-sdk';
for await (const msg of query({
  prompt: 'Plan and track this work',
  allowedTools: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'],
  skills: ['analysis'],
})) console.log(msg.type);`,
  alpha: `// Alpha APIs require deliberate lifecycle and fallback decisions.
import { prewarm, resolveSettings } from '@anthropic-ai/claude-agent-sdk';
const resolved = await resolveSettings({ cwd: folder, settingSources: ['project'] });
const spare = await prewarm({ options: hostOptions });
const q = spare.claim({ prompt: 'Plan the work', options: { cwd: folder } });
// Handle spare.claimed rejection, then consume and close q/spare.`,
  modern: `import { query } from '@anthropic-ai/claude-agent-sdk';
const q = query({
  prompt: 'Create one migration-check task, complete it, inspect it, then list tasks.',
  options: {
    tools: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'],
    allowedTools: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'],
    permissionMode: 'default',
    skills: [],
    settingSources: [],
    maxTurns: 8,
    maxBudgetUsd: 0.35,
    persistSession: false,
  },
});
try { for await (const msg of q) console.log(msg.type); }
finally { q.close(); }`,
} as const;
export const CHECKLIST = [
  {
    id: 'inventory',
    title: 'Inventory imports and API status',
    text: 'Identify package names, historical session calls and experimental helpers; record the source and target versions.',
  },
  {
    id: 'shape',
    title: 'Move configuration into options',
    text: 'Use query({ prompt, options: { ... } }). Keep executable TypeScript distinct from conceptual slide shorthand.',
  },
  {
    id: 'tasks',
    title: 'Map task-tracking behavior',
    text: 'Replace the lesson’s TodoWrite pattern with TaskCreate, TaskUpdate, TaskGet and TaskList, preserving intended task behavior.',
  },
  {
    id: 'permissions',
    title: 'Review permissions and skills',
    text: 'Choose explicit tools, allowedTools, permission mode and skills. A final answer alone cannot establish access boundaries.',
  },
  {
    id: 'verify',
    title: 'Verify behavior, not just syntax',
    text: 'Typecheck the migrated code, exercise task creation/update/read/list and prove a denied capability never executes.',
  },
  {
    id: 'alpha',
    title: 'Adopt alpha features separately',
    text: 'Begin with ordinary query(). Opt into prewarm/claim and raw settings inspection only after the baseline works; define cleanup and failure handling.',
  },
];
export const GUIDE = [
  [
    'Historical is not removed',
    'The lesson recommends moving away from TodoWrite. It remains in the 0.3.310 built-in name list; this app does not claim the SDK has removed or formally deprecated it. Older unstable_v2 session exports are historical and absent from this installed root package.',
  ],
  [
    'A migration has several dimensions',
    'Changing the package name is only one step. Update control flow, configuration shape, permissions, tool semantics and cleanup. The inventory is scoped syntax analysis, not a complete codemod or typecheck.',
  ],
  [
    'Alpha is not deprecated',
    'prewarm(), SpareProcess.claim() and resolveSettings() are alpha in the installed declarations. They are developing surfaces, not replacements every host must adopt. Ordinary query() is the baseline here.',
  ],
  [
    'Prepare once, claim once',
    'Prewarm fixes host-level environment, tools, hooks and settings sources. Claim later binds the session folder and selected per-session options. A spare is single use; close unused or claimed resources explicitly.',
  ],
  [
    'Do not repeat an already-running prompt',
    'The documented option_not_applied claim rejection can mean the prompt is already running without the requested model or thinking option. Do not launch a duplicate cold query. This app never automatically retries a failed claim.',
  ],
  [
    'Settings are diagnostic input',
    'resolveSettings reports the raw settings cascade, not an authorization decision. Managed settings can still contribute when filesystem sources are restricted. This app displays only selected fields from bundled settings fixtures and never feeds that diagnostic result into live permissions.',
  ],
  [
    'Version context matters',
    'The course spans 0.3.282–0.3.310. The app targets exactly 0.3.310 and validates installed exports. Newer online documentation can include APIs or fixes beyond the target version.',
  ],
  [
    'Evidence has a source',
    'Practice reports are deterministic synthetic examples. Live reports use actual SDK tool callbacks and permission counters. Checklist checkboxes are learner attestations; they are not proof a migration is complete.',
  ],
];
export const QUIZ = [
  {
    question: 'What does an alpha label mean?',
    answers: [
      'A developing API that needs deliberate adoption',
      'An API removed from the package',
      'A mandatory migration step',
    ],
    correct: 0,
  },
  {
    question: 'Which configuration shape compiles for query() here?',
    answers: [
      'query({ prompt, allowedTools })',
      'query({ prompt, options: { allowedTools } })',
      'query(prompt, allowedTools)',
    ],
    correct: 1,
  },
  {
    question: 'Does a successful final answer prove a denied tool never ran?',
    answers: [
      'Always',
      'Only for warm queries',
      'No; check actual permission and execution evidence',
    ],
    correct: 2,
  },
  {
    question: 'What should happen after option_not_applied from a claim?',
    answers: [
      'Avoid a duplicate prompt; inspect the existing claimed query',
      'Automatically start the same task again',
      'Grant more tools',
    ],
    correct: 0,
  },
];

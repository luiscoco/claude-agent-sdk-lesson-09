import { query } from '@anthropic-ai/claude-agent-sdk';
/** Minimal compile-checked reference; use live:smoke for the bounded host guardrails. */
export async function modernQuery(cwd: string) {
  const q = query({
    prompt: 'Create one migration-check task, complete it, read it, then list tasks.',
    options: {
      cwd,
      tools: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'],
      allowedTools: ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'],
      permissionMode: 'default',
      skills: [],
      settingSources: [],
      persistSession: false,
      maxTurns: 8,
      maxBudgetUsd: 0.35,
    },
  });
  try {
    for await (const message of q) if (message.type === 'result') return message;
  } finally {
    q.close();
  }
}

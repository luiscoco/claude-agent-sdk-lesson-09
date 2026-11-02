import { resolveSettings } from '@anthropic-ai/claude-agent-sdk';
import path from 'node:path';
import { PROJECT_ROOT } from './paths.js';
import { SettingsSchema } from '../shared/model.js';
export type Resolver = typeof resolveSettings;
export async function inspectSettings(input: unknown, resolver: Resolver = resolveSettings) {
  const config = SettingsSchema.parse(input);
  const started = performance.now();
  const resolved = await resolver({
    cwd: path.join(PROJECT_ROOT, 'fixtures', 'settings'),
    settingSources: config.sources === 'project' ? ['project'] : ['project', 'local'],
  });
  const modes = ['default', 'dontAsk', 'acceptEdits', 'plan', 'auto', 'bypassPermissions'];
  return {
    origin: 'actual resolveSettings() result',
    status: 'alpha',
    sources: config.sources,
    model:
      resolved.effective.model === 'lesson-fixture-model'
        ? 'lesson-fixture-model'
        : resolved.effective.model
          ? '[host-managed model omitted]'
          : 'unset',
    rawDefaultMode: modes.includes(resolved.effective.permissions?.defaultMode || '')
      ? resolved.effective.permissions!.defaultMode
      : 'unset',
    permissionSource: resolved.provenance.permissions?.source || 'unset',
    fixtureBashDenyPresent: resolved.effective.permissions?.deny?.includes('Bash') ?? false,
    contributingSources: [...new Set(resolved.sources.map((s) => s.source))],
    elapsedMs: Math.round(performance.now() - started),
    caveat:
      'Raw settings cascade only, not a permission decision. Managed tiers can still contribute. Paths, env values, other settings and host rule contents are omitted. This result is never applied to a live query.',
  };
}

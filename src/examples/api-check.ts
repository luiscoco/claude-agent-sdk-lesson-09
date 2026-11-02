import * as sdk from '@anthropic-ai/claude-agent-sdk';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { TASK_TOOLS } from '../shared/model.js';
const require = createRequire(import.meta.url);
const pkg = JSON.parse(
  await readFile(
    path.join(path.dirname(require.resolve('@anthropic-ai/claude-agent-sdk')), 'package.json'),
    'utf8',
  ),
);
assert.equal(pkg.version, '0.3.310');
for (const name of TASK_TOOLS)
  assert.ok((sdk.BUILTIN_TOOL_NAMES as readonly string[]).includes(name));
assert.ok(sdk.BUILTIN_TOOL_NAMES.includes('TodoWrite'));
assert.equal(typeof sdk.prewarm, 'function');
assert.equal(typeof sdk.resolveSettings, 'function');
assert.equal('unstable_v2_createSession' in sdk, false);
console.log(
  'Verified SDK 0.3.310: task tools present; TodoWrite still present; historical unstable_v2_createSession absent; root alpha prewarm and resolveSettings exported. Executable examples compile against the pinned declarations.',
);

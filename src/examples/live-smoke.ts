import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PROJECT_ROOT } from '../server/paths.js';
import { runVerification } from '../server/verify.js';
if (existsSync(path.join(PROJECT_ROOT, '.env'))) loadEnvFile(path.join(PROJECT_ROOT, '.env'));
if (!process.env.ANTHROPIC_API_KEY)
  throw Error('Configure your own server-side ANTHROPIC_API_KEY in .env.');
const warm = process.argv.includes('--prewarm');
console.log(
  'Real billable SDK verification, up to $0.35 budget. ' +
    (warm ? 'Alpha prewarm explicitly selected.' : 'Ordinary query baseline.'),
);
const report = await runVerification(
  {
    scenario: process.argv.includes('--permission') ? 'permission' : 'tasks',
    startup: warm ? 'prewarm' : 'cold',
    experimentalOptIn: warm,
  },
  new AbortController().signal,
  (e) => console.log(`${e.step}: ${e.detail}`),
);
console.log(JSON.stringify(report, null, 2));
assert.equal(report.sdkOk, true);
assert.equal(report.verified, true, 'Actual behavior checks were not all satisfied.');

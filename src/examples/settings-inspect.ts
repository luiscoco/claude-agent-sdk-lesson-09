import { inspectSettings } from '../server/settings.js';
console.log(
  'Explicit alpha diagnostic: selected fields from bundled settings fixtures, never raw host settings.',
);
console.log(
  JSON.stringify(
    await inspectSettings({ sources: 'project-local', experimentalOptIn: true }),
    null,
    2,
  ),
);

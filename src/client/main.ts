import './style.css';
import './course-theme.css';
import './course-theme.js';
import {
  VERSION,
  PRESETS,
  CHECKLIST,
  GUIDE,
  QUIZ,
  type Audit,
  type AuditInput,
  type RunConfig,
  type RunEvent,
  type Report,
} from '../shared/model.js';
import { eventParser } from '../shared/sse.js';
import { renderMarkdown } from './markdown.js';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML =
  `<header class="top"><a class="brand" href="/">↗ <span>AGENT LABS / 09</span></a><span>TypeScript · SDK ${VERSION}</span><a href="https://github.com/luiscoco/claude-agent-sdk-lesson-09">View source ↗</a></header><main><section class="hero"><div><p class="eyebrow">LESSON 9 / API STATUS AND MIGRATION</p><h1>Modernize the code.<br><em>Verify the behavior.</em></h1><p class="intro">Read an older sample in context. Map its APIs, build a staged upgrade plan, and collect evidence from a modern query.</p></div><div class="hero-art" aria-hidden="true"><span>01 INVENTORY</span><b>↓</b><span>02 MIGRATE</span><b>↓</b><span>03 VERIFY</span></div></section><nav class="tabs" aria-label="Lesson views"><button data-tab="audit" aria-selected="true">01 Migration desk</button><button data-tab="verify">02 Behavior checks</button><button data-tab="alpha">03 Alpha lab</button><button data-tab="guide">04 Guide & quiz</button></nav>
<section id="audit" class="view"><div id="audit-notice" class="notice" role="status">Inventory is scoped syntax analysis. Pasted code is never executed or sent to a model.</div><div class="audit-grid"><article class="panel"><div class="section-head"><h2>Inspect a sample</h2><span class="tag">TARGET ${VERSION}</span></div><div class="editor-controls"><label>Teaching sample<select id="preset"><option value="historical">Historical session + package</option><option value="conceptual">Conceptual slide syntax</option><option value="alpha">Alpha preparation pattern</option><option value="modern">Modern query baseline</option></select></label><button id="load">Load sample</button><label>Source context<select id="version"><option>0.3.282</option><option>0.3.300</option><option>0.3.310</option><option value="unknown">Unknown</option></select></label></div><label for="code" class="eyebrow">TYPESCRIPT INVENTORY INPUT</label><textarea id="code" spellcheck="false" maxlength="24000" aria-label="TypeScript sample"></textarea><button id="analyze" class="primary">Analyze API inventory</button><p class="muted">Comments and ordinary text strings do not trigger API-call rules. Dynamic imports, require calls and data-flow aliases are outside this focused analyzer.</p></article><article class="panel"><div class="section-head"><h2>API inventory</h2><label>Filter<select id="filter"><option value="all">All statuses</option><option value="migration">Migration guidance</option><option value="historical">Historical</option><option value="alpha">Alpha</option><option value="recommended">Recommended</option><option value="review">Review</option></select></label></div><p id="audit-summary" class="muted">Run the inventory to begin.</p><div id="findings" class="findings"></div></article></div><section class="panel"><div class="section-head"><h2>A staged migration plan</h2><span id="plan-count" class="tag">0 / 6 self-reviewed</span></div><p id="plan-status" class="muted">Run the inventory before recording learner attestations. These checkboxes are not runtime verification.</p><div class="plan-grid">${CHECKLIST.map((x) => `<label class="plan-item"><input type="checkbox" data-check="${x.id}" disabled><span><strong>${x.title}</strong><small>${x.text}</small></span></label>`).join('')}</div><button id="export">Export migration evidence ↓</button></section><details class="panel"><summary>Compile-checked reference: src/examples/modern-query.ts</summary><p class="muted">A fixed reference implementation, not an automatic rewrite of submitted code. The behavior-check host adds ownership guards and actual outcome checks.</p><pre id="reference">Loading…</pre></details></section>
<section id="verify" class="view" hidden><div class="workspace"><aside class="panel controls"><p class="eyebrow">VERIFY A FIXED REFERENCE</p><label>Evidence mode<select id="mode"><option value="practice">Practice · synthetic report</option><option value="live">Live · actual SDK tools</option></select></label><label>Behavior scenario<select id="scenario"><option value="tasks">Task tracking migration</option><option value="permission">Denied capability</option></select></label><label>Startup path<select id="startup"><option value="cold">Ordinary query baseline</option><option value="prewarm">Alpha prewarm + claim</option></select></label><label class="check"><input id="warm-optin" type="checkbox"> Opt into alpha prewarm</label><p id="key" class="muted">Checking live configuration…</p><button id="run" class="primary">Run verification</button><button id="stop" disabled>Stop live run</button><hr><p class="muted">These fixed scenarios verify the reference host. Submitted editor code is never executed. Practice starts no query, tool or spare process.</p></aside><div><div id="run-notice" class="notice" role="status">Choose a scenario. Live task tools write only SDK task state under this app’s ignored local configuration directory.</div><div class="metrics"><div><b id="run-origin">—</b><span>Evidence source</span></div><div><b id="sdk-outcome">—</b><span>SDK final outcome</span></div><div><b id="behavior-outcome">—</b><span>Behavior checks</span></div></div><section class="panel"><h2>Observed result</h2><div id="result">No verification has run.</div><div id="checks"></div><p id="counts" class="muted">Execution counts are unknown until a report is received.</p></section><section class="panel"><h2>Startup & execution trail</h2><div id="events" class="events"></div></section></div></div></section>
<section id="alpha" class="view" hidden><div class="alpha-grid"><section class="panel"><p class="eyebrow">EXPLICIT ALPHA DIAGNOSTIC</p><h2>Inspect a settings cascade</h2><p>Run the actual resolveSettings() helper against bundled fixtures. The project file chooses default mode; the local file overrides it with dontAsk.</p><label>Fixture sources<select id="settings-sources"><option value="project">Project only</option><option value="project-local">Project + local</option></select></label><label class="check"><input id="settings-optin" type="checkbox"> Opt into alpha settings inspection</label><button id="settings-run" class="primary" disabled>Inspect fixture settings</button><p id="settings-status" role="status" class="muted">No settings inspection has run.</p><pre id="settings-output">Only selected diagnostic fields will be displayed.</pre><p class="muted">This is the raw settings cascade, not an access decision. Managed tiers may contribute. The diagnostic result is never applied to live query permissions.</p></section><section class="panel"><p class="eyebrow">PREWARM / CLAIM LIFECYCLE</p><h2>Prepare early. Bind once.</h2><ol class="lifecycle"><li><strong>Prewarm</strong><p>Fix host tools, environment, hooks and settings sources.</p></li><li><strong>Claim once</strong><p>Bind the actual workspace and per-session model or permission mode.</p></li><li><strong>Handle claim settlement</strong><p>A refusal and option_not_applied have different implications for whether the prompt ran.</p></li><li><strong>Consume and close</strong><p>Keep the existing query when work may already be running. Release both query and spare.</p></li></ol><p class="muted">This app never automatically retries a failed claim. Test the real opt-in path in Behavior checks after the ordinary query baseline works.</p></section></div><section class="panel"><h2>Version context / selected anchors</h2><div class="release-grid"><p><b>0.3.282</b><span>Beginning of the supplied lesson’s version context.</span></p><p><b>0.3.304</b><span>Browser SSE suspend/resume added in the official changelog.</span></p><p><b>0.3.307</b><span>Browser supportedDialogKinds added in the official changelog.</span></p><p><b>0.3.310</b><span>Exact dependency and declaration contract used by this app.</span></p></div><p class="muted">Selected context anchors, not a complete changelog. Later releases may expose different entry points or behavior.</p></section></section>
<section id="guide" class="view" hidden><div class="guide-grid">${GUIDE.map(([name, text]) => `<article class="panel"><p class="eyebrow">MIGRATION PRINCIPLE</p><h2>${name}</h2><p>${text}</p></article>`).join('')}</div><div class="quiz-wrap"><p class="eyebrow">CHECK YOUR MENTAL MODEL</p><h2>Can you explain the migration?</h2>${QUIZ.map((q, i) => `<fieldset class="panel"><legend>${i + 1}. ${q.question}</legend>${q.answers.map((a, j) => `<label class="check"><input type="radio" name="q${i}" value="${j}">${a}</label>`).join('')}</fieldset>`).join('')}<button id="grade" class="primary">Check answers</button><p id="score" role="status"></p></div></section><footer>Migration Workbench · Lesson 9 · Version the contract. Verify the behavior.</footer></main>`;
let audit: Audit | undefined,
  auditedInput: AuditInput | undefined,
  auditEpoch = 0,
  report: Report | undefined,
  runConfig: RunConfig | undefined,
  runMode = 'practice',
  runEvents: RunEvent[] = [],
  controller: AbortController | undefined,
  settings: unknown;
const input = (): AuditInput => ({
  code: $<HTMLTextAreaElement>('code').value,
  fromVersion: $<HTMLSelectElement>('version').value as AuditInput['fromVersion'],
});
const current = () =>
  Boolean(
    audit &&
    auditedInput?.code === input().code &&
    auditedInput.fromVersion === input().fromVersion,
  );
let attestations: Record<string, boolean> = {};
const message = (id: string, value: string) => {
  $(id).textContent = value;
};
const result = (value: string, markdown = false) => {
  if (markdown) renderMarkdown($('result'), value);
  else message('result', value);
  $('result').classList.toggle('markdown', markdown);
};
function renderPlan() {
  const valid = current();
  for (const checkbox of document.querySelectorAll<HTMLInputElement>('[data-check]')) {
    checkbox.disabled = !valid;
    checkbox.checked = Boolean(attestations[checkbox.dataset.check!]);
  }
  message('plan-count', `${CHECKLIST.filter((c) => attestations[c.id]).length} / 6 self-reviewed`);
  message(
    'plan-status',
    valid
      ? `Learner attestations for inventory ${audit!.fingerprint}. They do not certify compilation, permissions or behavior.`
      : 'The sample or version changed. Analyze it before recording attestations for this revision.',
  );
}
function renderAudit() {
  if (!audit) return;
  message(
    'audit-summary',
    `${audit.findings.length} scoped findings · ${audit.syntax.length} syntax diagnostics · ${audit.fromVersion} → ${audit.target} · ${audit.fingerprint}`,
  );
  const filter = $<HTMLSelectElement>('filter').value;
  $('findings').replaceChildren(
    ...[
      ...audit.syntax.map((s) => ({
        status: 'syntax',
        title: `Syntax diagnostic · line ${s.line}`,
        detail: s.message,
        line: s.line,
        column: s.column,
      })),
      ...audit.findings.filter((f) => filter === 'all' || f.status === filter),
    ].map((f) => {
      const card = document.createElement('article');
      card.className = 'finding';
      const badge = document.createElement('span');
      badge.className = 'status ' + f.status;
      badge.textContent = f.status;
      const h = document.createElement('h3');
      h.textContent = f.title;
      const p = document.createElement('p');
      p.textContent = f.detail;
      const loc = document.createElement('small');
      loc.textContent = `Line ${f.line}, column ${f.column}`;
      card.append(badge, h, p, loc);
      return card;
    }),
  );
  renderPlan();
}
$('load').onclick = () => {
  auditEpoch++;
  $<HTMLTextAreaElement>('code').value =
    PRESETS[$<HTMLSelectElement>('preset').value as keyof typeof PRESETS];
  message(
    'audit-notice',
    'Sample loaded. Analyze this revision to update the inventory and its plan.',
  );
  renderPlan();
};
for (const id of ['code', 'version'])
  $(id).addEventListener('input', () => {
    auditEpoch++;
    renderPlan();
  });
$('analyze').onclick = async () => {
  const epoch = ++auditEpoch,
    submitted = input();
  $<HTMLButtonElement>('analyze').disabled = true;
  try {
    const r = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitted),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    if (epoch !== auditEpoch) return;
    audit = data;
    auditedInput = submitted;
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem('lesson09-plan-' + audit!.fingerprint) || '{}',
      );
      attestations =
        stored && typeof stored === 'object' && !Array.isArray(stored)
          ? Object.fromEntries(
              CHECKLIST.map((c) => [c.id, (stored as Record<string, unknown>)[c.id] === true]),
            )
          : {};
    } catch {
      attestations = {};
    }
    renderAudit();
    message('audit-notice', audit!.limits);
  } catch (e) {
    message(
      'audit-notice',
      'Inventory failed: ' + (e instanceof Error ? e.message : 'Unknown error'),
    );
  } finally {
    $<HTMLButtonElement>('analyze').disabled = false;
  }
};
$('filter').onchange = renderAudit;
for (const checkbox of document.querySelectorAll<HTMLInputElement>('[data-check]'))
  checkbox.onchange = () => {
    if (!current()) return;
    attestations[checkbox.dataset.check!] = checkbox.checked;
    try {
      localStorage.setItem('lesson09-plan-' + audit!.fingerprint, JSON.stringify(attestations));
    } catch {}
    renderPlan();
  };
function renderReport() {
  if (!report) return;
  message('run-origin', report.origin);
  message('sdk-outcome', report.sdkOk ? 'Success' : 'Unsuccessful');
  message('behavior-outcome', report.verified ? 'Passed' : 'Failed');
  result(report.result, true);
  message(
    'counts',
    `${report.origin === 'practice' ? 'SYNTHETIC' : 'ACTUAL'} · tool callbacks ${JSON.stringify(report.tools)} · host permission decisions ${report.permissions} · protected handler executions ${report.protectedCalls} · cost $${report.costUsd.toFixed(6)}`,
  );
  $('checks').replaceChildren(
    ...report.checks.map((c) => {
      const p = document.createElement('p');
      p.className = c.passed ? 'passed' : 'failed';
      p.textContent = `${c.passed ? '✓' : '×'} ${c.name}${report!.origin === 'practice' ? ' · synthetic fixture' : ''}`;
      return p;
    }),
  );
}
function event(e: RunEvent) {
  runEvents.push(e);
  const p = document.createElement('p');
  const b = document.createElement('b');
  b.textContent = e.step + ' · ';
  p.append(b, document.createTextNode(e.detail));
  $('events').append(p);
}
function runControls(busy: boolean) {
  for (const id of ['mode', 'scenario', 'startup', 'warm-optin'])
    $<HTMLInputElement>(id).disabled = busy;
  $<HTMLButtonElement>('stop').disabled = !busy;
  const needsOptIn =
    $<HTMLSelectElement>('startup').value === 'prewarm' &&
    !$<HTMLInputElement>('warm-optin').checked;
  $<HTMLButtonElement>('run').disabled = busy || needsOptIn;
}
for (const id of ['startup', 'warm-optin']) $(id).onchange = () => runControls(false);
$('run').onclick = async () => {
  runMode = $<HTMLSelectElement>('mode').value;
  runConfig = {
    scenario: $<HTMLSelectElement>('scenario').value as RunConfig['scenario'],
    startup: $<HTMLSelectElement>('startup').value as RunConfig['startup'],
    experimentalOptIn: $<HTMLInputElement>('warm-optin').checked,
  };
  report = undefined;
  runEvents = [];
  $('events').replaceChildren();
  $('checks').replaceChildren();
  for (const id of ['run-origin', 'sdk-outcome', 'behavior-outcome']) message(id, '—');
  message('counts', 'Execution counts are unknown until a report is received.');
  result('Verification running…');
  runControls(true);
  controller = new AbortController();
  try {
    const r = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: runMode, config: runConfig }),
      signal: controller.signal,
    });
    if (!r.ok) throw Error((await r.json()).error);
    if (runMode === 'practice') {
      report = (await r.json()).report;
      report!.events.forEach(event);
      renderReport();
      message(
        'run-notice',
        'PRACTICE · All worker output, execution counts and checks are synthetic. No SDK call or spare process ran.',
      );
      return;
    }
    message(
      'run-notice',
      'LIVE · Actual SDK verification is running. API credits apply; $0.35 budget and 90-second cap.',
    );
    const reader = r.body!.getReader(),
      decoder = new TextDecoder();
    let terminal = false,
      error = '';
    const parse = eventParser((raw) => {
      const p = raw as {
        kind: string;
        event?: RunEvent;
        report?: Report;
        message?: string;
        status?: string;
      };
      if (p.kind === 'event' && p.event) event(p.event);
      if (p.kind === 'report') {
        report = p.report;
        renderReport();
      }
      if (p.kind === 'error') {
        error = p.message || 'Unknown error';
        message('run-notice', 'Live verification failed: ' + error);
      }
      if (p.kind === 'done') {
        terminal = true;
        message('run-notice', `LIVE · ${p.status}${error ? ': ' + error : ''}`);
      }
    });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parse(decoder.decode(value, { stream: true }));
    }
    parse(decoder.decode());
    if (!terminal) throw Error('Connection ended before a terminal status.');
  } catch (e) {
    message(
      'run-notice',
      controller.signal.aborted
        ? 'Stopped. Host cleanup requested; execution counts remain unknown without a report.'
        : 'Verification failed: ' + (e instanceof Error ? e.message : 'Unknown error'),
    );
    if (!report) result('No complete verification report received.');
  } finally {
    controller = undefined;
    runControls(false);
  }
};
$('stop').onclick = () => controller?.abort();
$('settings-optin').onchange = () => {
  $<HTMLButtonElement>('settings-run').disabled = !$<HTMLInputElement>('settings-optin').checked;
};
$('settings-run').onclick = async () => {
  $<HTMLButtonElement>('settings-run').disabled = true;
  try {
    const r = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: $<HTMLSelectElement>('settings-sources').value,
        experimentalOptIn: $<HTMLInputElement>('settings-optin').checked,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    settings = data;
    $('settings-output').textContent = JSON.stringify(data, null, 2);
    message(
      'settings-status',
      'Actual alpha diagnostic completed. Read the caveat before interpreting its raw mode.',
    );
  } catch (e) {
    message(
      'settings-status',
      'Inspection failed: ' + (e instanceof Error ? e.message : 'Unknown error'),
    );
  } finally {
    $<HTMLButtonElement>('settings-run').disabled = !$<HTMLInputElement>('settings-optin').checked;
  }
};
$('export').onclick = () => {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          target: VERSION,
          audit,
          auditIsCurrent: current(),
          attestations,
          attestationsAreManual: true,
          referenceVerification: {
            scope: 'fixed reference scenarios; submitted code is never run',
            mode: runMode,
            config: runConfig,
            report,
            events: runEvents,
          },
          settings,
          note: 'Source code is omitted. Synthetic practice results and learner attestations are not live migration certification.',
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = 'lesson-09-migration-evidence.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))
  button.onclick = () => {
    for (const view of document.querySelectorAll<HTMLElement>('.view'))
      view.hidden = view.id !== button.dataset.tab;
    for (const b of document.querySelectorAll('[data-tab]'))
      b.setAttribute('aria-selected', String(b === button));
  };
$('grade').onclick = () => {
  const score = QUIZ.filter(
    (q, i) =>
      Number(
        document.querySelector<HTMLInputElement>(`input[name="q${i}"]:checked`)?.value ?? -1,
      ) === q.correct,
  ).length;
  message(
    'score',
    `${score} / 4 correct. ${score === 4 ? 'You can separate API status, configuration and behavioral evidence.' : 'Review the guide and try again.'}`,
  );
};
void fetch('/api/meta')
  .then((r) => r.json())
  .then((m) =>
    message(
      'key',
      m.liveAvailable
        ? `Live configured · ${m.model}`
        : 'Audit and practice ready · configure a server-side key for live verification.',
    ),
  )
  .catch(() => message('key', 'Local configuration unavailable.'));
void fetch('/api/reference')
  .then((r) => r.json())
  .then((x) => message('reference', x.code))
  .catch(() => message('reference', 'Open src/examples/modern-query.ts locally.'));
$<HTMLTextAreaElement>('code').value = PRESETS.historical;
runControls(false);
window.addEventListener('pagehide', () => controller?.abort());

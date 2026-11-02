import ts from 'typescript-compiler';
import { createHash } from 'node:crypto';
import {
  AuditSchema,
  VERSION,
  clean,
  type Audit,
  type Finding,
  type Status,
} from '../shared/model.js';
/** Parse only. Pasted code is never evaluated, imported, written, or sent to a model. */
export function auditCode(input: unknown): Audit {
  const { code, fromVersion } = AuditSchema.parse(input);
  const file = ts.createSourceFile(
    'student-sample.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const findings: Finding[] = [];
  const aliases = new Map<string, string>();
  const namespaces = new Set<string>();
  const seen = new Set<string>();
  const add = (rule: string, status: Status, title: string, detail: string, node: ts.Node) => {
    const p = file.getLineAndCharacterOfPosition(node.getStart(file));
    const key = `${rule}:${p.line}:${p.character}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ rule, status, title, detail, line: p.line + 1, column: p.character + 1 });
  };
  const api = (name: string, node: ts.Node) => {
    if (name.startsWith('unstable_v2_'))
      add(
        'historical-session',
        'historical',
        'Rewrite historical session flow',
        'Use a retained query() handle and async iteration. These historical root exports are absent from the pinned package.',
        node,
      );
    if (['prewarm', 'resolveSettings'].includes(name))
      add(
        'alpha-helper',
        'alpha',
        `${name} is alpha`,
        'Make adoption explicit and verify the installed contract. It is not required for the ordinary query baseline.',
        node,
      );
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const path = node.moduleSpecifier.text;
      if (path === '@anthropic-ai/claude-code' || path.startsWith('@anthropic-ai/claude-code/'))
        add(
          'old-package',
          'migration',
          'Update the package import',
          'Use @anthropic-ai/claude-agent-sdk and pin the intended target version.',
          node.moduleSpecifier,
        );
      if (path === '@anthropic-ai/claude-agent-sdk/core')
        add(
          'entry-point',
          'review',
          'Review the selected entry point',
          'Root and /core exports differ by release. Verify required exports against 0.3.310, particularly alpha helpers.',
          node.moduleSpecifier,
        );
      const bindings = node.importClause?.namedBindings;
      const recognized = [
        '@anthropic-ai/claude-code',
        '@anthropic-ai/claude-agent-sdk',
        '@anthropic-ai/claude-agent-sdk/core',
      ].includes(path);
      if (recognized && bindings && ts.isNamespaceImport(bindings))
        namespaces.add(bindings.name.text);
      if (recognized && bindings && ts.isNamedImports(bindings))
        for (const item of bindings.elements) {
          const name = item.propertyName?.text || item.name.text;
          aliases.set(item.name.text, name);
          api(name, item);
        }
    }
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression)
        ? aliases.get(node.expression.text) || ''
        : ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            namespaces.has(node.expression.expression.text)
          ? node.expression.name.text
          : '';
      api(name, node.expression);
      if (name === 'query') {
        const arg = node.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) {
          add(
            'query-baseline',
            'recommended',
            'Use the query-based baseline',
            'Retain the handle, inspect message types and close it in finally. A detected call is not a successful typecheck.',
            node.expression,
          );
          for (const p of arg.properties)
            if (
              ts.isPropertyAssignment(p) &&
              [
                'allowedTools',
                'tools',
                'skills',
                'permissionMode',
                'maxTurns',
                'cwd',
                'env',
              ].includes(p.name.getText(file).replace(/['"]/g, ''))
            )
              add(
                'options-nesting',
                'migration',
                'Place configuration under options',
                'The executable signature is query({ prompt, options: { ... } }); top-level configuration in the slide is conceptual shorthand.',
                p.name,
              );
        }
      }
    }
    if (
      ts.isPropertyAssignment(node) &&
      ['tools', 'allowedTools'].includes(node.name.getText(file).replace(/['"]/g, '')) &&
      ts.isArrayLiteralExpression(node.initializer)
    )
      for (const item of node.initializer.elements)
        if (ts.isStringLiteral(item) && item.text === 'TodoWrite')
          add(
            'todo-pattern',
            'migration',
            'Migrate the lesson’s TodoWrite pattern',
            'Use TaskCreate/TaskUpdate/TaskGet/TaskList and verify equivalent behavior. TodoWrite still appears in the installed built-in list; this is lesson migration guidance, not a removal claim.',
            item,
          );
    ts.forEachChild(node, visit);
  };
  visit(file);
  const diagnostics =
    ts.transpileModule(code, {
      fileName: 'student-sample.ts',
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).diagnostics || [];
  const syntax = diagnostics
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .slice(0, 20)
    .map((d) => {
      const p = file.getLineAndCharacterOfPosition(Math.min(d.start || 0, code.length));
      return {
        message: clean(ts.flattenDiagnosticMessageText(d.messageText, ' '), 350),
        line: p.line + 1,
        column: p.character + 1,
      };
    });
  return {
    fingerprint: createHash('sha256')
      .update(code + '\n' + fromVersion)
      .digest('hex')
      .slice(0, 16),
    target: VERSION,
    fromVersion,
    syntax,
    findings: findings.sort((a, b) => a.line - b.line || a.column - b.column),
    limits:
      'Scoped TypeScript syntax inventory only. Dynamic imports, require(), computed API names, wrappers and data-flow aliases are not resolved. This is not a typecheck, an automatic rewrite, or migration certification.',
  };
}

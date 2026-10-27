import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// This deliberately accepts one explicit verification command sequence only.
// Conditional skips, arbitrary shell code, and deployment commands cannot pass.
const source = readFileSync(new URL('../.buildkite/pipeline.yml', import.meta.url), 'utf8');
const expectedCommands = [
  'set -eu',
  'node -e "if (Number(process.versions.node.split(\'.\')[0]) < 22) process.exit(1)"',
  'npm ci',
  'node scripts/test-ci-config.mjs',
  'npm test',
  'npm run build',
];

function verifyPipeline(yaml) {
  const lines = yaml.split(/\r?\n/).filter((line) => line.trim() && !line.trimStart().startsWith('#'));
  assert.equal(lines.filter((line) => /^\s*- label:/.test(line)).length, 1, 'One CI step only');
  assert.ok(lines.some((line) => /^\s+queue: linux-small$/.test(line)), 'Use verified hosted Free queue');
  assert.ok(lines.some((line) => /^\s+timeout_in_minutes: 15$/.test(line)), 'Bound minutes to 15');
  const match = yaml.match(/^    command: \|\r?\n((?:^      [^\r\n]+\r?\n?)+)/m);
  assert.ok(match, 'Require a single literal shell command block');
  const commands = match[1].split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  assert.deepEqual(commands, expectedCommands, 'Run exactly the reviewed non-deploy verification path');
}

test('SellerPilot CI must run strict hosted verification with enforced Node >=22', () => {
  verifyPipeline(source);
});

test('conditional skip, fake test and alternative deployment commands fail policy', () => {
  const injectionCases = [
    ['npm test', 'if false; then npm test; fi'],
    ['npm ci', 'echo npm ci'],
    ['npm run build', 'npx wrangler pages deploy'],
    ['npm run build', 'wrangler versions deploy'],
    ['npm run build', 'vercel --prod'],
    ['npm run build', 'npm run deploy'],
    ['npm run build', 'npm run build\n      npx wrangler pages deploy'],
  ];
  for (const [before, after] of injectionCases) {
    assert.throws(() => verifyPipeline(source.replace(before, after)),
      undefined, `Mutation must be rejected: ${after}`);
  }
});

test('an extra unlabeled shell step cannot execute unchecked code', () => {
  assert.throws(() => verifyPipeline(source + '\n  - command: npm run deploy\n'),
    undefined, 'Unlabeled steps must fail the contract');
});

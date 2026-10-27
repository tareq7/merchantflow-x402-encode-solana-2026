import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Buildkite validates YAML on pipeline upload; this test enforces CI policy
// without adding runtime packages or accepting commented-out shell commands.
const source = readFileSync(new URL('../.buildkite/pipeline.yml', import.meta.url), 'utf8');
const lines = source.split(/\r?\n/).map(line => line.trim())
  .filter(line => line && !line.startsWith('#'));

test('SellerPilot CI is hosted, bounded, tested and never deploys', () => {
  assert.ok(lines.includes('steps:'), 'Buildkite steps missing');
  assert.equal(lines.filter(line => line.startsWith('- label:')).length, 1);
  assert.ok(lines.includes('queue: linux-small'), 'Use verified Free hosted Linux Small queue');
  assert.ok(lines.includes('timeout_in_minutes: 15'), 'Bound compute minutes per job');
  for (const command of ['npm ci', 'node scripts/test-ci-config.mjs', 'npm test', 'npm run build']) {
    assert.ok(lines.includes(command), `Missing real executable line: ${command}`);
  }
  for (const line of lines) {
    assert.doesNotMatch(line, /\b(?:vercel|wrangler\s+deploy|npm\s+run\s+deploy|kubectl|aws\s+)/i,
      'CI must not invoke production deployment commands');
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  publish,
  prepare,
  promote,
  settings,
  healthy,
  assertReleaseMode,
  assertHostedReleaseMode,
} = require('../../scripts/lib/release-gate.cjs');

const sha = 'a'.repeat(40);
const env = {
  GITHUB_REF_NAME: 'main',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: sha,
  WEB_RELEASE_ENABLED: 'true',
  VERCEL_TOKEN: 'synthetic-token',
  VERCEL_PROJECT_ID: 'prj_1xtdjVDsLriFMkG69dCWd2RUnoLi',
  VERCEL_ORG_ID: 'team_5uEgLPJcDkJpzYS3oMbAgc4Y',
};
const target = { backendOrigin: 'https://api.belivrhq.com', domain: 'www.belivrhq.com' };
const body = () => ({ success: true, data: { status: 'healthy', service: 'web', backendOrigin: target.backendOrigin, siteOrigin: `https://${target.domain}` } });

function fake(options = {}) {
  const calls = [];
  let heads = 0;
  const run = (command, args) => {
    calls.push([command, args]);
    let output = '';
    if (command === 'git' && args[0] === 'ls-remote')
      output = `${options.stale && ++heads > 1 ? 'b'.repeat(40) : sha}\trefs/heads/main`;
    else if (command === 'git' && args[0] === 'rev-parse') output = sha;
    else if (command === 'git' && args[0] === 'ls-files') output = options.untracked ? 'src/unreviewed.ts' : '';
    else if (args[0] === 'deploy')
      output = JSON.stringify(options.rawOutput ? { id: 'dpl_candidate', readyState: 'BUILDING' } : options.errorOutput ? { status: 'error', deployment: { id: 'dpl_candidate' } } : { status: 'ok', deployment: { id: 'dpl_candidate' } });
    else if (args[0] === 'api' && args[1].startsWith('/v9/projects/'))
      output = JSON.stringify({ id: 'prj_1xtdjVDsLriFMkG69dCWd2RUnoLi', accountId: 'team_5uEgLPJcDkJpzYS3oMbAgc4Y', gitProviderOptions: { createDeployments: options.gitEnabled ? 'enabled' : 'disabled' } });
    else if (args[0] === 'api')
      output = JSON.stringify({
        id: options.wrongCandidate ? 'dpl_other' : 'dpl_candidate',
        readyState: 'READY',
        projectId: options.wrongProject ? 'prj_other' : 'prj_1xtdjVDsLriFMkG69dCWd2RUnoLi',
        target: options.preview ? null : 'production',
        meta: { readinessReleaseSha: options.wrongCommit ? 'b'.repeat(40) : sha },
      });
    else if (args[0] === 'curl')
      output = JSON.stringify(
        options.unhealthy ? { success: true, data: { status: 'healthy' } } : options.preview ? { success: true, data: { status: 'healthy', service: 'web', backendOrigin: 'https://staging-api.belivrhq.com', siteOrigin: 'https://staging.belivrhq.com' } } : body(),
      );
    return { status: options.buildFailure && args[0] === 'inspect' ? 1 : 0, stdout: output };
  };
  return { run, calls };
}
const promotions = (calls) => calls.filter(([, args]) => ['promote', 'alias'].includes(args[0]));

test('disables direct Git deployments', () => {
  const root = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8'));
  assert.equal(root.git.deploymentEnabled, false);
});

test('refuses gated promotion until independent Git deployment is explicitly disabled', () => {
  for (const config of [{}, { git: {} }, { git: { deploymentEnabled: true } }])
    assert.throws(() => assertReleaseMode(config));
  assert.doesNotThrow(() => assertReleaseMode({ git: { deploymentEnabled: false } }));
});

test('refuses a healthy response from the wrong backend or site', () => {
  assert.equal(healthy(body(), target), true);
  for (const key of ['backendOrigin', 'siteOrigin']) {
    const wrong=body();wrong.data[key]='https://other.example';assert.equal(healthy(wrong,target),false);
  }
  assert.equal(healthy({ success: false, data: body().data }, target),false);
});

test('rejects disabled releases, untrusted event types and unsupported branches', () => {
  for (const override of [
    { WEB_RELEASE_ENABLED: '' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REF_NAME: 'feature/test' },
    { VERCEL_TOKEN: '' },
  ])
    assert.throws(() => settings({ ...env, ...override }));
});
test('requires complete web readiness evidence', () => {
  assert.equal(healthy(body(), target), true);
  const missing = body();delete missing.data.service;
  assert.equal(healthy(missing, target), false);
  assert.equal(healthy({ success: true, data: { status: 'healthy' } }, target), false);
});
for (const [name, options] of Object.entries({
  'unhealthy web backend': { unhealthy: true },
  'wrong checked commit': { wrongCommit: true },
  'wrong project': { wrongProject: true },
  'failed candidate build': { buildFailure: true },
  'newer branch commit': { stale: true },
})) {
  test(`${name} prevents domain promotion`, async () => {
    const { run, calls } = fake(options);
    await assert.rejects(publish(env, run, async () => {}));
    assert.equal(promotions(calls).length, 0);
  });
}
test('production candidates are unaliased until readiness and identity pass', async () => {
  const { run, calls } = fake();
  const result = await publish(env, run, async () => {});
  assert.equal(result.domain, 'www.belivrhq.com');
  const deploy = calls.find(([, args]) => args[0] === 'deploy')[1];
  assert.ok(deploy.includes('--skip-domain'));
  assert.equal(promotions(calls).length, 1);
  assert.equal(promotions(calls)[0][1][0], 'promote');
  assert.ok(
    calls.findIndex(([, args]) => args[0] === 'curl') <
      calls.findIndex(([, args]) => args[0] === 'promote'),
  );
});
test('staging can only update the staging domain and never promotes production', async () => {
  const { run, calls } = fake({ preview: true });
  const result = await publish({ ...env, GITHUB_REF_NAME: 'staging' }, run, async () => {});
  assert.equal(result.domain, 'staging.belivrhq.com');
  assert.equal(promotions(calls).length, 1);
  assert.deepEqual(promotions(calls)[0][1].slice(0, 4), [
    'alias',
    'set',
    'dpl_candidate',
    'staging.belivrhq.com',
  ]);
});

test('refuses crossing a reviewed project/team boundary or unknown profile', () => {
  for (const override of [{ RELEASE_PROFILE: 'legacy' }, { RELEASE_PROFILE: 'unknown' }, { VERCEL_PROJECT_ID: 'prj_other' }, { VERCEL_ORG_ID: 'team_other' }])
    assert.throws(() => settings({ ...env, ...override }));
});
test('legacy configuration targets the legacy project independently', () => {
  const profile = require('../../config/releases.json').legacy;
  const actual = settings({ ...env, RELEASE_PROFILE: 'legacy', VERCEL_PROJECT_ID: profile.projectId, VERCEL_ORG_ID: profile.orgId });
  assert.equal(actual.domain, profile.main.domain);
  assert.notEqual(actual.domain, settings(env).domain);
});

test('candidate preparation never promotes and mismatched manifests are refused', async () => {
  const { run, calls } = fake();
  const manifest = await prepare(env, run, async () => {});
  assert.equal(promotions(calls).length, 0);
  for (const field of ['commit', 'profile', 'projectId', 'orgId', 'domain']) {
    await assert.rejects(promote(env, { ...manifest, [field]: 'wrong' }, run, async () => {}));
    assert.equal(promotions(calls).length, 0);
  }
  await promote(env, manifest, run, async () => {});
  assert.equal(promotions(calls).length, 1);
});

test('hosted Git deployment bypasses are refused before a candidate is uploaded', async () => {
  const { run, calls } = fake({ gitEnabled: true });
  assert.throws(() => assertHostedReleaseMode(env, run));
  await assert.rejects(prepare(env, run, async () => {}));
  assert.equal(calls.filter(([, args]) => args[0] === 'deploy').length, 0);
});

test('untracked source and mismatched candidate IDs cannot be released', async () => {
  for (const options of [{ untracked: true }, { wrongCandidate: true }]) {
    const { run, calls } = fake(options);
    await assert.rejects(publish(env, run, async () => {}));
    assert.equal(promotions(calls).length, 0);
    if (options.untracked) assert.equal(calls.filter(([, args]) => args[0] === 'deploy').length, 0);
  }
});

test('accepts the pinned CLI standard raw deployment JSON as well as its agent envelope', async () => {
  const { run, calls } = fake({ rawOutput: true });
  await publish(env, run, async () => {});
  assert.equal(promotions(calls).length, 1);
});
test('rejects a CLI error envelope even when it includes a deployment identifier', async () => {
  const { run, calls } = fake({ errorOutput: true });
  await assert.rejects(publish(env, run, async () => {}));
  assert.equal(promotions(calls).length, 0);
});

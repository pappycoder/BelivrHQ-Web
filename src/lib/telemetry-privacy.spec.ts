import { describe, expect, it } from 'vitest';
import { redactTelemetry } from './telemetry-privacy';

describe('Telemetry capability and record privacy', () => {
  it.each(['forms', 'intake', 'register'])('redacts %s links from every supported URL field', (kind) => {
    const token = 'synthetic-capability-secret';
    const privateData = 'synthetic-private-record';
    const url = `https://user:${privateData}@example.org/${kind}/public/${token}/meta?token=${token}#${token}`;
    const event = {
      request: { url, cookies: privateData, headers: { authorization: privateData }, data: privateData, query_string: privateData },
      user: { id: 'pseudonymous-id', email: privateData },
      message: privateData, extra: { password: privateData }, contexts: { request: { path: token }, trace: { data: { password: privateData } } },
      transaction: url, tags: { url },
      exception: { values: [{ type: 'Error', value: privateData, stacktrace: { frames: [{ filename: 'page.js', vars: { password: privateData } }] } }] },
      breadcrumbs: [{ category: 'http', message: privateData, data: { url, body: privateData } }, { category: 'ui.click', message: privateData }],
      spans: [{ op: 'db.query', description: `SELECT '${privateData}'`, data: { password: privateData } }, { description: url, data: { body: privateData } }],
    };
    const clean = JSON.stringify(redactTelemetry(event as never));
    expect(clean).not.toContain(token);
    expect(clean).not.toContain(privateData);
    expect(clean).toContain('page.js');
    expect(clean).toContain('pseudonymous-id');
    expect(clean).not.toContain('ui.click');
  });
});

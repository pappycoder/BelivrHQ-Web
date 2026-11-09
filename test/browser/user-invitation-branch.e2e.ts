import { test, expect, type BrowserContext } from '@playwright/test';

async function fixture(context: BrowserContext, hq: boolean, features: string[] = ['giving', 'reports']) {
  await context.route('https://embed.tawk.to/**', route => route.fulfill({ body: '' }));
  await context.addCookies([{ name: 'belivrhq_token', value: 'invite-fixture', url: 'http://127.0.0.1:3107' }]);
  await context.addInitScript(({ hq, features }) => {
    const original = window.fetch.bind(window);
    const state = { invitations: [] as Record<string, unknown>[], branchReads: 0 };
    (window as unknown as { inviteFixture: typeof state }).inviteFixture = state;
    window.fetch = async (input, options) => {
      const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
      if (!path.startsWith('/api/')) return original(input, options);
      if (path === '/api/session') return Response.json({ hasSession: true });
      let data: unknown = { data: [], meta: { page: 1, limit: 15, total: 0, totalPages: 1 } };
      if (path.endsWith('/profiles/me')) data = {
        profileId: 'p', userId: 'u', churchId: 'c', role: ['church_admin'], status: 'active',
        firstName: 'Invite', lastName: 'Admin', isAdminHq: hq, branchId: 'branch-a',
        branch: { branchId: 'branch-a', name: 'Central', isHeadquarters: true },
        planFeatures: features,
        permissions: ['users:read', 'profiles:read', 'profiles:create', 'roles:read', 'roles:create', 'roles:update', 'branches:read'],
      };
      else if (path.endsWith('/branches')) {
        state.branchReads++;
        data = { data: [
          { branchId: 'branch-a', name: 'Central', isHeadquarters: true },
          { branchId: 'branch-b', name: 'West', isHeadquarters: false },
        ], total: 2 };
      } else if (path.endsWith('/church/roles')) data = { roles: [
        { roleName: 'church_admin', permissions: [], description: null, isCustomized: false },
      ] };
      else if (path.endsWith('/church/roles/all')) data = [];
      else if (path.endsWith('/profiles/invite') && options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        state.invitations.push(body);
        data = { profileId: 'invited', ...body };
      }
      return Response.json({ success: true, data });
    };
  }, { hq, features });
}

for (const hq of [true, false]) {
  test(`${hq ? 'HQ chooses a branch' : 'branch inviter uses own branch'} without an HQ access field`, async ({ page, context }) => {
    if (!hq) await page.setViewportSize({ width: 390, height: 844 });
    await fixture(context, hq);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Invite User', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Admin HQ Access', { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('switch')).toHaveCount(0);
    await dialog.getByLabel('First Name', { exact: true }).fill('Test');
    await dialog.getByLabel('Last Name', { exact: true }).fill('Invite');
    await dialog.getByLabel('Email', { exact: true }).fill('invite@example.com');
    await dialog.getByRole('combobox', { name: 'Role', exact: true }).click();
    await page.getByRole('option', { name: 'Secretary', exact: true }).click();
    const branch = dialog.getByRole('combobox', { name: 'Branch', exact: true });
    await expect(branch).toContainText('Central');
    if (hq) {
      await branch.click();
      await page.getByRole('option', { name: 'West', exact: true }).click();
    } else await expect(branch).toBeDisabled();
    await dialog.getByRole('button', { name: 'Send Invitation', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const state = await page.evaluate(() => (window as unknown as {
      inviteFixture: { invitations: Record<string, unknown>[]; branchReads: number }
    }).inviteFixture);
    expect(state.invitations).toHaveLength(1);
    expect(state.invitations[0]).toMatchObject({ branchId: hq ? 'branch-b' : 'branch-a', role: 'secretary' });
    expect(state.invitations[0]).not.toHaveProperty('isAdminHq');
    expect(state.branchReads).toBe(hq ? 1 : 0);
  });
}

for (const plan of ['essentials', 'community', 'network']) {
  test(`${plan} restricts invite roles and custom-role creation`, async ({ page, context }) => {
    const features = ['giving','reports', ...(plan !== 'essentials' ? ['staff_roles'] : []), ...(plan === 'network' ? ['custom_roles'] : [])];
    await fixture(context, true, features);
    await context.addInitScript(() => {
      const previous = window.fetch.bind(window);
      window.fetch = async (input, options) => {
        const response = await previous(input, options);
        const path = new URL(input instanceof Request ? input.url : String(input), location.origin).pathname;
        if (!path.endsWith('/church/roles')) return response;
        const body = await response.json();
        body.data.roles.push({ roleName: 'media_team', label: 'Media Team', permissions: [], isChurchOwned: true });
        return Response.json(body);
      };
    });
    await page.goto('/admin/roles');
    await expect(page.getByRole('heading', { name: 'Roles & Permissions', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Role', exact: true })).toHaveCount(plan === 'network' ? 1 : 0);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Invite User', exact: true }).click();
    await page.getByRole('dialog').getByRole('combobox', { name: 'Role', exact: true }).click();
    await expect(page.getByRole('option')).toHaveCount(plan === 'essentials' ? 3 : plan === 'community' ? 8 : 9);
    await expect(page.getByRole('option', { name: 'Secretary', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Media Team', exact: true })).toHaveCount(plan === 'network' ? 1 : 0);
    await expect(page.getByRole('option', { name: 'Treasurer', exact: true })).toHaveCount(plan === 'essentials' ? 0 : 1);
  });
}

test('public pricing describes each plan’s staff-role access', async ({ page, context }) => {
  await context.route('https://embed.tawk.to/**', route => route.fulfill({ body: '' }));
  await page.goto('/');
  await expect(page.getByText('Church Admin + 1 Senior Pastor, Branch Pastor or Secretary', { exact: true })).toBeVisible();
  await expect(page.getByText('All built-in staff roles across 5 staff accounts', { exact: true })).toBeVisible();
  await expect(page.getByText('Create custom roles and permissions', { exact: true })).toBeVisible();
});

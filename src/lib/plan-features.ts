/** Mirrors the server feature catalog; unknown/missing entitlements never grant a paid feature. */
export const FEATURE_MINIMUM_PLAN = {
  staff_roles: 'community', custom_roles: 'network',
  giving: 'essentials', events: 'community', groups: 'community', forms: 'community',
  reports: 'essentials', email: 'community', media: 'community',
  tickets: 'network', pastoral: 'network', assets: 'network', analytics: 'network',
  sms: 'network', whatsapp: 'network', calls: 'network', webhooks: 'network',
} as const;
export type PlanFeature = keyof typeof FEATURE_MINIMUM_PLAN;

export function featureForPath(path: string): PlanFeature | undefined {
  // Paper (Abide IA) routes — same feature boundaries as the legacy prefixes below.
  if (/^\/insights\/reports(?:\/|$)/.test(path)) return 'reports';
  if (/^\/insights(?:\/|$)/.test(path)) return 'analytics';
  if (/^\/operations(?:\/|$)/.test(path)) return 'assets';
  if (/^\/gatherings\/events\/registrations(?:\/|$)/.test(path)) return 'events';
  if (/^\/gatherings\/events\/(?:tiers|tickets)(?:\/|$)/.test(path)) return 'tickets';
  if (/^\/gatherings\/groups(?:\/|$)/.test(path)) return 'groups';
  if (/^\/gatherings\/events(?:\/|$)/.test(path)) return 'events';
  if (/^\/connect\/appointments(?:\/|$)/.test(path)) return 'pastoral';
  if (/^\/connect(?:\/|$)/.test(path)) return 'email';
  if (/^\/library\/forms(?:\/|$)/.test(path)) return 'forms';
  if (/^\/library(?:\/|$)/.test(path)) return 'media';
  if (/^\/people\/pastoral(?:\/|$)/.test(path)) return 'pastoral';
  if (/^\/admin\/channels(?:\/|$)/.test(path)) return 'giving';
  if (/^\/analytics(?:\/|$)/.test(path)) return 'analytics';
  if (/^\/assets(?:\/|$)/.test(path)) return 'assets';
  if (/^\/(?:pastoral|appointments)(?:\/|$)/.test(path)) return 'pastoral';
  if (/^\/forms(?:\/|$)/.test(path)) return 'forms';
  if (/^\/(?:departments|admin\/(?:departments|cell-groups))(?:\/|$)/.test(path)) return 'groups';
  if (path === '/reports' || /^\/reports\/financial(?:\/|$)/.test(path)) return 'giving';
  if (/^\/reports(?:\/|$)/.test(path)) return 'reports';
  if (/^\/events\/(?:management|[^/]+\/tiers)(?:\/|$)/.test(path)) return 'tickets';
  if (/^\/events(?:\/|$)/.test(path)) return 'events';
  if (/^\/admin\/integrations(?:\/|$)/.test(path)) return 'giving';
  if (/^\/giving(?:\/|$)/.test(path)) return 'giving';
  if (/^\/(?:sermons|media)(?:\/|$)/.test(path)) return 'media';
  if (/^\/(?:communication\/(?:templates|broadcasts|messages))(?:\/|$)/.test(path)) return 'email';
  if (/^\/admin\/settings\/webhooks(?:\/|$)/.test(path)) return 'webhooks';
  return undefined;
}

export function featureForPermission(permission: string): PlanFeature | undefined {
  const [resource, surface] = permission.split(':');
  if (permission === 'roles:create') return 'custom_roles';
  if (resource === 'events' && surface === 'tickets') return 'tickets';
  if (['assets', 'asset_categories'].includes(resource)) return 'assets';
  if (['pastoral', 'pastoral_confidential', 'appointments'].includes(resource)) return 'pastoral';
  if (['departments', 'cell_groups'].includes(resource)) return 'groups';
  if (['sermons', 'media'].includes(resource)) return 'media';
  // The shared inbox ("emails") is part of the email feature (Community);
  // WhatsApp/SMS message history is its own Network feature. Without these
  // mappings the resources fell through as plan-free and leaked into Essentials.
  if (['emails', 'templates', 'broadcasts', 'messages'].includes(resource)) return 'email';
  if (resource === 'whatsapp') return 'whatsapp';
  if (resource === 'sms') return 'sms';
  if (resource === 'reports' && (surface === 'financial' || surface === 'view')) return 'giving';
  if (resource === 'integrations') return 'giving';
  if (resource === 'calls') return 'calls';
  if (resource === 'webhooks') return 'webhooks';
  if (['giving', 'events', 'forms', 'reports', 'analytics'].includes(resource)) return resource as PlanFeature;
  return undefined;
}

export function planAllowsPath(features: readonly string[] | undefined, path: string): boolean {
  const feature = featureForPath(path);
  return !feature || features?.includes(feature) === true;
}

export function planAllowsPermission(features: readonly string[] | undefined, permission: string): boolean {
  const feature = featureForPermission(permission);
  return !feature || features?.includes(feature) === true;
}

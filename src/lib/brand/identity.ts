export const BRAND_NAME = 'BelivrHQ';
export const BRAND_NAMESPACE = 'belivrhq';
/** These aliases protect existing sessions, printed codes and encrypted offline work. */
export const LEGACY_BRAND = {
  name: 'ChurchOS', namespace: 'churchos',
  cookies: { access: 'churchos_token', refresh: 'churchos_refresh_token' },
  clientHeader: 'x-churchos-client',
  sessionChannel: 'churchos-session', sessionEnded: 'churchos-session-ended',
  paymentChannel: 'churchos:subscription-payment-sync',
  offlineDatabase: 'churchos-offline-v1', offlineAad: 'churchos-offline-v1',
} as const;
export const SUBSCRIPTION_REFERENCE = /^(?:BHQSUB_|COSUB_)[a-f0-9]{32}$/;
/** Idempotent, lazy preference migration. Never overwrite the current namespace. */
export function migratePreferences(storage: Storage) {
  try {
    const keys = Array.from({length: storage.length}, (_, i) => storage.key(i)).filter((key): key is string => !!key);
    for (const key of keys) {
      if (!key.startsWith(`${LEGACY_BRAND.namespace}:`) && !key.startsWith(`${LEGACY_BRAND.namespace}-`)) continue;
      const next = key.replace(LEGACY_BRAND.namespace, BRAND_NAMESPACE);
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(next) === null) storage.setItem(next, value);
    }
  } catch { /* Restricted storage never prevents sign-in or rendering. */ }
}

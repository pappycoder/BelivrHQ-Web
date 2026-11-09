# Browser permission fixtures

`default-role-permissions.json` is a generated snapshot of the API's expanded
Secretary defaults. Browser tests import this local JSON so web CI and production
builds work without a sibling API checkout. Its source SHA-256 identifies the
exact seed file used.

When changing API default permissions, place `BelivrHQ-Backend` beside this web
repository and run:

```sh
node scripts/sync-browser-permission-fixtures.mjs
node scripts/sync-browser-permission-fixtures.mjs --check
```

The sync script is a developer command; normal web install, tests, type checking
and builds never execute it. It evaluates seed declarations without invoking the
seeder or making database requests. ES2022 output preserves the seed's Set-based
permission expansion.

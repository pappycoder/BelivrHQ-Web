# Dependency PR reconciliation — 23 November 2026

The remaining dependency PRs were reviewed against the latest approved UI release, not their older tested base.

- #84: integrate Lucide React 1.76.0.
- #87: integrate Sentry Next.js 11.15.0; publisher peers support Next.js 15.
- #85: integrate React DOM 19.3.1 and update React to the same exact version. The original PR failed npm installation because React DOM requires React ^19.3.1, while the application pinned React 19.2.8. Preserve the original dependency commits in the consolidated release history.
- #83: replace the proposed Node 26 declarations with Node 22.20.5, matching CI and deployment rather than advertising unsupported runtime APIs. Close the bot proposal as superseded after the corrected release merges.
- #86: retain eslint-config-next 15.5.29 alongside Next.js 15.5.29. The config-only Next 16 proposal fails lint with a circular legacy/flat configuration error. Close it as incompatible with the current configuration; a coordinated framework/config migration is separate work.

Dependabot groups React/React DOM and their declaration packages, and leaves Node declarations and Next lint-config major versions to coordinated runtime/framework migrations. Patch/minor and security updates remain enabled. No check, audit policy, coverage threshold or branch protection is relaxed.

Validate the consolidated dependency tree with a clean npm install, full lint, unit/UI contracts, dependency audit, TypeScript, production build and the hosted browser suite before merging into main and staging.

References: [React version matching](https://react.dev/warnings/version-mismatch), [Next.js ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint), [DefinitelyTyped version conventions](https://github.com/DefinitelyTyped/DefinitelyTyped#how-do-definitelytyped-package-versions-relate-to-versions-of-the-corresponding-library).

## Additional bot batch

Dependabot refreshed its queue after the configuration update and opened #92–#96. Integrate all five commits in a second consolidated, fully checked release: Motion 14.14.0, React Hook Form 7.92.0, Serwist 9.5.15, React Day Picker 10.0.2 and Tailwind CSS 4.3.5. Align @serwist/next and @tailwindcss/postcss with their patched runtime/build counterparts. [Motion's upgrade guide](https://motion.dev/docs/upgrade-guide) documents no public breaking changes in version 14. Preserve existing animation APIs, form behavior, date controls, offline visibility, configuration and required gates; no application-source changes are needed.

> **Approved and integrated:** The user approved all six proposals after this review. See [the integration report](approved-next-workspaces-2026-11-23.md) for the final scope and validation. The isolated preview remains the design reference.

# Follow-up consistency fixes and optional design preview

The user authorized the five confirmed issue groups to be fixed and requested a separate new-tab preview before adding the further improvements.

## Approved application fixes

1. Loaded-record searches now show match counts explicitly. Search misses use a shared no-results message and clear-search action, rather than claiming the register is empty. Page footers distinguish visible local matches from the server's total. Giving's all-page export also respects the search text.
2. Grid registers support an explicit primary identity column. Giving pins Giving source; its Date column can scroll. Primary columns remain visible and inherit the row's hover/focus/selection background.
3. The report PDF begins with the same ordered summary metrics and giving trend used by the on-screen preview, using a light paper layout in either app theme. Complete recorded breakdowns follow as paginated appendix sections. Long trends show the latest 12 months in both summary views and retain every month in the breakdown. Generic PDF exports retain their existing format.
4. Calendar uses the compact shared summary and labelled gathering-kind/event-type/branch dropdowns. Its existing permissions, scope and occurrence projection remain unchanged.
5. Filter labels identify the subject, and tours refer to the visible sort/layout/notification controls. Independent boolean filters remain separate from single-choice type dropdowns.

## Optional proposals awaiting approval

The separate sample-data app is at http://localhost:3101. Its code lives outside the application repository in `ui-next-enhancements-preview` under this task's visualization workspace. It does not call the backend or change real records.

- Guided long forms: section navigation, completion progress, linked validation errors and live review.
- Inbox: grouped conversations, reading pane and a browser-saved draft demonstration.
- Gathering details: event/service overview, capacity, preparation and accessible action placement.
- Asset history: one loan/return/maintenance timeline with due dates and activity details.
- Report presets: sample saved configurations, section order, zoom and sample PDF export.
- Touch controls: 44px row targets, labelled actions, selection and recovery examples.

No optional UI was added to application routes. Preview data, presets and drafts are disposable sample data on the preview origin.

## Validation

- 88 test files / 893 unit tests pass, including loaded-page count semantics, independent filter controls and the report summary/export pipeline.
- Scoped ESLint and standalone TypeScript pass. UI audit reports zero issues.
- PDF summary, first appendix page and final continuation page were rendered with Poppler and inspected. All 75 fixture rows survive pagination, and the Naira amount preserves its fractional value.
- All six optional proposals were checked at desktop and 390px phone widths, in light and dark themes: 24 captured layouts, no horizontal page overflow. Functional checks cover validation-link focus, draft recovery, saved presets, zoom, timeline filtering, reordering, retry and a successful sample PDF export.
- Final production/browser validation of approved fixes is recorded after the restart.

No backend/schema, hosted environment, deployment, external message, real notification mutation, payment or business-record change is part of this work.

# Shared preview layout on edit pages

The four standalone edit routes now use the same preview card and responsive action sidebar as their create routes: Events, Assets, Sermons and Forms. Members edit through their existing dialog rather than a standalone edit route.

- Events: editable admission and branch settings remain with the main form sections. A live calendar preview and Save changes/Cancel controls occupy the shared sidebar. Field labels have explicit associations for keyboard/screen-reader access. Existing paid-event and branch restrictions and update payloads are retained.
- Assets: reuse the existing shared page editor, including populated identity/assignment/value/status fields. The preview's wording now describes reviewing changes to an existing record.
- Sermons: Details, Audio and Video each retain their independent save action and Back/Next navigation, now next to the preview. Stage controls remain disabled during save. Cancel returns to the existing sermon.
- Forms: the edit builder uses the common summary sidebar and Save changes/Cancel controls, with the interactive respondent preview still available in its expandable panel and full preview dialog. Cancel returns to the existing form.

The form/sermon preview opt-in is named `withPreview` because it now serves both create and edit routes. Preview cards distinguish create drafts from edit drafts. No API endpoints, schemas or business mutation payloads changed.

## Verification

- All 721 tests across 62 files passed, including two populated asset-edit regressions that verify existing values, update-only actions and disabled controls during save without calling create/update mutations.
- Standalone TypeScript, scoped ESLint and diff checks passed.
- The live asset register has no records. Its populated edit presenter is tested with a synthetic fixture rather than creating a business record just for testing.
- Final production build passed.
- Browser review: populated Event, Sermon and Form edit pages each have one shared preview, a 320px sticky desktop sidebar at 1280px, and a 346px stacked mobile preview at 390px. All use `rgb(253, 251, 246)` and have no page-level horizontal overflow. A transient unloaded event snapshot was retried successfully.
- Changed each populated editor title temporarily, observed the live preview update, then restored the original title. No Save action was submitted.
- Sermon Audio and Video tabs expose their correct independent Save Audio/Save Video controls and Back navigation. Returned to Details without changing recordings.
- The edited form retains its existing question and publication settings. Its respondent preview expands on mobile, and its full preview dialog opens/closes on desktop without submitting answers.
- The shared asset page editor was checked at desktop/mobile sizes through Add asset; populated edit values/actions are covered by the synthetic tests because no live assets exist. Form/Sermon create pages were also checked after the preview-prop rename.
- Browser evidence: `/tmp/belivrhq-edit-preview-results.json`; screenshot: `/tmp/belivrhq-edit-preview-final.png`. The browser remains open on the populated event editor with no draft changes and the viewport override cleared.
- Frontend port 3000 and API port 3001 remain running. No business records were created or updated. Save persistence, live populated asset rendering and dark-theme appearance were not exercised in the browser.

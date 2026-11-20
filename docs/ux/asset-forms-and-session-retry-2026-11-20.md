> Follow-up: [Edit-page previews](edit-page-previews-2026-11-20.md) extends the shared layout to the standalone edit routes.

# Asset forms, empty states, identity images and retry

Add asset now uses the same SectionCard component as Add member and Add event: an internal eyebrow/title header, divider, padded body and two-column desktop form/preview layout. The preview and save/cancel controls stack below the fields on small screens. Existing fields, validation, branch restrictions, upload behavior and create/update payloads are retained. The edit dialog shares the same section design without the page preview.

Both shared EmptyState implementations now use the existing light card surface, border and radius.

PersonAvatar and Radix AvatarFallback use a bundled colorful adult office-worker image in business attire when there is no photo. Church settings and public form branding use a matching church image when there is no logo. Uploaded images remain preferred; missing/broken identities fall back locally. Microsoft Fluent Emoji images and MIT license are included under `public/images/defaults`, with source links in its README. BelivrHQ navigation branding remains the product identity.

Try again performs a full page reload. On protected pages it first verifies `/auth/session`, attempts the existing refresh flow after a 401, and only clears the session and replaces the page with `/login` when verification confirms expiry. Network, permission and service failures do not trigger logout. Public forms retry without requiring authentication. The shared error state, global error boundary, inbox, church settings and standalone public/billing retry buttons use this behavior.

## Shared create previews

All five standalone create pages (Members, Events, Assets, Sermons and Forms) use `CreatePreviewCard`, `CreatePreviewSidebar` and the same responsive layout. Each summary reflects the local draft, appears in a 320px sticky desktop sidebar, stacks below fields on mobile, and places create/cancel actions beside the review. Existing member photo selection and event details are retained. Sermons preview speaker/date/scripture/series before the existing details-first creation flow. The form builder previews title/question count/status/sharing and retains its interactive respondent view in an expandable section. Shared edit forms opt in only on their create routes, preserving edit behavior. Asset tour targets follow the rebuilt section headings.

## Verification

- All 719 tests across 61 files passed, including 10 new retry cases: valid session, expired session, recovered access token, failed post-refresh verification, network/403/503 failures, unavailable refresh, public forms, and failed cookie cleanup navigation.
- Standalone TypeScript, scoped ESLint, final production build and `git diff --check` passed.
- Browser: all five create pages verified at 1280px and 390px. Each has one shared preview, a 320px sticky sidebar on desktop, a 346px stacked preview on mobile, the light card surface `rgb(253, 251, 246)`, and no page-level horizontal overflow. The initially unloaded Members snapshot was retried and verified after loading.
- Entered and cleared temporary draft titles/names on all five pages; each preview updated. No create/save action was submitted. The form builder respondent preview expands and its full preview dialog opens and closes correctly.
- Asset tutorial still reaches the assignment and valuation sections after the redesign. Asset loans' empty state was checked live with the same white card surface and 17px radius.
- A nonexistent asset URL exercised the real Try again button: it reloaded the document and restored the valid signed-in session. Confirmed-expiry/logout cases use the regression tests rather than expiring the user's live session.
- Corporate adult defaults loaded successfully in both workspace avatar positions. The church's existing uploaded logo remained visible in settings and respondent preview; the missing-logo fallback is implemented and its bundled artwork was visually inspected without changing the church record.
- Browser evidence: `/tmp/belivrhq-create-preview-final.json`; screenshot: `/tmp/belivrhq-create-preview-final.png`. Browser remains open on Add asset, viewport override cleared, with frontend port 3000 and API port 3001 running.

No business records are created for verification. Expiry is tested with mocked session responses to preserve the user's active browser session.

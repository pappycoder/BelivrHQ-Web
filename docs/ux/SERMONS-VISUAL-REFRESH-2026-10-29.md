# Sermons visual refresh — 2026-10-29

## Browsing

The Sermons directory retains its table layout with a compact filtered result count, neutral surfaces and the saved personal accent. Removed the two statistic-only list requests and their large cards. Search and branch remain visible; archive/sort/reset move into More filters with a secondary-filter count. Speaker/series deep-link chips remain visible and clearable. Audio attached and Video attached badges describe saved URL presence, without claiming playback verification. Existing pagination, table options, selection and export boundaries remain.

Series and Speakers retain existing aggregate data/counts and filtered-sermon destinations, with compact directory headers and subtle icons. Names are keyboard-accessible links when sermon-list access exists; aggregate-only readers still see the names without inaccessible links. No speaker/series creation workflow was added.

## Details and editor

Details group speaker/date/scripture into a compact summary and branch/series/duration/tags/description into one information panel. Audio and responsive video playback remain prominent, with existing authenticated file URLs, supported embeds, original-recording links and playback fallback messages. Missing recordings have an explicit empty state. Bookmark stays visible; the labelled Sermon management vertical-dot menu contains only the existing authorized Edit/archive/restore/permanent-delete actions. Directory management also uses vertical-dot menus. Confirmations return focus to their originating triggers.

Details, Audio and Video editor sections retain their independent Save actions. Sermons-scoped styles, section icons, smaller upload/link selectors and file panels refine presentation without touching field values, defaults, validation, draft state, submit handlers or upload processing. New sermons still save details first; recordings remain optional. Uploaded-file reuse, retry handling, saved-branch upload scope, URL validation/removal and unsaved recording/metadata retention remain unchanged. Other modules and the shared media-library presentation are unchanged.

## Validation and release

459 unit tests, 24 browser scenarios, targeted lint, TypeScript, whitespace checks and the production build passed. The existing media suite covers the default accent; 32 directory/detail/create/edit/recording-section previews cover 390px/1440px, light/dark modes and a saved violet accent. Browser tests cover browsing/filter/sort/pagination, removal of statistic reads, branch forwarding, keyboard aggregate links, aggregate-only access, reader controls, bookmarks, lifecycle confirmations/focus, empty/error/retry states, playback, separate saves, direct uploads, failures/retries and draft/branch retention. Fixture-only desktop/mobile, light/dark previews with a saved violet accent are stored at `/tmp/belivrhq-sermon-previews/`; third-party video network access is mocked/blocked during these tests.

Web-only through the existing Git/Vercel integration. No API contracts, backend, database, subscription, permission seeds, public pages or production church records are changed by validation.

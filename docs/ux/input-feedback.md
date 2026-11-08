# Input feedback

`FieldFeedback` is mounted once in the root layout. It enhances existing and dynamically inserted native inputs, textareas, native selects and shared select triggers without wrapping, replacing, remounting or controlling them.

## Prefixes

Decorative SVG backgrounds are chosen from the input type and its name, accessible label, autocomplete metadata and placeholder. No field value is used to choose or generate an icon. Existing leading icons, including auth and search adornments, are retained. Checkbox/radio/file/colour/range controls and single-character OTP boxes keep their existing presentation.

For custom fields, `data-field-label` provides semantic metadata. `data-prefix-icon` can override the inferred icon with a key from `FIELD_ICON_PATHS`; `data-prefix-icon="none"` disables the generated prefix. Existing custom prefix elements may be marked with `data-field-prefix`. Dark-theme and invalid-state icons use the shared palette.

## Text and errors

A short-lived, aria-hidden mirror animates only the changed characters: insertion rises 4px while fading in (160ms), and deleted characters drop 4px while fading out (140ms). Native values, focus, refs, selection, caret and form behavior remain intact. Password mirror text contains bullets only. Mirrors are dismissed on navigation keys, selection, pointer interaction, blur, scrolling, resizing and unmounting. Paste/autofill, composition and partially entered numeric/date/time values use native rendering.

Native validation failures and `aria-invalid="true"` produce a destructive border/ring and a brief 3px shake (300ms). Form libraries remain responsible for their validation state and messages. Generated respondent forms explicitly expose required-field failures, as do intake review failures and password confirmation checks. Errors clear as the owning validation state or native validity is corrected; native form resets clear native feedback.

Reduced-motion preferences suppress text motion and shaking, including when the preference changes during an animation; icons and error colours remain visible. Mirrors have no pointer events or accessible text and never replace the native field's value.

## Verification

`src/lib/field-feedback.spec.ts` covers semantic matching and contiguous edits, including emoji. `test/browser/field-feedback.e2e.ts` covers native controls, additions/deletions, selection/caret, multiline text, error/retry/reset, reduced motion, masked passwords, composition/autofill, numeric partial edits, later-inserted controls, mobile layout and password confirmation. Registration/public-form browser suites cover integration with staff and respondent pages.

Deploy the web application only; no API, database migration or new environment configuration is needed.

## Placeholder coverage

All rendered text inputs and textareas receive a nonempty placeholder through the shared field controller, including fields inserted later in dialogs and tabs. It derives copy from the field's explicit label, ARIA label, associated label or name, preserving authored placeholders. Generated public/private/intake forms also render their label-based placeholders in their initial markup. Labels and required/optional indicators remain separate, and the existing italic placeholder style applies.

Examples: “Enter first name”, “Enter offering amount” and “Enter notes”. Native date/time inputs retain their fields and browser format display (browsers may ignore their placeholder attribute); opening a picker now uses the shared [measuring-tape wheels](wheel-date-time-picker.md). File uploads, checkboxes, radios, color/range pickers, buttons and hidden/bot-protection fields have no text placeholder. Values, validation, input motion and error feedback are unchanged.

Placeholder validation: 601 unit tests and 22 focused browser checks passed, together with TypeScript, scoped lint and the production build. Browser coverage includes generated fields, dynamically added native inputs, custom placeholder preservation, label changes and existing field-feedback/mobile behavior.

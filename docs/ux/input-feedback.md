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

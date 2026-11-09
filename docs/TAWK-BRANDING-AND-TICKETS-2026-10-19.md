# BelivrHQ Support: in-app Tawk chat and branding

## Current application behavior

- **Help Centre** opens public documentation at `/help`.
- **Contact support** opens `/support` in the dashboard. The public `/help/contact-support` page remains available for sign-in and administrator guidance.
- Support uses only the native in-app Tawk floating chat and Live chat actions. The widget initializes for verified active `church_admin` or `super_admin` profiles. Ordinary staff should ask their church administrator to contact support. Existing scope/logout teardown and failed-load retry behavior remain.
- Support ticket routes, embedded portals, buttons, email links, navigation and ticket instructions have been removed. `/support/ticket` is no longer served. Event booking tickets are unrelated.
- Leave offline messages and a reply email inside the chat widget. To start a new chat session, use the native widget menu; previous history can remain visible.
- No remote Tawk property settings, provider data, email forwarding, backend schemas or outgoing messages were changed. This application change does not disable Tawk features configured separately in its dashboard.

## Apply branding in the Tawk dashboard

Tawk's cross-origin widget owns its logo, colours and welcome text. These settings are saved in the Tawk property, not controlled by the embed snippet's JavaScript API. No connected Tawk administration integration was found, so these remote settings have **not** been applied. The downloadable [brand kit](support-branding/belivrhq-tawk-brand-kit.zip) contains existing official logos and the exact reference settings. It is a reference bundle, **not** an importable Tawk configuration.

1. Sign into the Tawk dashboard and select the BelivrHQ property for widget `1k59fptu4` (property `6ad5c1c809d49434c8f515a2`).
2. Set the property name to **BelivrHQ Support** and its Property Image to the official square logo. Use `belivrhq-favicon-white.png` on the dark teal header, or `belivrhq-emblem.png` if using a light header.
3. Open **Administration → Chat Widget → Widget Appearance → Advanced** and apply:

| Setting | Value |
| --- | --- |
| Header / bubble colour | `#173D3E` |
| Header text | `#FFFFFF` |
| Agent message background | `#F1F5E9` |
| Agent message text | `#183B40` |
| Visitor message background | `#173D3E` |
| Visitor message text | `#FFFFFF` |
| Placement | Bottom right; preview desktop and mobile |
| Shape | Native circular bubble |

4. Open **Widget Content → Edit Content**. Add the Logo card and configure Online, Away and Offline states:

| Field | Suggested BelivrHQ text |
| --- | --- |
| Heading | BelivrHQ Support |
| Online welcome | Welcome to BelivrHQ Support. How can we help you today? |
| Away message | We may take a little longer to reply. Leave your question and email so we can follow up. |
| Offline message | We are currently offline. Leave your name, email and message in the chat so we can follow up. |
| Help link | Your deployed app's `/help` URL |

5. Require **Name** and **Email** on the pre-chat/offline form if you want reliable email follow-up. Enable the built-in chat card/menu so users can end a session and start another.
6. Save and refresh the deployed app to check both screen sizes. Provider settings take effect without another app code change. Badge removal and branded sender/domain features belong to the optional paid Whitelabel add-on; the app leaves Tawk's attribution intact.

Official references: [appearance](https://help.tawk.to/article/changing-the-appearance-of-the-chat-widget), [logo and content cards](https://help.tawk.to/article/customizing-the-widget-header-and-body-cards), [optional add-ons](https://www.tawk.to/add-ons/).


## Validation and rollout

Validation passed: production build, TypeScript, scoped lint, 319 unit tests and 41 support/help browser checks. Browser fixtures intercept Tawk; they verify chat access, session cleanup, public contact guidance, removal of ticket navigation/portal and mobile sizing without sending real messages. Deploy the web application and verify live chat on the deployed origin. No migration or new credential is required.

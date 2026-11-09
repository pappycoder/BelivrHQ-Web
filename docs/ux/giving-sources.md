# Giving sources and navigation

The Giving menu uses **Giving records** for `/giving/donations` and **Giving categories** for `/giving/funds`. Page headings, category controls and overview shortcuts use the same terminology. Routes, permissions and plan feature keys remain unchanged.

Giving records and recent gifts share a source identity component. A collection without a linked individual displays **General giving**, or its authored collection title, with a collection icon. Service and event collections retain their context. Combined cell-group giving uses the group name and group icon; linked individuals retain their name and avatar. A linked member whose display name is unavailable displays **Member giving**. Missing member information is not treated as an anonymity flag.

Records and statements exports use the same source labels and include service, event and group context. Amounts, totals, named-giver rankings, receipt actions and stored financial data are unchanged.

Coverage includes six source-label unit cases and browser scenarios for desktop/mobile records, recent gifts, records/statements CSV exports and the categories heading. The receipt-delivery confirmation regression checks the existing Manage action.

The ledger scrolls horizontally on narrow screens to preserve readable source labels, while date filters wrap. Validation: 637 unit tests and seven production-browser scenarios passed, alongside TypeScript, scoped lint without autofix and an isolated production build. Desktop and 320 px screenshots were inspected.

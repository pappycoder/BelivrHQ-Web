# Ask BelivrHQ composer and AI setup

Send requires a verified assistant context, a nonblank question and no pending reply. It does not depend on an API key or AI mode. The existing reference-guidance mode works without a model provider.

Access loading now has a 15-second deadline and a retry message. Empty/malformed successful context responses also expose retry instead of remaining in a loading state. Replies have a 35-second browser deadline; a timeout restores the question and composer, while late responses cannot replace newer turns. Closing/unmounting, retrying context and starting a new conversation retain cancellation behavior. A helper under the question explains loading, pending responses and blank input. All server authentication, staff scope and request/budget guards remain authoritative.

For OpenAI synthesis, configure these variables on the **backend** deployment and restart/redeploy it:

- `OPENAI_API_KEY`: the server-only provider key.
- `ASK_BELIVRHQ_AI_ENABLED=true`: explicit activation.
- `ASK_BELIVRHQ_MODEL`: a model supported by the Responses/structured-output integration.
- `ASK_BELIVRHQ_INPUT_USD_PER_MILLION` and `ASK_BELIVRHQ_OUTPUT_USD_PER_MILLION`: current model rates for existing cost reservations. Blank or nonpositive values intentionally select reference guidance.

AI requests additionally require an active BelivrHQ subscription and a successful shared Redis budget reservation. A key alone does not satisfy these application checks. See the backend `docs/ASK-BELIVRHQ-2026-10-20.md` for quotas, estimated-cost accounting and output verification. No secret belongs in `NEXT_PUBLIC_*`. Deployed environment values have not been inspected or changed; local configuration alone cannot establish live provider readiness.

Groq and Gemini advertise limited free API tiers. They require a provider adapter, separate server credentials and model-specific output verification before use here; replacing a provider would not fix a stalled context request. No provider switch, real generation or paid request was performed.

References: [OpenAI authentication](https://developers.openai.com/api/reference/overview), [Groq free-plan limits](https://console.groq.com/docs/rate-limits), [Gemini pricing and free-tier data use](https://ai.google.dev/gemini-api/docs/pricing).

Deploy the web update for the composer fixes. No database migration or backend code change is required.

Short greetings such as `Hi` are accepted. Client and API both reject only blank/whitespace input (with the existing 1200-character upper bound), while retaining verified-context and in-flight request gates.

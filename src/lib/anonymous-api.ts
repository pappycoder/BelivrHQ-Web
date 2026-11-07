/** Only token-scoped public form and intake metadata/submission operations omit account credentials. */
export function isAnonymousPublicFormRequest(endpoint: string, method: string) {
  return (
    (method === "GET" && /^(?:forms|intake)\/public\/[a-zA-Z0-9_-]+\/meta$/.test(endpoint)) ||
    (method === "POST" && /^(?:forms|intake)\/public\/[a-zA-Z0-9_-]+\/submit$/.test(endpoint))
  );
}

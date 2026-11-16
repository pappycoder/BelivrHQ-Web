"use strict";
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
require("ts-node").register({ project: path.resolve("tsconfig.scripts.json") });
const {
  migrateSingleFile,
  preparePlans,
  pullEnvironments,
  pushPlans,
  syncBackend,
  resolveVercelProject,
} = require("../../scripts/lib/vercel-env.ts");
const guard = require("../../scripts/check-private-env.cjs");
const key = "a".repeat(64);
const envelope = Buffer.from(
  JSON.stringify({ v: "v2", c: "storage-ciphertext", k: [1, 2, 3] }),
).toString("base64");
let root;
function write(file, value) {
  fs.writeFileSync(path.join(root, file), value);
}
function read() {
  return JSON.parse(
    fs.readFileSync(path.join(root, ".env.vercel.json"), "utf8"),
  );
}
function save(data) {
  write(".env.vercel.json", JSON.stringify(data, null, 2));
}
function fixture() {
  return {
    shared: {
      NODE_ENV: "production",
      INTERNAL_PROXY_SECRET: key,
      NEXT_PUBLIC_SENTRY_DSN: "https://public@ingest.sentry.example/1",
      SENTRY_AUTH_TOKEN: "test-private-sentry-token",
    },
    preview: {
      API_URL: "https://preview-api.example",
      NEXT_PUBLIC_SITE_URL: "https://preview-web.example",
    },
    production: {
      API_URL: "https://live-api.example",
      NEXT_PUBLIC_SITE_URL: "https://live-web.example",
    },
  };
}
function linked() {
  fs.mkdirSync(path.join(root, ".vercel"), { recursive: true });
  write(
    ".vercel/repo.json",
    JSON.stringify({
      projects: [
        { id: "prj_other", orgId: "team_web", directory: "other" },
        { id: "prj_web", orgId: "team_web", directory: "." },
      ],
    }),
  );
}
function remote(records, calls = []) {
  return (_, args, options) => {
    calls.push({ args, options });
    if (args[0] === "--version") return { status: 0, stdout: "65.9.0" };
    const rows = records[args[args.indexOf("--environment") + 1]] || [];
    if (args[1] === "pull") {
      fs.writeFileSync(
        args[2],
        rows
          .filter(
            (r) =>
              !r.gitBranch && r.type !== "secret" && r.type !== "sensitive",
          )
          .map((r) => `${r.key}='${r.exportValue ?? r.value ?? ""}'`)
          .join("\n"),
      );
      return { status: 0 };
    }
    return { status: 0, stdout: JSON.stringify({ envs: rows }) };
  };
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "belivrhq-web-env-"));
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.cpSync(path.resolve("config/vercel"), path.join(root, "config/vercel"), {
    recursive: true,
  });
  save(fixture());
  linked();
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test("classifies browser settings as Config and server credentials as Secret", () => {
  const plan = preparePlans(root, ["production"])[0];
  assert.equal(plan.entries.NEXT_PUBLIC_SENTRY_DSN.type, "config");
  assert.equal(plan.entries.API_URL.type, "config");
  assert.equal(plan.entries.SENTRY_AUTH_TOKEN.type, "secret");
  assert.equal(plan.entries.INTERNAL_PROXY_SECRET.type, "secret");
});
test("rejects accidental NEXT_PUBLIC exposure even if Vercel would label the value Secret", () => {
  const data = read();
  data.shared.NEXT_PUBLIC_SENTRY_AUTH_TOKEN = "test-private-token";
  save(data);
  assert.throws(
    () => preparePlans(root, ["preview"]),
    /not an approved browser-public/,
  );
});
test("refuses backend-only credentials in a web push", () => {
  const data = read();
  data.shared.SUPABASE_SERVICE_ROLE_KEY = "test-private-service-role";
  save(data);
  assert.throws(
    () => preparePlans(root, ["production"]),
    /belongs only in the backend/,
  );
});
test("rejects private components in a browser-public Sentry DSN", () => {
  const data = read();
  data.shared.NEXT_PUBLIC_SENTRY_DSN =
    "https://public:private@ingest.sentry.example/1";
  save(data);
  assert.throws(() => preparePlans(root, ["production"]), /public HTTPS DSN/);
});
test("keeps API and site origins target-specific and rejects loopback hosted origins", () => {
  const data = read();
  data.shared.API_URL = "https://wrong-shared.example";
  save(data);
  assert.throws(
    () => preparePlans(root, ["preview"]),
    /belongs in each environment/,
  );
  delete data.shared.API_URL;
  data.preview.API_URL = "http://localhost:3001";
  save(data);
  assert.throws(() => preparePlans(root, ["preview"]), /public HTTPS origin/);
});
test("explicit empty target assignments override nonempty shared settings", () => {
  const data = read();
  data.preview.NEXT_PUBLIC_SENTRY_DSN = "";
  save(data);
  const plans = preparePlans(root, ["preview", "production"]);
  assert.equal(plans[0].entries.NEXT_PUBLIC_SENTRY_DSN.value, "");
  assert.notEqual(plans[1].entries.NEXT_PUBLIC_SENTRY_DSN.value, "");
});
test("resolves the correct web repository link", () => {
  assert.deepEqual(resolveVercelProject(root), {
    projectId: "prj_web",
    orgId: "team_web",
  });
});
test("uses decrypted URL exports and blanks hidden secrets without local fallback", () => {
  const calls = [];
  pullEnvironments(
    root,
    ["preview", "production"],
    remote(
      {
        preview: [
          {
            key: "API_URL",
            type: "encrypted",
            value: envelope,
            exportValue: "https://new-preview-api.example",
          },
          { key: "INTERNAL_PROXY_SECRET", type: "secret" },
        ],
        production: [
          {
            key: "API_URL",
            type: "encrypted",
            value: envelope,
            exportValue: "https://new-live-api.example",
          },
          { key: "INTERNAL_PROXY_SECRET", type: "secret" },
        ],
      },
      calls,
    ),
  );
  const data = read();
  assert.equal(data.preview.API_URL, "https://new-preview-api.example");
  assert.equal(data.production.API_URL, "https://new-live-api.example");
  assert.equal(data.shared.INTERNAL_PROXY_SECRET, "");
  assert.equal(JSON.stringify(data).includes(envelope), false);
  for (const { args } of calls) {
    assert.ok(args.includes("prj_web"));
    assert.ok(args.includes("team_web"));
  }
});
test("preserves readable remote empties and never seeds pull from .env.local", () => {
  write(".env.local", "SENTRY_AUTH_TOKEN=local-secret-must-not-refill\n");
  pullEnvironments(
    root,
    ["production"],
    remote({
      production: [
        { key: "SENTRY_AUTH_TOKEN", type: "secret" },
        { key: "API_URL", type: "config", value: "" },
      ],
    }),
  );
  assert.equal(read().production.API_URL, "");
  assert.equal(read().production.SENTRY_AUTH_TOKEN, "");
  assert.equal(
    fs
      .readFileSync(path.join(root, ".env.local"), "utf8")
      .includes("local-secret-must-not-refill"),
    true,
  );
});
test("aborts before replacement if a decrypted export still contains storage ciphertext", () => {
  const before = fs.readFileSync(path.join(root, ".env.vercel.json"), "utf8");
  assert.throws(
    () =>
      pullEnvironments(
        root,
        ["production"],
        remote({
          production: [{ key: "API_URL", type: "encrypted", value: envelope }],
        }),
      ),
    /encrypted storage payload/,
  );
  assert.equal(
    fs.readFileSync(path.join(root, ".env.vercel.json"), "utf8"),
    before,
  );
});
test("sends secrets on stdin and uses the linked web project for push", () => {
  const calls = [];
  pushPlans(root, preparePlans(root, ["preview"]), remote({}, calls));
  const push = calls.find(
    (c) => c.args[0] === "env" && c.args[2] === "INTERNAL_PROXY_SECRET",
  );
  assert.equal(push.options.input, key);
  assert.equal(push.args.includes(key), false);
  assert.ok(push.args.includes("prj_web"));
  assert.ok(push.args.includes("preview"));
});
test("an explicit empty is sent to Vercel rather than omitted", () => {
  const data = read();
  data.shared.SENTRY_AUTH_TOKEN = "";
  save(data);
  const calls = [];
  pushPlans(root, preparePlans(root, ["production"]), remote({}, calls));
  const push = calls.find((c) => c.args[2] === "SENTRY_AUTH_TOKEN");
  assert.equal(push.options.input, "");
  assert.equal(push.args[push.args.indexOf("--value") + 1], "");
});
test("matches backend proxy and origins explicitly without importing backend secrets", () => {
  const backend = path.join(root, "backend.json");
  fs.writeFileSync(
    backend,
    JSON.stringify({
      shared: {
        INTERNAL_PROXY_SECRET: "b".repeat(64),
        INTEGRATIONS_ENCRYPTION_KEY: "never-copy-this",
      },
      preview: {
        PUBLIC_API_URL: "https://staging-api.example",
        WEB_URL: "https://staging-site.example",
      },
      production: {
        PUBLIC_API_URL: "https://production-api.example",
        WEB_URL: "https://production-site.example",
      },
    }),
  );
  syncBackend(root, backend);
  const data = read();
  assert.equal(data.shared.INTERNAL_PROXY_SECRET, "b".repeat(64));
  assert.equal(data.preview.API_URL, "https://staging-api.example");
  assert.equal(
    data.production.NEXT_PUBLIC_SITE_URL,
    "https://production-site.example",
  );
  assert.equal(data.shared.SENTRY_AUTH_TOKEN, "test-private-sentry-token");
  assert.equal(JSON.stringify(data).includes("never-copy-this"), false);
});
test("retains differing backend proxy secrets as explicit target overrides", () => {
  const backend = path.join(root, "backend.json");
  const data = {
    shared: { INTERNAL_PROXY_SECRET: key },
    preview: {
      INTERNAL_PROXY_SECRET: "b".repeat(64),
      PUBLIC_API_URL: "https://preview-api.example",
      WEB_URL: "https://preview.example",
    },
    production: {
      PUBLIC_API_URL: "https://api.example",
      WEB_URL: "https://live.example",
    },
  };
  fs.writeFileSync(backend, JSON.stringify(data));
  syncBackend(root, backend);
  assert.equal(read().shared.INTERNAL_PROXY_SECRET, undefined);
  assert.equal(read().preview.INTERNAL_PROXY_SECRET, "b".repeat(64));
  assert.equal(read().production.INTERNAL_PROXY_SECRET, key);
});
test("backend matching fails before writing when the source is incomplete", () => {
  const before = fs.readFileSync(path.join(root, ".env.vercel.json"), "utf8");
  write("backend.json", "{}");
  assert.throws(
    () => syncBackend(root, path.join(root, "backend.json")),
    /must contain/,
  );
  assert.equal(
    fs.readFileSync(path.join(root, ".env.vercel.json"), "utf8"),
    before,
  );
});
test("private config is protected by Git filename guards", () => {
  assert.equal(guard.isPrivateEnvPath(".env.vercel.json"), true);
  assert.equal(guard.isPrivateEnvPath(".env.local"), true);
  assert.equal(guard.isPrivateEnvPath("config/vercel/env.example.json"), false);
});
test("migration creates private JSON without copying local runtime secrets or backend key slots", () => {
  fs.rmSync(path.join(root, ".env.vercel.json"));
  write(".env.local", "SENTRY_AUTH_TOKEN=do-not-autofill\n");
  migrateSingleFile(root);
  const data = read();
  assert.equal(data.shared.SENTRY_AUTH_TOKEN, "");
  assert.equal(data.shared.INTERNAL_PROXY_SECRET, "");
  assert.equal(data.shared.INTEGRATIONS_ENCRYPTION_KEY, undefined);
  assert.equal(data.shared.INTERNAL_PROXY_SECRET_PREVIOUS_KEYS, undefined);
  assert.equal(
    fs.statSync(path.join(root, ".env.vercel.json")).mode & 0o777,
    0o600,
  );
});

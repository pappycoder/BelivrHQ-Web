import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";

// Development-only sync. The generated fixture keeps web CI independent of the API checkout.
const web = fileURLToPath(new URL("../", import.meta.url));
const sourcePath = path.resolve(web, "../BelivrHQ-Backend/prisma/seeds/shared/permissions.seed.ts");
const source = await fs.readFile(sourcePath, "utf8");
const tree = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true);
const declarations = tree.statements.filter(statement =>
  !ts.isImportDeclaration(statement) &&
  !(ts.isFunctionDeclaration(statement) && statement.name?.text === "seedPermissions")
).map(statement => statement.getText(tree)).join("\n");
const code = ts.transpileModule(declarations, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { DEFAULT_PERMISSION_MATRIX } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
if (!Array.isArray(DEFAULT_PERMISSION_MATRIX.secretary) || DEFAULT_PERMISSION_MATRIX.secretary.length < 3) throw new Error("Secretary permission expansion returned an incomplete fixture");
const output = JSON.stringify({
  source: "BelivrHQ-Backend/prisma/seeds/shared/permissions.seed.ts",
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  roles: { secretary: DEFAULT_PERMISSION_MATRIX.secretary },
}, null, 2) + "\n";
const destination = path.join(web, "test/fixtures/default-role-permissions.json");
if (process.argv.includes("--check")) {
  if (await fs.readFile(destination, "utf8") !== output) throw new Error("Role fixture is stale. Run node scripts/sync-browser-permission-fixtures.mjs with the API checkout present.");
} else {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, output);
}

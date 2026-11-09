/** Export reviewable Markdown from the exact content rendered by the legal pages. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "src/lib/legal");
const output = path.join(root, "docs/legal");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "belivrhq-legal-"));
try {
  for (const name of fs.readdirSync(source).filter((name) => name.endsWith(".ts"))) {
    const compiled = ts.transpileModule(fs.readFileSync(path.join(source, name), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    fs.writeFileSync(path.join(temporary, name.replace(/\.ts$/, ".js")), compiled.outputText);
  }
  const { legalDocuments, LEGAL_COMPANY, LEGAL_VERSION, LEGAL_DATE } = (await import(pathToFileURL(path.join(temporary, "index.js")).href)).default;
  fs.mkdirSync(output, { recursive: true });
  for (const document of legalDocuments) {
    const lines = [
      `# ${document.title}`, "",
      `Effective and last updated: ${LEGAL_DATE}. Version: ${LEGAL_VERSION}.`, "",
      `Operator: ${LEGAL_COMPANY.name}, ${LEGAL_COMPANY.country}.`, "",
      `Designated privacy and legal contact: ${LEGAL_COMPANY.email}.`, "",
      `Website: https://church-os-web.vercel.app/${document.slug}`, "",
      ...document.introduction.flatMap((paragraph) => [paragraph, ""]),
      "## Important points to read first", "",
      ...document.highlights.map((text) => `- ${text}`), "",
    ];
    for (const section of document.sections) {
      lines.push(`## ${section.title}`, "");
      if (section.notice) lines.push(`**${section.notice}**`, "");
      if (section.table) {
        const cell = (value) => value.replace(/\|/g, "\\|").replace(/\n/g, " ");
        lines.push(`| ${section.table.headers.map(cell).join(" | ")} |`);
        lines.push(`| ${section.table.headers.map(() => "---").join(" | ")} |`);
        lines.push(...section.table.rows.map((row) => `| ${row.map(cell).join(" | ")} |`), "");
      }
      lines.push(...(section.paragraphs ?? []).flatMap((paragraph) => [paragraph, ""]));
      if (section.bullets) lines.push(...section.bullets.map((text) => `- ${text}`), "");
    }
    const text = lines.join("\n");
    const file = `${document.slug.toUpperCase()}.md`;
    fs.writeFileSync(path.join(output, file), text);
    console.log(`${file}: ${document.sections.length} sections, approximately ${text.split(/\s+/).length} words`);
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

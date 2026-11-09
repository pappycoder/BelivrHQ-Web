import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogSource = await fs.readFile(path.join(root, "src/lib/help/catalog.ts"), "utf8");
const { outputText } = ts.transpileModule(catalogSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { helpArticles, helpTopics } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const ink = "#183b40", lime = "#d6ed97", paper = "#fafbf7";
const logo = await sharp(path.join(root, "public/brand/belivrhq-lockup-light.png")).trim().resize({ width: 200 }).png().toBuffer();
const mark = await sharp(path.join(root, "public/brand/belivrhq-emblem.png")).trim().resize({ width: 130 }).png().toBuffer();
const xml = (text) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
const lines = (text, limit) => {
  const result = [""];
  for (const word of text.split(/\s+/)) {
    const last = result.length - 1;
    if (result[last] && (result[last] + " " + word).length > limit) result.push(word);
    else result[last] += `${result[last] ? " " : ""}${word}`;
  }
  return result;
};
const textLines = (text, x, y, size, color, limit, step = size * 1.18, family = "DejaVu Sans", weight = 400) =>
  lines(text, limit).map((line, index) => `<text x="${x}" y="${y + index * step}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${xml(line)}</text>`).join("");
const svg = ({ title, subtitle, label, home = false }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${ink}"/><stop offset="1" stop-color="#0e2e32"/></linearGradient><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#c8e6cb" stroke-opacity=".045"/></pattern></defs>
<rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#grid)"/>
<circle cx="1110" cy="-25" r="270" fill="none" stroke="#d6ed97" stroke-opacity=".08" stroke-width="76"/>
<rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#ecf1e8" stroke-opacity=".16"/>
<image href="data:image/png;base64,${logo.toString("base64")}" x="66" y="56" width="200" height="64" preserveAspectRatio="xMinYMid meet"/>
<text x="68" y="170" font-family="DejaVu Sans" font-size="13" letter-spacing="3" fill="${lime}">${xml(label.toUpperCase())}</text>
${home ? `<text x="64" y="263" font-family="DejaVu Sans" font-size="60" letter-spacing="-2.8" fill="${paper}">A little less admin.</text>
<text x="64" y="342" font-family="DejaVu Serif" font-size="60" font-style="italic" letter-spacing="-2.5" fill="${lime}">A lot more ministry.</text>` : textLines(title, 64, 247, 48, paper, 25, 59, "DejaVu Sans", 500)}
${textLines(subtitle, 68, home ? 408 : 437, 19, "#c4d5d0", 48, 29)}
<path d="M68 530H650" stroke="#ecf1e8" stroke-opacity=".2"/>
<text x="68" y="565" font-family="DejaVu Sans" font-size="13" letter-spacing="1.3" fill="#c4d5d0">${home ? "PEOPLE  /  ATTENDANCE  /  GIVING  /  BRANCHES" : "BELIVRHQ HELP CENTRE  /  CLEAR, PRACTICAL GUIDES"}</text>
<rect x="773" y="140" width="340" height="380" rx="170" fill="#d6ed97"/>
<path d="M773 398h340M773 444h340" stroke="#183b40" stroke-opacity=".10"/>
<circle cx="943" cy="300" r="103" fill="${paper}"/>
<image href="data:image/png;base64,${mark.toString("base64")}" x="878" y="226" width="130" height="145" preserveAspectRatio="xMidYMid meet"/>
<rect x="741" y="409" width="280" height="62" rx="15" fill="${paper}" transform="rotate(-5 881 440)"/>
<circle cx="774" cy="449" r="13" fill="#d6ed97"/>
<path d="m768 448 4 4 8-9" stroke="#183b40" stroke-width="2" fill="none"/>
<text x="800" y="448" font-family="DejaVu Sans" font-size="17" fill="${ink}" transform="rotate(-5 800 448)">${home ? "Your church, together." : "A clear next step."}</text>
<circle cx="1097" cy="157" r="34" fill="${paper}"/>
<path d="M1083 157h28m-14-14v28" stroke="${ink}" stroke-width="2"/>
</svg>`;

async function write(relative, options) {
  const output = path.join(root, "public", relative);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharp(Buffer.from(svg(options))).png({ compressionLevel: 9 }).toFile(output);
  console.log(relative);
}
await write("og.png", { home: true, label: "The church operating system", subtitle: "One thoughtful workspace for your people, your team and every branch." });
await write("og/help.png", { title: "A clear next step. For every team.", label: "Guides for your ministry", subtitle: "Practical answers for the people who keep your church moving." });
for (const article of helpArticles) {
  if (!/^[a-z0-9-]+$/.test(article.slug)) throw new Error("Invalid guide slug");
  await write(`og/help/${article.slug}.png`, {
    title: article.title,
    label: helpTopics.find(topic => topic.id === article.topic).title,
    subtitle: "Practical answers for your team. More room for ministry.",
  });
}

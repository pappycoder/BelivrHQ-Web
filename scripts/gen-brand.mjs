/** Deterministic BelivrHQ wordmarks using the unchanged emblem and existing palette. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root = fileURLToPath(new URL('../', import.meta.url));
const brand = path.join(root, 'public/brand');
const master = await fs.readFile(path.join(brand, 'churchos-logo.png'));
const emblem = await fs.readFile(path.join(brand, 'churchos-emblem.png'));
await fs.writeFile(path.join(brand, 'belivrhq-logo.png'), master);
await fs.writeFile(path.join(brand, 'belivrhq-emblem.png'), emblem);
for (const suffix of ['favicon', 'favicon-white']) await fs.copyFile(path.join(brand, `churchos-${suffix}.png`), path.join(brand, `belivrhq-${suffix}.png`));
const embedded = emblem.toString('base64');
for (const [tone, ink, background] of [['navy', '#06062b', 'none'], ['light', '#fcfcf9', 'none']]) {
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="932" height="512" viewBox="0 0 932 512"><defs><filter id="light"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter></defs><rect width="932" height="512" fill="${background}"/><image href="data:image/png;base64,${embedded}" x="95" y="112" width="280" height="280" ${tone==='light'?'filter="url(#light)"':''}/><text x="350" y="303" font-family="DejaVu Sans,Arial,sans-serif" font-size="100" font-weight="700" letter-spacing="-6" fill="${ink}">BelivrHQ</text></svg>`;
 await fs.writeFile(path.join(brand, `belivrhq-lockup-${tone}.svg`), svg);
 await sharp(Buffer.from(svg)).png().toFile(path.join(brand, `belivrhq-lockup-${tone}.png`));
}
for (const [name,tone,bg] of [['light','navy','#ffffff'],['dark','light','#06062b']]) {
 await sharp(path.join(brand, `belivrhq-lockup-${tone}.png`)).flatten({background:bg}).png().toFile(path.join(brand, `belivrhq-logoname-${name}.png`));
}
const backend=path.resolve(root,'../BelivrHQ-Backend/src/assets/pdf');
await fs.copyFile(path.join(brand,'belivrhq-lockup-light.png'),path.join(backend,'belivrhq-lockup-light.png'));
for (const suffix of ['logo','emblem','favicon','favicon-white','lockup-light','lockup-navy','logoname-light','logoname-dark']) {
 await fs.copyFile(path.join(brand,`belivrhq-${suffix}.png`),path.join(brand,`churchos-${suffix}.png`));
}
await fs.copyFile(path.join(brand,'belivrhq-lockup-light.png'),path.join(backend,'churchos-lockup-light.png'));
await fs.copyFile(path.join(brand,'belivrhq-lockup-navy.svg'),path.join(root,'public/auth/logo.svg'));
console.log('BelivrHQ brand assets generated; original emblem geometry and palette retained.');

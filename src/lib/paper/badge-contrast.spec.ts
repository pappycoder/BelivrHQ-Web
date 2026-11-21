import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("../../app/paper-tokens.css", import.meta.url), "utf8");
function rgb(hex: string) { return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255); }
function luminance(color: number[]) {
  return color.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
for (const theme of ["light", "dark"]) {
  it.each(["brand", "moss", "gold", "sky", "rose"])(`keeps normal-sized %s badge text readable in ${theme} mode`, tone => {
    const selector = theme === "light" ? ":root" : "\\.dark";
    const block = css.match(new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]+)\\}`))?.[1];
    expect(block).toBeTruthy();
    const foreground = block!.match(new RegExp(`--${tone}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
    const background = block!.match(new RegExp(`--${tone}-soft:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
    expect(foreground).toBeTruthy(); expect(background).toBeTruthy();
    // Use the real CSS foreground mix so the test follows future palette changes.
    const rules = [...css.matchAll(new RegExp(`([^\\n{}]*\\[data-tone="${tone}"\\])\\s*\\{([^}]+)\\}`, "g"))];
    const override = rules.filter(rule => theme === "dark" || !rule[1].includes(".dark")).at(-1)?.[2];
    const factor = override?.match(/color-mix\(in srgb, var\(--[a-z]+\) ([\d.]+)%, #000\)/)?.[1];
    const ink = rgb(foreground!).map(value => value * (factor ? Number(factor) / 100 : 1));
    const [low, high] = [luminance(ink), luminance(rgb(background!))].sort((a, b) => a - b);
    expect((high + 0.05) / (low + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
}

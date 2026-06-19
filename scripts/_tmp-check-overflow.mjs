import { readFileSync } from "fs";

const ts = readFileSync("src/design-system/assets/generated/button.ts", "utf8");
const m = ts.match(/button_12[\s\S]*?paths: \[([\s\S]*?)\],\n\s*\],/);
const pathsBlock = m[1];
const paths = [...pathsBlock.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);

const ARG_COUNTS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const d of paths) {
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const tokenRe = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let tok;
  while ((tok = tokenRe.exec(d))) {
    const cmd = tok[1], upper = cmd.toUpperCase(), rel = cmd !== upper;
    const argCount = ARG_COUNTS[upper];
    const nums = (tok[2].match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    if (upper === "Z") { cx = sx; cy = sy; continue; }
    if (argCount === 0) continue;
    for (let i = 0; i + argCount <= nums.length; i += argCount) {
      const g = nums.slice(i, i + argCount);
      if (upper === "H") { cx = rel ? cx + g[0] : g[0]; }
      else if (upper === "V") { cy = rel ? cy + g[0] : g[0]; }
      else {
        const ex = g[g.length - 2], ey = g[g.length - 1];
        for (let p = 0; p + 1 < g.length; p += 2) {
          const px = rel ? cx + g[p] : g[p], py = rel ? cy + g[p + 1] : g[p + 1];
          minX = Math.min(minX, px); minY = Math.min(minY, py);
          maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
        }
        cx = rel ? cx + ex : ex; cy = rel ? cy + ey : ey;
        if (upper === "M" && i === 0) { sx = cx; sy = cy; }
      }
      minX = Math.min(minX, cx); minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx); maxY = Math.max(maxY, cy);
    }
  }
}
console.log("bbox", { minX, minY, maxX, maxY });
console.log("declared viewBox 0 0 762 252");

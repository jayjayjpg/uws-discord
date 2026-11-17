import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Dynamically imports every module in `dir` (one level, no recursion) and
 * returns its default export. Works the same whether we're running the raw
 * .ts sources via tsx in dev, or compiled .js in dist for production.
 */
export async function loadModules<T>(dir: string): Promise<T[]> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir)
    .filter((f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts"))
    .sort();

  const modules: T[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const mod = (await import(pathToFileURL(full).href)) as { default?: T };
    if (!mod.default) {
      throw new Error(`${full} has no default export — every command/event file must \`export default\`.`);
    }
    modules.push(mod.default);
  }
  return modules;
}

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Static import and export statements, side-effect imports and dynamic import() calls. A statement must start a line
// or follow a semicolon, so string data such as a generated field named "from" or "import" is never a specifier.
const specifierPattern = /(?:(?:^|;)[ \t]*(?:(?:import|export)\b[^"'`;]*?\bfrom|import)|\bimport\s*\()\s*["']([^"']+)["']/gm;

// Maps each bare specifier imported or re-exported by a package's built JavaScript to the files using it.
export async function builtImportSpecifiers(distUrl) {
  const dist = fileURLToPath(distUrl);
  const specifiers = new Map();
  for (const entry of await readdir(dist, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const path = join(entry.parentPath, entry.name);
    for (const [, specifier] of (await readFile(path, "utf8")).matchAll(specifierPattern)) {
      if (specifier.startsWith(".")) continue;
      specifiers.set(specifier, [...(specifiers.get(specifier) ?? []), relative(dist, path)]);
    }
  }
  return specifiers;
}

export const sortedKeys = namespace => Object.keys(namespace).sort();

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const specifierPattern = /\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

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

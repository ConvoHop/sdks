/**
 * Deterministic JSON formatter used for every JSON artifact sdkgen writes.
 * Values that fit within `width` columns stay on one line; larger values
 * expand with two-space indentation. Key order is preserved, so callers are
 * responsible for constructing objects in a deterministic order.
 */
export function formatJson(value, { width = 100 } = {}) {
  return format(value, "", 0, width) + "\n";
}

function compact(value) {
  if (Array.isArray(value)) return "[" + value.map(compact).join(", ") + "]";
  if (isPlainObject(value)) {
    return "{" + Object.entries(value).map(([key, item]) => JSON.stringify(key) + ": " + compact(item)).join(", ") + "}";
  }
  const text = JSON.stringify(value);
  if (text === undefined) throw new TypeError(`Cannot serialize ${typeof value} as JSON`);
  return text;
}

function format(value, indent, prefixLength, width) {
  const single = compact(value);
  if (indent.length + prefixLength + single.length <= width) return single;
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return "[\n" + value.map(item => inner + format(item, inner, 0, width)).join(",\n") + "\n" + indent + "]";
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return "{\n" + entries.map(([key, item]) => {
      const label = JSON.stringify(key) + ": ";
      return inner + label + format(item, inner, label.length, width);
    }).join(",\n") + "\n" + indent + "}";
  }
  return single;
}

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `object[key]` for own properties only, so a name such as "constructor" never resolves to an Object.prototype member. */
export function own(object, key) {
  return isPlainObject(object) && Object.hasOwn(object, key) ? object[key] : undefined;
}

/** Canonical JSON with sorted keys, used for structural equality checks. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (isPlainObject(value)) {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

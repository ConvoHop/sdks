import { parseId, parseString, type PageOptions } from "@convohop/core";

export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new TypeError("Missing current authority result");
  return value;
}

/** Acts as a member principal. Reads are scoped to that member's visibility, sends are authored by it; audited. */
export interface ActAsOptions { actAs?: string }

export function pageLimit(limit: number | undefined, fallback = 100): number {
  const value = limit ?? fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new RangeError("Page size must be 1..100");
  return value;
}
/** Cursor and limit for reads whose authority default applies when `limit` is omitted. */
export function pageInput(options: PageOptions): { cursor?: string; limit?: number } {
  return { ...(options.cursor === undefined ? {} : { cursor: parseString(options.cursor) }),
    ...(options.limit === undefined ? {} : { limit: pageLimit(options.limit) }) };
}
export function actAsInput(options: ActAsOptions): { actAsPrincipalId?: string } {
  return options.actAs === undefined ? {} : { actAsPrincipalId: parseId(options.actAs) };
}
export function mismatch(what: string): TypeError {
  return new TypeError(`${what} does not match the request`);
}

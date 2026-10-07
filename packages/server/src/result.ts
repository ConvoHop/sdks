export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new TypeError("Missing current authority result");
  return value;
}

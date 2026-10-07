// Strict decoding of driver-protocol parameters. Failures are protocol errors (INVALID_PARAMS), never SDK results.
export class ParamsError extends Error {}

export type Args = Readonly<Record<string, unknown>>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function record(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ParamsError(`${name} must be an object`);
  return value;
}

export function text(args: Args, name: string): string {
  const value = args[name];
  if (typeof value !== "string") throw new ParamsError(`${name} must be a string`);
  return value;
}

export function optionalText(args: Args, name: string): string | undefined {
  return args[name] === undefined ? undefined : text(args, name);
}

export function integer(args: Args, name: string, min: number, max: number): number | undefined {
  const value = args[name];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    throw new ParamsError(`${name} must be an integer in ${min}..${max}`);
  return value;
}

export function counter(args: Args, name: string): bigint | undefined {
  const value = optionalText(args, name);
  if (value === undefined) return undefined;
  if (!/^(0|[1-9][0-9]{0,18})$/.test(value)) throw new ParamsError(`${name} must be a canonical counter string`);
  return BigInt(value);
}

export function strings(args: Args, name: string): string[] {
  const value = args[name];
  if (!Array.isArray(value) || !value.every(item => typeof item === "string")) throw new ParamsError(`${name} must be an array of strings`);
  return value;
}

export function entries(args: Args, name: string): Record<string, unknown>[] {
  const value = args[name];
  if (!Array.isArray(value)) throw new ParamsError(`${name} must be an array`);
  return value.map((entry, index) => record(entry, `${name}[${index}]`));
}

export function handle(args: Args, name: string): string {
  const value = text(args, name);
  if (!/^[A-Za-z0-9._:-]{1,64}$/.test(value)) throw new ParamsError(`${name} must match [A-Za-z0-9._:-]{1,64}`);
  return value;
}

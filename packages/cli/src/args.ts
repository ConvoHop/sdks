import { UsageError } from "./output.js";

/** A string option takes one value, a list option takes one value each time it is given and a boolean takes none. */
export type OptionKind = "string" | "boolean" | "list";

export interface OptionSpec {
  readonly kind: OptionKind;
  /** The value's placeholder in help, such as ID. */
  readonly value?: string;
  readonly description: string;
}

export type OptionSpecs = Readonly<Record<string, OptionSpec>>;

/** Options every command accepts. They can also come before the command. */
export const globalOptions: OptionSpecs = {
  profile: { kind: "string", value: "NAME", description: "Profile to use. Default: CONVOHOP_PROFILE, or default." },
  "management-url": { kind: "string", value: "URL",
    description: "Management authority origin. Default: CONVOHOP_MANAGEMENT_URL, or the profile's." },
  "communication-url": { kind: "string", value: "URL",
    description: "Communication authority origin. Default: CONVOHOP_COMMUNICATION_URL, or the profile's." },
  help: { kind: "boolean", description: "Show help." },
};

/** Names safe to repeat in an error message. Anything else may be a mistyped secret, so errors never echo it. */
export const echoable = /^[a-z][a-z0-9-]{0,39}$/;

/** Parsed options and positional arguments. */
export class Args {
  constructor(
    readonly command: string,
    private readonly values: ReadonlyMap<string, string | true | readonly string[]>,
    readonly positionals: readonly string[],
  ) {}

  has(name: string): boolean {
    return this.values.has(name);
  }
  string(name: string): string | undefined {
    const value = this.values.get(name);
    return typeof value === "string" ? value : undefined;
  }
  required(name: string): string {
    const value = this.string(name);
    if (value === undefined) throw new UsageError(`--${name} is required`, this.command);
    return value;
  }
  flag(name: string): boolean {
    return this.values.get(name) === true;
  }
  list(name: string): readonly string[] {
    const value = this.values.get(name);
    return typeof value === "object" ? value : [];
  }
}

/**
 * Parses argv against options and the global options. Accepts `--name value`, `--name=value` and `--` before
 * positional arguments. A value can't start with `--`; a lone `-` is a value. Errors name the option, never its value.
 */
export function parseArgs(argv: readonly string[], options: OptionSpecs, command: string, maxPositionals = 0): Args {
  const specs: OptionSpecs = { ...globalOptions, ...options };
  const values = new Map<string, string | true | string[]>();
  const positionals: string[] = [];
  const queue = [...argv];
  for (let arg = queue.shift(); arg !== undefined; arg = queue.shift()) {
    if (arg === "--") {
      positionals.push(...queue.splice(0));
      break;
    }
    if (arg === "-h") arg = "--help";
    if (arg.startsWith("--")) {
      const equals = arg.indexOf("=");
      const name = equals === -1 ? arg.slice(2) : arg.slice(2, equals);
      const spec = Object.hasOwn(specs, name) ? specs[name] : undefined;
      if (!spec) throw new UsageError(echoable.test(name) ? `Unknown option --${name}` : "Unknown option", command);
      if (spec.kind === "boolean") {
        if (equals !== -1) throw new UsageError(`--${name} takes no value`, command);
        values.set(name, true);
        continue;
      }
      const next = queue[0];
      const value = equals !== -1 ? arg.slice(equals + 1)
        : next !== undefined && !next.startsWith("--") ? queue.shift() : undefined;
      if (!value) throw new UsageError(`--${name} needs a value`, command);
      const current = values.get(name);
      if (spec.kind === "list") {
        if (typeof current === "object") current.push(value);
        else values.set(name, [value]);
      } else {
        if (current !== undefined) throw new UsageError(`--${name} is given more than once`, command);
        values.set(name, value);
      }
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") throw new UsageError("Unknown option", command);
    positionals.push(arg);
  }
  if (positionals.length > maxPositionals)
    throw new UsageError(maxPositionals === 0 ? "This command takes no arguments" : "Too many arguments", command);
  return new Args(command, values, positionals);
}

/**
 * Splits leading global options, such as `--profile staging`, from argv, so they can come before the command words.
 * Returns them and the rest of argv; parseArgs parses them with the command's options.
 */
export function leadingOptions(argv: readonly string[]): { options: string[]; rest: string[] } {
  const options: string[] = [];
  let index = 0;
  while (index < argv.length) {
    const arg = argv[index];
    if (arg === undefined || !arg.startsWith("-") || arg === "-" || arg === "--") break;
    options.push(arg);
    index += 1;
    const name = arg.startsWith("--") && !arg.includes("=") ? arg.slice(2) : undefined;
    const spec = name !== undefined && Object.hasOwn(globalOptions, name) ? globalOptions[name] : undefined;
    const value = argv[index];
    if (spec && spec.kind !== "boolean" && value !== undefined && !value.startsWith("--")) {
      options.push(value);
      index += 1;
    }
  }
  return { options, rest: argv.slice(index) };
}

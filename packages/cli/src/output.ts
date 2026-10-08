import { ConvoHopProblem, ScopeRequiredProblem } from "@convohop/server";

/** The value that replaces a credential, secret or signed proof in output. */
export const REDACTED = "[REDACTED]";

/** Fields that carry a bearer credential, a secret or a signed proof. Their non-null values print as REDACTED. */
export const redactedFields: readonly string[] = Object.freeze([
  "admissionTicket", "backendKey", "connectToken", "credentialDeliveryPermit", "forwardingLease", "secret", "sessionToken",
  "signedProof", "transportToken",
]);
const fields = new Set(redactedFields);

function scrub(text: string, secrets: readonly string[]): string {
  return secrets.reduce((value, secret) => (secret ? value.split(secret).join(REDACTED) : value), text);
}

/** A copy of value with redactedFields and every occurrence of the given secret strings replaced by REDACTED. */
export function redact(value: unknown, secrets: readonly string[] = []): unknown {
  if (typeof value === "string") return scrub(value, secrets);
  if (Array.isArray(value)) return value.map(item => redact(item, secrets));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, fields.has(key) && item !== null && item !== undefined ? REDACTED : redact(item, secrets)]));
  return value;
}

/** A text stream, such as process.stdout. */
export interface TextOutput {
  write(text: string): unknown;
  readonly isTTY?: boolean;
}

/** What the CLI knows about a failed request. */
export interface ErrorDetails {
  readonly code?: string;
  /** committed, accepted, rejected or unknown. */
  readonly outcome?: string;
  readonly requestId?: string;
  readonly status?: number;
  readonly retryAfter?: number;
  readonly scope?: string;
  readonly next?: string;
}

/** A failure the CLI reports on stderr before exiting with exitCode. */
export class CliError extends Error {
  constructor(message: string, readonly exitCode = 1, readonly details: ErrorDetails = {}) {
    super(message);
    this.name = "CliError";
  }
}

/** Wrong or missing arguments or settings. Exits with code 2. */
export class UsageError extends CliError {
  constructor(message: string, readonly command: string | undefined = undefined) {
    super(message, 2);
    this.name = "UsageError";
  }
}

/** The details of a ConvoHop problem, without its message. */
export function problemDetails(problem: ConvoHopProblem, next?: string): ErrorDetails {
  return {
    code: problem.code, outcome: problem.outcome, requestId: problem.requestId, status: problem.status,
    ...(problem.retryAfter === undefined ? {} : { retryAfter: problem.retryAfter }),
    ...(problem instanceof ScopeRequiredProblem && problem.scope !== undefined ? { scope: problem.scope } : {}),
    ...(next === undefined ? {} : { next }),
  };
}

/**
 * Writes data to stdout as JSON and diagnostics to stderr. Everything it writes is redacted: credential fields and every
 * secret the command has seen read REDACTED.
 */
export class Printer {
  readonly #secrets: string[] = [];
  constructor(private readonly stdout: TextOutput, private readonly stderr: TextOutput) {}

  /** Redacts value from all later output. */
  secret(value: string | undefined): void {
    if (value) this.#secrets.push(value);
  }
  /** Pretty JSON on stdout. */
  data(value: unknown): void {
    this.stdout.write(`${JSON.stringify(redact(value, this.#secrets), null, 2)}\n`);
  }
  /** One line of compact JSON on stdout. */
  line(value: unknown): void {
    this.stdout.write(`${JSON.stringify(redact(value, this.#secrets))}\n`);
  }
  /** Plain text on stdout. */
  text(text: string): void {
    this.stdout.write(scrub(text, this.#secrets));
  }
  /** A line on stderr. */
  note(text: string): void {
    this.stderr.write(`${scrub(text, this.#secrets)}\n`);
  }
  /** Reports error on stderr and returns the exit code for it. */
  error(error: unknown): number {
    if (error instanceof UsageError) {
      this.note(`convohop: ${error.message}`);
      this.note(`Run convohop ${error.command ?? ""}${error.command ? " " : ""}--help for usage.`);
      return error.exitCode;
    }
    const { message, details, exitCode } = error instanceof CliError ? error
      : error instanceof ConvoHopProblem ? { message: error.message, details: problemDetails(error), exitCode: 1 }
      : { message: error instanceof Error ? error.message : "The command failed", details: {}, exitCode: 1 };
    this.note(`convohop: ${details.code ? `${details.code}: ` : ""}${message}`);
    if (details.outcome) this.note(`  outcome: ${details.outcome}`);
    if (details.requestId) this.note(`  requestId: ${details.requestId}`);
    if (details.retryAfter !== undefined) this.note(`  retryAfter: ${details.retryAfter}s`);
    if (details.scope) this.note(`  scope: ${details.scope}`);
    if (details.next) this.note(`  next: ${details.next}`);
    return exitCode;
  }
}

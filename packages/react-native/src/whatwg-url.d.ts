declare module "whatwg-url-without-unicode" {
  /** The WHATWG URL Standard's `URL`, without IDNA processing of non-ASCII hosts. */
  export class URL {
    constructor(url: string, base?: string);
    href: string;
    get origin(): string;
    protocol: string;
    username: string;
    password: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    toString(): string;
    toJSON(): string;
  }
}

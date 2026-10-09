import type { PlatformURLConstructor } from "@convohop/client";
import { URL as WhatwgURL } from "whatwg-url-without-unicode";

const special = new Set(["http:", "https:", "ws:", "wss:", "ftp:", "file:"]);
const IPV4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;

// The standard's "ends in a number" check: such a domain must be an IPv4 address.
function endsInNumber(domain: string): boolean {
  const parts = domain.split(".");
  if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  const last = parts[parts.length - 1]!;
  return /^[0-9]+$/.test(last) || /^0x[0-9a-f]*$/i.test(last);
}

// whatwg-url-without-unicode, which LiveKit's React Native globals also install, skips IDNA processing: it keeps a
// special URL's host in its original case, and passes non-ASCII hosts through unconverted. Lowercasing ASCII hosts
// gives the standard's result. Without IDNA, a non-ASCII host could name a different host than the standard parses
// (full-width digits are an IPv4 address there), so it is rejected. It also predates two rules of the current
// standard, which this applies: a domain that ends in a number must be an IPv4 address, and domains can't contain
// controls, DEL or `<>^|`.
class ConvoHopURL extends WhatwgURL {
  constructor(url: string, base?: string) {
    super(url, base);
    if (!special.has(this.protocol)) return;
    const hostname = this.hostname;
    if (hostname.startsWith("[")) return;
    if (/[^\x21-\x7e]|[<>^|]/.test(hostname)) throw new TypeError("Invalid URL");
    const lower = hostname.toLowerCase();
    if (endsInNumber(lower) && !IPV4.test(lower)) throw new TypeError("Invalid URL");
    if (lower !== hostname) this.hostname = lower;
  }

  // A blob URL's origin is that of the http(s) URL it wraps, which the polyfill parses without the rules above.
  override get origin(): string {
    if (this.protocol !== "blob:") return super.origin;
    let inner: ConvoHopURL;
    try { inner = new ConvoHopURL(this.pathname); } catch { return "null"; }
    return inner.protocol === "http:" || inner.protocol === "https:" ? inner.origin : "null";
  }
}

/** A WHATWG URL constructor for Hermes, which has no complete `URL`. Hosts must be ASCII (Punycode for IDNs). */
export const URL: PlatformURLConstructor = ConvoHopURL;

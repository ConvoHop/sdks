import test from "node:test";
import assert from "node:assert/strict";
import { parseURL } from "@convohop/core/internal";
import { URL as Polyfill } from "whatwg-url-without-unicode";
import { URL as PlatformURL } from "../dist/url.js";

const parts = ["href", "origin", "protocol", "username", "password", "host", "hostname", "port", "pathname", "search", "hash"];
function parse(Url, input, base) {
  try {
    const url = new Url(input, base);
    return Object.fromEntries(parts.map(part => [part, url[part]]));
  } catch (error) {
    return { throws: error.name };
  }
}

test("core refuses the bare polyfill LiveKit installs, and accepts the platform URL", () => {
  assert.throws(() => parseURL("https://example.com/", { URL: Polyfill }),
    { name: "TypeError", message: "This runtime's URL is not WHATWG-conformant; pass a conforming platform.URL" });
  assert.equal(parseURL("https://Example.COM:443/a/../b", { URL: PlatformURL }).href, "https://example.com/b");
  assert.throws(() => parseURL("https://exa mple.com/", { URL: PlatformURL }), { name: "TypeError", message: "Invalid URL" });
  // Core's conformance probe needs out-of-range ports refused.
  assert.throws(() => parseURL("https://example.com:65536/", { URL: PlatformURL }), { name: "TypeError", message: "Invalid URL" });
});

test("ASCII URLs parse as the URL Standard says, matching Node's URL", () => {
  const corpus = [
    "https://Example.COM/", "HTTPS://EXAMPLE.COM:443/a/../b/./c?Q=1#F", "https://user:p%40ss@Example.com:8443/", "https:Example.com",
    "http://127.0.0.1:80/", "http://127.1/", "http://0x7F.1/", "http://0177.0.0.1/", "http://4294967295/", "http://4294967296/",
    "http://1.2.3.4./", "http://1.2.3.256/", "http://1.2.3.4.5/", "http://example.0x/", "http://example.0xg/", "http://example.1/",
    "http://example.09/", "http://1.example/", "http://a..b/", "http://%41.com/", "http://ex%41mple.com/", "http://ex%00ample.com/",
    "http://exa mple.com/", "http://exa<mple.com/", "http://exa%3Cmple.com/", "http://exa>mple.com/", "http://exa^mple.com/",
    "http://exa|mple.com/", "http://exa%7cmple.com/", "http://exa%7Fmple.com/", "http://exa%09mple.com/", "http://exa\tmple.com/",
    "http://exa%25mple.com/", "http://xn--bcher-kva.example/", "http://[::1]:80/", "HTTP://[0:0:0:0:0:0:0:1]/",
    "http://[::FFFF:127.0.0.1]/", "http://[::1/", "http://[example]/", "http://example.com:65535/", "http://example.com:65536/",
    "ws://Example.com:80/socket", "wss://Example.com:443/socket?token=x", "ftp://Example.com:21/", "file://LOCALHOST/x",
    "file:///C:/x/../y", "convohop://Host.Example/Path?Q#F", "convohop://exa%3Cmple/", "mailto:Someone@Example.com",
    "blob:https://Example.com:443/x", "blob:http://[::1]:80/", "blob:ftp://Example.com/x", "blob:null/x",
    "http://example.com/%7Efoo?%41#%42", "https://example.com/a b?c d#e f", "https://", "//example.com/", "example.com", "",
  ];
  for (const input of corpus)
    assert.deepEqual(parse(PlatformURL, input), parse(URL, input), JSON.stringify(input));
  for (const [input, base] of [["rtc-edge?x", "wss://media.example.test/base/"], ["../x", "https://Example.COM/a/b"],
    ["//Other.Example/", "https://example.com/"], ["?q", "http://[::1]/p"], ["https://Example.com/", "not a URL"]])
    assert.deepEqual(parse(PlatformURL, input, base), parse(URL, input, base), JSON.stringify([input, base]));
});

test("non-ASCII hosts throw, because the URL can't convert them without IDNA", () => {
  for (const input of ["https://bücher.example/", "http://b%C3%BCcher.example/", "http://１２７.0.0.1/", "http://ex\u00ADample.com/",
    "https://İ.example/", "https://example.com\u3002/", "https://ＥＸＡＭＰＬＥ.com/"]) {
    assert.ok(URL.canParse(input), JSON.stringify(input) + " is valid to the standard");
    assert.throws(() => new PlatformURL(input), { name: "TypeError", message: "Invalid URL" }, JSON.stringify(input));
    assert.throws(() => parseURL(input, { URL: PlatformURL }), { name: "TypeError", message: "Invalid URL" });
  }
  assert.equal(new PlatformURL("http://xn--bcher-kva.example/").hostname, "xn--bcher-kva.example", "Punycode works");
  // Without IDNA, an xn-- label isn't validated as Punycode. It's kept as the same ASCII DNS name, so it can't name
  // another host.
  assert.ok(!URL.canParse("https://xn--A.com/"));
  assert.equal(new PlatformURL("https://xn--A.com/").hostname, "xn--a.com");
});

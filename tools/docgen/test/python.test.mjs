import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { REPO_ROOT, tempRoot, write } from "./helpers.mjs";

const EXTRACTOR = join(REPO_ROOT, "tools/docgen/extractors/python.py");

/** The extractor needs Python 3.11 or later as python3; these tests skip without it. */
const version = spawnSync("python3", ["-c", "import sys; print(sys.version_info >= (3, 11))"], { encoding: "utf8" });
const skip = version.status === 0 && version.stdout.trim() === "True" ? false : "needs python3 3.11 or later on the PATH";

/** Runs the extractor in `root` with -I -S, so it can import nothing outside the standard library. */
const extract = (root, ...args) => spawnSync("python3", ["-I", "-S", EXTRACTOR, ...args], { cwd: root, encoding: "utf8" });

const PACKAGE = `"""Fixture package."""

from __future__ import annotations

import enum
from dataclasses import dataclass
from typing import Protocol, TypeAlias, TypedDict, overload

from typing_extensions import deprecated

from . import hooks
from ._base import _Mixin
from ._generated.types import Shape

__all__ = [
    "DEFAULT_TIMEOUT",
    "Client",
    "Color",
    "FxError",
    "Options",
    "Point",
    "Sender",
    "Shape",
    "Text",
    "Timeout",
    "hooks",
    "send",
]

DEFAULT_TIMEOUT = 30.0
"""Seconds before a request times out."""

Text: TypeAlias = "str | bytes"
"""Text or its UTF-8 bytes."""


class Color(enum.Enum):
    """A color."""

    RED = 1
    """Warm."""
    BLUE = 2


class Options(TypedDict, total=False):
    """Client options."""

    timeout: float
    """Seconds."""


class Sender(Protocol):
    """Sends text."""

    def __call__(self, text: str) -> None: ...

    def flush(self) -> None:
        """Flushes buffered text."""


@dataclass(frozen=True)
class Point:
    """A point.

    Attributes:
        x: Across.
        y: Down.
    """

    x: int
    y: int = 0


class FxError(Exception):
    """A failed request.

    Attributes:
        code: A stable error code.
    """

    code: str

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class Timeout(FxError):
    """The request timed out."""


class Client(_Mixin):
    """Calls the API, such as \`\`Client("key").ping()\`\`.

    Args:
        key: The backend key.
    """

    def __init__(self, key: str) -> None:
        self._key = key

    def __repr__(self) -> str:
        return "Client()"

    @overload
    def send(self, text: str) -> None: ...
    @overload
    def send(self, text: list[str]) -> None: ...
    def send(self, text: str | list[str]) -> None:
        """Sends text. See :meth:\`ping\`.

        Raises:
            ValueError: When \`\`text\`\` is empty.
        """

    async def aclose(self) -> None:
        """Closes the client."""

    @staticmethod
    def create(key: str) -> Client:
        """Creates a client."""
        return Client(key)

    @property
    def key_id(self) -> str:
        """The key's ID."""
        return ""


@deprecated("Use Client.send.")
def send(client: Client, text: str, *, retries: int = 3) -> bool:
    """Sends text with a new request.

    Args:
        client: The client.
        text: The text.
        retries: Attempts after the first.

    Returns:
        Whether the server accepted it.
    """
    return True
`;

const BASE = `class _Mixin:
    def ping(self) -> None:
        """Checks the connection."""

    def _hidden(self) -> None: ...
`;

const HOOKS = `"""Hook helpers."""

__all__ = ["verify"]


def verify(body: bytes, secret: str, tolerance: int = 300) -> dict[str, object]:
    """Verifies a delivery. See \`the guide <https://example.com/guide>\`_.

    Args:
        body: The raw body.
        secret: The signing secret.
        tolerance: Seconds of clock skew allowed.
    """
    return {}
`;

const GENERATED = `from dataclasses import dataclass


@dataclass(frozen=True)
class Shape:
    """A generated shape."""

    sides: int
`;

/** Package fx, documented with its submodule fx.hooks, under src/fx. */
function writePackage(t) {
  const root = tempRoot(t);
  write(root, "language.json", {
    id: "python",
    packages: [
      { name: "fx", source: "src/fx" },
      { name: "fx.hooks", source: "src/fx" },
    ],
  });
  write(root, "src/fx/__init__.py", PACKAGE);
  write(root, "src/fx/_base.py", BASE);
  write(root, "src/fx/hooks.py", HOOKS);
  write(root, "src/fx/_generated/__init__.py", "");
  write(root, "src/fx/_generated/types.py", GENERATED);
  return root;
}

test("the Python extractor documents each package's __all__ from source, without importing it", { skip }, t => {
  const root = writePackage(t);
  const result = extract(root, "language.json");
  assert.equal(result.stderr, "");
  assert.equal(result.status, 0);
  const code = { name: "code", kind: "property", signatures: ["code: str"], docs: "A stable error code." };
  const errorInit = { name: "__init__", kind: "constructor", signatures: ["def __init__(self, code: str) -> None"], docs: "" };
  assert.deepEqual(JSON.parse(result.stdout), {
    language: "python",
    packages: [
      {
        name: "fx",
        symbols: [
          {
            name: "Client",
            kind: "class",
            signatures: ["class Client"],
            docs: 'Calls the API, such as `Client("key").ping()`.',
            members: [
              { name: "__init__", kind: "constructor", signatures: ["def __init__(self, key: str) -> None"], docs: "Parameters:\n\n- `key`: The backend key." },
              {
                name: "send",
                kind: "method",
                signatures: ["def send(self, text: str) -> None", "def send(self, text: list[str]) -> None"],
                docs: "Sends text. See `ping()`.\n\nRaises:\n\n- `ValueError`: When `text` is empty.",
              },
              { name: "aclose", kind: "method", signatures: ["async def aclose(self) -> None"], docs: "Closes the client." },
              { name: "create", kind: "method", signatures: ["@staticmethod\ndef create(key: str) -> Client"], docs: "Creates a client.", static: true },
              { name: "key_id", kind: "property", signatures: ["@property\ndef key_id(self) -> str"], docs: "The key's ID." },
              { name: "ping", kind: "method", signatures: ["def ping(self) -> None"], docs: "Checks the connection." },
            ],
          },
          {
            name: "Color",
            kind: "enum",
            signatures: ["class Color(enum.Enum)"],
            docs: "A color.",
            members: [
              { name: "RED", kind: "case", signatures: ["RED = 1"], docs: "Warm." },
              { name: "BLUE", kind: "case", signatures: ["BLUE = 2"], docs: "" },
            ],
          },
          { name: "DEFAULT_TIMEOUT", kind: "constant", signatures: ["DEFAULT_TIMEOUT: float"], docs: "Seconds before a request times out." },
          { name: "FxError", kind: "class", signatures: ["class FxError(Exception)"], docs: "A failed request.", members: [code, errorInit] },
          {
            name: "Options",
            kind: "interface",
            signatures: ["class Options(TypedDict, total=False)"],
            docs: "Client options.",
            members: [{ name: '["timeout"]', kind: "property", signatures: ["timeout: float"], docs: "Seconds." }],
          },
          {
            name: "Point",
            kind: "class",
            signatures: ["@dataclass(frozen=True)\nclass Point"],
            docs: "A point.",
            members: [
              { name: "x", kind: "property", signatures: ["x: int"], docs: "Across." },
              { name: "y", kind: "property", signatures: ["y: int = 0"], docs: "Down." },
              { name: "__init__", kind: "constructor", signatures: ["def __init__(self, x: int, y: int = 0) -> None"], docs: "" },
            ],
          },
          {
            name: "Sender",
            kind: "interface",
            signatures: ["class Sender(Protocol)"],
            docs: "Sends text.",
            members: [{ name: "flush", kind: "method", signatures: ["def flush(self) -> None"], docs: "Flushes buffered text." }],
          },
          { name: "Shape", kind: "class", signatures: ["@dataclass(frozen=True)\nclass Shape:\n    sides: int"], docs: "A generated shape." },
          { name: "Text", kind: "type", signatures: ['Text: TypeAlias = "str | bytes"'], docs: "Text or its UTF-8 bytes." },
          {
            name: "Timeout",
            kind: "class",
            signatures: ["class Timeout(FxError)"],
            docs: "The request timed out.",
            members: [
              { ...code, inherited: "FxError" },
              { ...errorInit, inherited: "FxError" },
            ],
          },
          { name: "hooks", kind: "namespace", signatures: ["from fx import hooks"], docs: "Hook helpers." },
          {
            name: "send",
            kind: "function",
            signatures: ["def send(client: Client, text: str, *, retries: int = 3) -> bool"],
            docs: [
              "Sends text with a new request.",
              "Parameters:\n\n- `client`: The client.\n- `text`: The text.\n- `retries`: Attempts after the first.",
              "Returns: Whether the server accepted it.",
            ].join("\n\n"),
            deprecated: "Use Client.send.",
          },
        ],
      },
      {
        name: "fx.hooks",
        symbols: [
          {
            name: "verify",
            kind: "function",
            signatures: ["def verify(body: bytes, secret: str, tolerance: int = 300) -> dict[str, object]"],
            docs: [
              "Verifies a delivery. See [the guide](https://example.com/guide).",
              "Parameters:\n\n- `body`: The raw body.\n- `secret`: The signing secret.\n- `tolerance`: Seconds of clock skew allowed.",
            ].join("\n\n"),
          },
        ],
      },
    ],
  });
});

test("the Python extractor fails with the file, line and declaration it can't document", { skip }, t => {
  const root = writePackage(t);
  const verify = (...body) => ['__all__ = ["verify"]', "", "", ...body].join("\n") + "\n";
  for (const [source, message] of [
    ['"""Hooks."""\n\n\ndef verify() -> None: ...\n', "src/fx/hooks.py:1: __all__: is missing; list the module's public names in a literal __all__"],
    ['__all__ = ["verify", "missing"]\n\n\ndef verify() -> None: ...\n', "src/fx/hooks.py:1: __all__: lists missing, which the module neither defines nor imports"],
    ['from typing import Any\n\n__all__ = ["Any"]\n', "src/fx/hooks.py:1: __all__: lists Any, which is typing.Any; document that elsewhere"],
    ['from ._base import _Mixin as Mixin\n\n__all__ = ["Mixin"]\n', "src/fx/hooks.py:1: __all__: lists Mixin, which renames _Mixin; export the original"],
    [
      verify("def verify() -> None:", '    """Verifies.', "", "    Examples:", "        verify()", '    """'),
      "src/fx/hooks.py:4: verify: docstring has an unsupported Examples: section; document it in prose, or put example code in a tested quickstart snippet",
    ],
    [
      verify("def verify() -> None:", '    """Verifies.', "", "    >>> verify()", '    """'),
      "src/fx/hooks.py:4: verify: docstring has a doctest example; put example code in a tested quickstart snippet",
    ],
    [
      verify("def verify() -> None:", '    """Verifies. See :ref:`guide`."""'),
      "src/fx/hooks.py:4: verify: docstring uses the unsupported role :ref:; use one of :attr:, :class:, :const:, :data:, :exc:, :func:, :meth:, :mod:, :obj:",
    ],
    [
      verify("def verify(body: bytes) -> None:", '    """Verifies.', "", "    Args:", "        payload: The body.", '    """'),
      "src/fx/hooks.py:4: verify: documents payload, which isn't a parameter",
    ],
    [verify("def _key() -> str: ...", "", "", "def verify(key: str = _key()) -> None: ..."), "src/fx/hooks.py:7: verify: refers to the private name _key; use a public name"],
    [
      'from dataclasses import dataclass, field\n\n__all__ = ["Batch"]\n\n\n@dataclass\nclass Batch:\n    """A batch."""\n\n    items: list[str] = field(default_factory=list)\n',
      "src/fx/hooks.py:10: Batch.items: uses dataclasses.field(), which the extractor doesn't support",
    ],
    [
      '__all__ = ["Limits"]\n\n\nclass Limits:\n    """Limits."""\n\n    size = 3\n',
      "src/fx/hooks.py:7: Limits.size: is a class attribute without a type annotation; annotate it",
    ],
  ]) {
    write(root, "src/fx/hooks.py", source);
    const result = extract(root, "language.json");
    assert.deepEqual([result.status, result.stdout, result.stderr], [1, "", `python extractor: ${message}\n`], source);
  }
});

test("the Python extractor checks the packages its language file lists", { skip }, t => {
  const root = writePackage(t);
  for (const [language, message] of [
    [{ id: "typescript", packages: [] }, "isn't the Python language config"],
    [{ id: "python", packages: [] }, "lists no packages"],
    [{ id: "python", packages: [{ name: "fx-sdk", source: "src/fx" }] }, "package name 'fx-sdk' isn't a dotted Python module name"],
    [{ id: "python", packages: [{ name: "fx", source: "src/other" }] }, "package fx's source src/other isn't the directory of package fx"],
    [{ id: "python", packages: [{ name: "fx.missing", source: "src/fx" }] }, "package fx.missing has no source under src/fx"],
  ]) {
    write(root, "language.json", language);
    const result = extract(root, "language.json");
    assert.deepEqual([result.status, result.stdout, result.stderr], [1, "", `python extractor: language.json: ${message}\n`]);
  }
});

test("the Python extractor command takes one language file", { skip }, t => {
  const result = extract(tempRoot(t));
  assert.deepEqual([result.status, result.stdout, result.stderr], [2, "", "usage: python3 tools/docgen/extractors/python.py <language.json>\n"]);
});

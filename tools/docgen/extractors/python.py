#!/usr/bin/env python3
"""Prints the public surface of documented Python packages as docs surface JSON.

Usage: python3 tools/docgen/extractors/python.py <language.json>

Run it from the repository root, where language.json's paths start. It reads each package's source with the ast
module and never imports it, so it needs only the standard library of Python 3.11 or later.

A package documents the names in its literal `__all__`. Protocols and TypedDicts are interfaces, Enum subclasses are
enums and other classes are classes. Functions are functions, `TypeAlias` annotations and `type` statements are types,
exported modules are namespaces and other assignments are constants, shown with their type but not their value.
Docstrings use Google-style sections (Args, Returns, Yields, Raises and, on classes, Attributes) and a subset of
reStructuredText inline markup, and become Markdown. Members of undocumented bases, such as private mixins, count as
the class's own; documented generated classes are shown as stubs. Anything the extractor can't document faithfully
fails with its file and line.
"""

from __future__ import annotations

import ast
import builtins
import inspect
import json
import os
import re
import sys
import textwrap
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass, field
from functools import partial
from pathlib import Path
from typing import Any, NoReturn

# `python3` can be an older interpreter, such as the one macOS ships, so check before any newer code runs.
if sys.version_info < (3, 11):  # noqa: UP036
    sys.exit("python extractor: needs Python 3.11 or later")

WRAP = 88
"""Longest one-line `def`; longer ones list one parameter per line."""

TYPE_ALIAS_STATEMENT: Any = getattr(ast, "TypeAlias", None)
"""The `type X = ...` statement node of Python 3.12 and later."""

ENUM_BASES = frozenset(f"enum.{name}" for name in ("Enum", "IntEnum", "StrEnum", "Flag", "IntFlag"))
DEPRECATED = frozenset({"warnings.deprecated", "typing_extensions.deprecated"})
OVERLOAD = frozenset({"typing.overload", "typing_extensions.overload"})
PROPERTIES = frozenset({"builtins.property", "functools.cached_property"})


def typing_name(path: str | None, name: str) -> bool:
    return path in (f"typing.{name}", f"typing_extensions.{name}")


class ExtractError(Exception):
    """A declaration the extractor can't document; the message says where and why."""


# Docstrings: Google-style sections and a small reStructuredText inline subset, converted to Markdown.

SECTIONS = {
    "Args": "Parameters",
    "Arguments": "Parameters",
    "Parameters": "Parameters",
    "Params": "Parameters",
    "Keyword Args": "Parameters",
    "Keyword Arguments": "Parameters",
    "Raises": "Raises",
    "Returns": "Returns",
    "Return": "Returns",
    "Yields": "Yields",
    "Yield": "Yields",
    "Attributes": "Attributes",
}
UNSUPPORTED_SECTIONS = frozenset(
    {
        "Attention",
        "Caution",
        "Danger",
        "Error",
        "Example",
        "Examples",
        "Hint",
        "Important",
        "Methods",
        "Note",
        "Notes",
        "Other Parameters",
        "Receives",
        "References",
        "See Also",
        "Tip",
        "Todo",
        "Usage",
        "Warning",
        "Warnings",
        "Warns",
    }
)
HEADER = re.compile(r"([A-Z][A-Za-z]*(?: [A-Z]?[a-z]+)?):\s*")
ENTRY = re.compile(r"(\*{0,2}[A-Za-z_][\w.]*):(?:\s+(.*))?")
LIST_ITEM = re.compile(r"(?:[-*+]|\d+[.)])\s")
INLINE = re.compile(
    r"``(?P<literal>.+?)``"
    r"|:(?:py:)?(?P<role>[a-z]+):`(?P<target>[^`]+)`"
    r"|`(?P<label>[^`<]+?)\s+<(?P<url>[^>`\s]+)>`__?"
)
ROLES = frozenset({"attr", "class", "const", "data", "exc", "func", "meth", "mod", "obj"})
TITLED = re.compile(r"(.+?)\s*<([^<>]+)>")

Fail = Callable[[str], NoReturn]


def code(text: str) -> str:
    """`text` as a Markdown code span."""
    fence = "`" * (max((len(run) for run in re.findall(r"`+", text)), default=0) + 1)
    pad = " " if text.startswith("`") or text.endswith("`") else ""
    return f"{fence}{pad}{text}{pad}{fence}"


def inline(text: str, fail: Fail) -> str:
    """Converts ``literals``, cross-reference roles and `links <url>`_ to Markdown."""

    def convert(match: re.Match[str]) -> str:
        if match.group("literal") is not None:
            return code(match.group("literal"))
        if match.group("url") is not None:
            return f"[{match.group('label')}]({match.group('url')})"
        role, target = match.group("role"), match.group("target")
        if role not in ROLES:
            fail(f"uses the unsupported role :{role}:; use one of {', '.join(f':{name}:' for name in sorted(ROLES))}")
        titled = TITLED.fullmatch(target)
        if titled:
            return titled.group(1)
        target = target.removeprefix("!")
        if target.startswith("~"):
            target = target[1:].rpartition(".")[2]
        if role in ("func", "meth") and not target.endswith(")"):
            target += "()"
        return code(target)

    return INLINE.sub(convert, text)


def prose(lines: list[str], fail: Fail) -> str:
    """Paragraphs and lists as Markdown. Rejects reStructuredText blocks the renderer can't show."""
    in_item = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(">>>"):
            fail("has a doctest example; put example code in a tested quickstart snippet")
        if stripped.startswith(".. "):
            fail(f"has the reStructuredText directive {stripped!r}; write it as prose")
        if stripped.endswith("::"):
            fail("has a reStructuredText literal block (::); put example code in a tested quickstart snippet")
        if not stripped:
            continue
        if line[0].isspace():
            if not in_item:
                fail(f"has the indented block {stripped!r}; indent only list item continuation lines")
        else:
            in_item = LIST_ITEM.match(line) is not None
    return inline("\n".join(lines).strip("\n"), fail)


@dataclass
class Doc:
    """A parsed docstring. `parameters`, `raises` and `attributes` map names to Markdown descriptions."""

    text: str = ""
    parameters: dict[str, str] = field(default_factory=dict)
    raises: dict[str, str] = field(default_factory=dict)
    results: list[str] = field(default_factory=list)
    attributes: dict[str, str] = field(default_factory=dict)

    def markdown(self) -> str:
        parts = [self.text] if self.text else []
        if self.parameters:
            parts.append("Parameters:\n\n" + "\n".join(list_item(*entry) for entry in self.parameters.items()))
        parts.extend(self.results)
        if self.raises:
            parts.append("Raises:\n\n" + "\n".join(list_item(*entry) for entry in self.raises.items()))
        return "\n\n".join(parts)


def list_item(name: str, description: str) -> str:
    first, *rest = description.split("\n")
    lines = [f"- {code(name)}: {first}".rstrip()]
    lines.extend(f"  {line}" if line else "" for line in rest)
    return "\n".join(lines)


def parse_doc(raw: str | None, fail: Fail) -> Doc:
    """Parses a cleaned docstring. Section headers are column-0 lines such as ``Args:``."""
    doc = Doc()
    if not raw:
        return doc
    lines = inspect.cleandoc(raw).splitlines()
    text: list[str] = []
    index = 0
    while index < len(lines):
        header = HEADER.fullmatch(lines[index])
        name = header.group(1) if header else ""
        if name in UNSUPPORTED_SECTIONS:
            problem = "document it in prose, or put example code in a tested quickstart snippet"
            fail(f"has an unsupported {name}: section; {problem}")
        if name not in SECTIONS:
            text.append(lines[index])
            index += 1
            continue
        index += 1
        body: list[str] = []
        while index < len(lines) and (not lines[index] or lines[index][0].isspace()):
            body.append(lines[index])
            index += 1
        section(doc, SECTIONS[name], body, fail)
    doc.text = prose(text, fail)
    return doc


def section(doc: Doc, kind: str, body: list[str], fail: Fail) -> None:
    lines = textwrap.dedent("\n".join(body)).strip("\n").splitlines()
    if not lines:
        fail(f"has an empty {kind} section")
    if kind in ("Returns", "Yields"):
        doc.results.append(f"{kind}: {prose(lines, fail)}")
        return
    target = {"Parameters": doc.parameters, "Raises": doc.raises, "Attributes": doc.attributes}[kind]
    entries: list[tuple[str, list[str]]] = []
    for line in lines:
        if line and not line[0].isspace():
            entry = ENTRY.fullmatch(line)
            if entry is None:
                fail(f"can't read {line.strip()!r} in its {kind} section; write `name: description`")
            entries.append((entry.group(1), [entry.group(2) or ""]))
        elif entries:
            entries[-1][1].append(line)
        else:
            fail(f"indents the first entry of its {kind} section more than the others")
    for name, (first, *rest) in entries:
        description = [first, *textwrap.dedent("\n".join(rest)).splitlines()] if rest else [first]
        while description and not description[0]:
            description.pop(0)
        if not description:
            fail(f"doesn't describe {name} in its {kind} section")
        if name in target:
            fail(f"lists {name} twice in its {kind} section")
        target[name] = prose(description, fail)


# Modules and the names they bind.


@dataclass(eq=False)
class Module:
    name: str
    display: str
    is_package: bool
    data: bytes
    tree: ast.Module
    starts: list[int]
    bindings: dict[str, Binding] = field(default_factory=dict)
    stars: list[tuple[str, ast.ImportFrom]] = field(default_factory=list)

    @property
    def generated(self) -> bool:
        return "_generated" in self.name.split(".")

    def offset(self, line: int, column: int) -> int:
        return self.starts[line - 1] + column

    def text(self, node: ast.expr | ast.stmt) -> str:
        """The exact source of `node`."""
        end_line, end_column = node.end_lineno, node.end_col_offset
        assert end_line is not None
        assert end_column is not None
        return self.data[self.offset(node.lineno, node.col_offset) : self.offset(end_line, end_column)].decode()

    def line(self, number: int) -> str:
        """Source line `number`, counting from 1, without its line break."""
        end = self.starts[number] if number < len(self.starts) else len(self.data)
        return self.data[self.starts[number - 1] : end].decode().rstrip("\r\n")

    def fail(self, node: ast.AST | None, declaration: str, problem: str) -> NoReturn:
        raise ExtractError(f"{self.display}:{getattr(node, 'lineno', 1)}: {declaration}: {problem}")


@dataclass(frozen=True)
class Local:
    """Declared in the module: a class, a def and its overloads, an assignment or a type alias."""

    nodes: tuple[ast.stmt, ...]


@dataclass(frozen=True)
class ImportModule:
    """`import a.b as c`, or `import a`."""

    module: str
    node: ast.stmt


@dataclass(frozen=True)
class ImportName:
    """`from a import b`."""

    module: str
    name: str
    node: ast.stmt


Binding = Local | ImportModule | ImportName


@dataclass(eq=False)
class Decl:
    """A module-level declaration; one instance per declaration."""

    module: Module
    name: str
    nodes: tuple[ast.stmt, ...]

    @property
    def node(self) -> ast.stmt:
        return self.nodes[-1]

    @property
    def key(self) -> tuple[str, str]:
        return (self.module.name, self.name)

    def fail(self, node: ast.AST | None, problem: str, member: str = "") -> NoReturn:
        self.module.fail(node or self.node, f"{self.name}.{member}" if member else self.name, problem)


@dataclass(frozen=True)
class ModuleRef:
    module: Module


@dataclass(frozen=True)
class External:
    """A name from another library or the builtins, such as `typing.Protocol`."""

    path: str


Target = Decl | ModuleRef | External


def assigned_names(target: ast.expr) -> Iterator[str]:
    if isinstance(target, ast.Name):
        yield target.id
    elif isinstance(target, ast.Tuple | ast.List):
        for element in target.elts:
            yield from assigned_names(element)
    elif isinstance(target, ast.Starred):
        yield from assigned_names(target.value)


def dunder(name: str) -> bool:
    return name.startswith("__") and name.endswith("__") and len(name) > 4


def private(name: str) -> bool:
    return name.startswith("_") and not dunder(name)


def docstring_after(body: list[ast.stmt], index: int) -> str | None:
    """The string statement after `body[index]`: an attribute docstring."""
    following = body[index + 1] if index + 1 < len(body) else None
    if isinstance(following, ast.Expr) and isinstance(following.value, ast.Constant):
        value = following.value.value
        if isinstance(value, str):
            return value
    return None


def wrap(head: str, parameters: list[str], tail: str, indent: str = "") -> str:
    """`head(parameters)tail` on one line when it fits in WRAP, else one parameter per line with trailing commas,
    as formatters such as Black and Ruff write it."""
    line = f"{indent}{head}({', '.join(parameters)}){tail}"
    if len(line) <= WRAP or not parameters:
        return line
    listed = "".join(f"{indent}    {parameter},\n" for parameter in parameters)
    return f"{indent}{head}(\n{listed}{indent}){tail}"


def scalar_type(value: object) -> str | None:
    """The type of a constant's literal value, for its signature."""
    if value is None:
        return "None"
    if isinstance(value, bool | int | float | complex | str | bytes):
        return type(value).__name__
    return None


def parameter_names(nodes: list[ast.FunctionDef | ast.AsyncFunctionDef]) -> frozenset[str]:
    names: set[str] = set()
    for node in nodes:
        arguments = node.args
        listed = [*arguments.posonlyargs, *arguments.args, *arguments.kwonlyargs, arguments.vararg, arguments.kwarg]
        names.update(argument.arg for argument in listed if argument is not None)
    return frozenset(names)


def check_parameters(doc: Doc, names: frozenset[str], fail: Fail) -> None:
    for name in doc.parameters:
        if name.lstrip("*") not in names:
            fail(f"documents {name}, which isn't a parameter")


@dataclass
class Member:
    """A class member before it becomes surface JSON. Constructors keep `doc` open for the class's Args."""

    name: str
    kind: str
    signatures: list[str]
    doc: Doc
    node: ast.AST
    static: bool = False
    deprecated: str | None = None
    parameters: frozenset[str] = frozenset()

    def surface(self, inherited: str | None) -> dict[str, Any]:
        result: dict[str, Any] = {
            "name": self.name,
            "kind": self.kind,
            "signatures": self.signatures,
            "docs": self.doc.markdown(),
        }
        if self.deprecated is not None:
            result["deprecated"] = self.deprecated
        if self.static:
            result["static"] = True
        if inherited is not None:
            result["inherited"] = inherited
        return result


@dataclass(frozen=True)
class Field:
    """A dataclass field, in the class that declares it."""

    owner: Decl
    statement: ast.AnnAssign
    kw_only: bool

    @property
    def name(self) -> str:
        assert isinstance(self.statement.target, ast.Name)
        return self.statement.target.id


class Program:
    """The source of the documented packages, read on demand."""

    def __init__(self, sources: dict[str, Path]) -> None:
        self.sources = sources
        self.modules: dict[str, Module | None] = {}
        self.decls: dict[tuple[str, str], Decl] = {}
        self.all: dict[str, list[str]] = {}
        self.exporting: set[str] = set()
        self.documented: dict[tuple[str, str], str] = {}
        self.packages: frozenset[str] = frozenset()
        self.mros: dict[tuple[str, str], list[Decl | External]] = {}
        self.inheriting: set[tuple[str, str]] = set()
        self.own_members: dict[tuple[str, str], list[Member]] = {}

    def internal(self, dotted: str) -> bool:
        return dotted.split(".", 1)[0] in self.sources

    def find(self, dotted: str) -> Module | None:
        if dotted not in self.modules:
            top, *rest = dotted.split(".")
            stem = self.sources[top].joinpath(*rest)
            candidates = [(stem / "__init__.py", True)]
            if rest:
                candidates.append((stem.with_name(f"{stem.name}.py"), False))
            found = next(((path, package) for path, package in candidates if path.is_file()), None)
            self.modules[dotted] = self.parse(dotted, *found) if found else None
        return self.modules[dotted]

    def require(self, dotted: str, module: Module, node: ast.AST) -> Module:
        found = self.find(dotted)
        if found is None:
            module.fail(node, dotted, "can't find the source of this module")
        return found

    def parse(self, dotted: str, path: Path, is_package: bool) -> Module:
        display = Path(os.path.relpath(path)).as_posix()
        data = path.read_bytes()
        try:
            tree = ast.parse(data, filename=display)
        except SyntaxError as error:
            raise ExtractError(f"{display}:{error.lineno}: {error.msg}") from None
        starts = [0, *(match.end() for match in re.finditer(rb"\n", data))]
        module = Module(dotted, display, is_package, data, tree, starts)
        for statement in tree.body:
            self.bind(module, statement)
        return module

    def bind(self, module: Module, statement: ast.stmt) -> None:
        bindings = module.bindings
        if isinstance(statement, ast.FunctionDef | ast.AsyncFunctionDef):
            previous = bindings.get(statement.name)
            functions = (ast.FunctionDef, ast.AsyncFunctionDef)
            earlier = previous.nodes if isinstance(previous, Local) and isinstance(previous.nodes[0], functions) else ()
            bindings[statement.name] = Local((*earlier, statement))
        elif isinstance(statement, ast.ClassDef):
            bindings[statement.name] = Local((statement,))
        elif isinstance(statement, ast.Import):
            for alias in statement.names:
                top = alias.name.partition(".")[0]
                bindings[alias.asname or top] = ImportModule(alias.name if alias.asname else top, statement)
        elif isinstance(statement, ast.ImportFrom):
            base = self.absolute(module, statement)
            for alias in statement.names:
                if alias.name == "*":
                    module.stars.append((base, statement))
                else:
                    bindings[alias.asname or alias.name] = ImportName(base, alias.name, statement)
        elif isinstance(statement, ast.Assign):
            for target in statement.targets:
                for name in assigned_names(target):
                    bindings[name] = Local((statement,))
        elif isinstance(statement, ast.AnnAssign) and isinstance(statement.target, ast.Name) and statement.value:
            bindings[statement.target.id] = Local((statement,))
        elif TYPE_ALIAS_STATEMENT is not None and isinstance(statement, TYPE_ALIAS_STATEMENT):
            bindings[statement.name.id] = Local((statement,))

    @staticmethod
    def absolute(module: Module, statement: ast.ImportFrom) -> str:
        if not statement.level:
            return statement.module or ""
        parts = module.name.split(".")
        if not module.is_package:
            parts.pop()
        if statement.level > len(parts):
            module.fail(statement, "import", "imports beyond the top-level package")
        parts = parts[: len(parts) - statement.level + 1]
        return ".".join([*parts, statement.module] if statement.module else parts)

    def decl(self, module: Module, name: str, nodes: tuple[ast.stmt, ...]) -> Decl:
        key = (module.name, name)
        if key not in self.decls:
            self.decls[key] = Decl(module, name, nodes)
        return self.decls[key]

    def exports(self, module: Module) -> list[str]:
        """The module's `__all__`."""
        if module.name in self.all:
            return self.all[module.name]
        if module.name in self.exporting:
            module.fail(None, "__all__", "is imported in a cycle")
        self.exporting.add(module.name)
        for statement in module.tree.body:
            target = statement.target if isinstance(statement, ast.AugAssign) else None
            if isinstance(target, ast.Name) and target.id == "__all__":
                module.fail(statement, "__all__", "list every public name in one literal __all__")
        binding = module.bindings.get("__all__")
        if isinstance(binding, ImportName) and binding.name == "__all__" and self.internal(binding.module):
            names = list(self.exports(self.require(binding.module, module, binding.node)))
        elif isinstance(binding, Local) and isinstance(binding.nodes[0], ast.Assign | ast.AnnAssign):
            value = binding.nodes[0].value
            elements = value.elts if isinstance(value, ast.List | ast.Tuple) else []
            names = [e.value for e in elements if isinstance(e, ast.Constant) and isinstance(e.value, str)]
            if not isinstance(value, ast.List | ast.Tuple) or len(names) != len(elements):
                module.fail(binding.nodes[0], "__all__", "must be a literal list or tuple of strings")
        else:
            module.fail(None, "__all__", "is missing; list the module's public names in a literal __all__")
        repeated = sorted({name for name in names if names.count(name) > 1})
        if repeated:
            module.fail(None, "__all__", f"lists {', '.join(repeated)} more than once")
        self.exporting.discard(module.name)
        self.all[module.name] = names
        return names

    def star_names(self, module: Module) -> list[str]:
        if "__all__" in module.bindings:
            return self.exports(module)
        return [name for name in module.bindings if not name.startswith("_")]

    def resolve(self, module: Module, name: str, seen: frozenset[tuple[str, str]] = frozenset()) -> Target | None:
        """What `name` means at the top level of `module`, following imports; None if it's unbound."""
        if (module.name, name) in seen:
            module.fail(None, name, "is imported in a cycle")
        seen |= {(module.name, name)}
        binding = module.bindings.get(name)
        if isinstance(binding, Local):
            return self.decl(module, name, binding.nodes)
        if isinstance(binding, ImportModule):
            if self.internal(binding.module):
                return ModuleRef(self.require(binding.module, module, binding.node))
            return External(binding.module)
        if isinstance(binding, ImportName):
            if not self.internal(binding.module):
                return External(f"{binding.module}.{binding.name}")
            submodule = self.find(f"{binding.module}.{binding.name}")
            if submodule is not None:
                return ModuleRef(submodule)
            target = self.resolve(self.require(binding.module, module, binding.node), binding.name, seen)
            if target is None:
                module.fail(binding.node, name, f"{binding.module} has no {binding.name}")
            return target
        for base, statement in reversed(module.stars):
            if not self.internal(base):
                module.fail(statement, f"from {base} import *", "name what it imports instead")
            source = self.require(base, module, statement)
            if name in self.star_names(source):
                return self.resolve(source, name, seen)
        return External(f"builtins.{name}") if hasattr(builtins, name) else None

    def resolve_expr(self, module: Module, node: ast.expr) -> Target | None:
        """What a name, attribute, subscript or call expression refers to."""
        if isinstance(node, ast.Call):
            return self.resolve_expr(module, node.func)
        if isinstance(node, ast.Subscript):
            return self.resolve_expr(module, node.value)
        if isinstance(node, ast.Name):
            return self.resolve(module, node.id)
        if isinstance(node, ast.Attribute):
            owner = self.resolve_expr(module, node.value)
            if isinstance(owner, External):
                return External(f"{owner.path}.{node.attr}")
            if isinstance(owner, ModuleRef):
                submodule = self.find(f"{owner.module.name}.{node.attr}")
                return ModuleRef(submodule) if submodule else self.resolve(owner.module, node.attr)
        return None

    def external(self, module: Module, node: ast.expr) -> str | None:
        target = self.resolve_expr(module, node)
        return target.path if isinstance(target, External) else None

    # Signatures.

    def render(self, module: Module, node: ast.expr | ast.stmt, declaration: str, *, multiline: bool = False) -> str:
        """The source of `node` with private aliases of other libraries' modules spelled out (`_dc` is
        `dataclasses`). Other private names fail: the reader can't look them up."""
        end_line, end_column = node.end_lineno, node.end_col_offset
        assert end_line is not None
        assert end_column is not None
        if not multiline and end_line != node.lineno:
            module.fail(node, declaration, "keep this expression on one line, or give it a public name")
        start = module.offset(node.lineno, node.col_offset)
        data = module.data[start : module.offset(end_line, end_column)]
        edits: list[tuple[int, int, str]] = []
        for child in ast.walk(node):
            if isinstance(child, ast.Name) and private(child.id):
                begin = module.offset(child.lineno, child.col_offset) - start
                edits.append((begin, begin + len(child.id.encode()), self.alias(module, child, declaration)))
        for begin, end, replacement in sorted(edits, reverse=True):
            data = data[:begin] + replacement.encode() + data[end:]
        return data.decode()

    def alias(self, module: Module, name: ast.Name, declaration: str) -> str:
        binding = module.bindings.get(name.id)
        if isinstance(binding, ImportModule) and not self.internal(binding.module):
            return binding.module
        if not isinstance(binding, ImportName) or self.internal(binding.module):
            module.fail(name, declaration, f"refers to the private name {name.id}; use a public name")
        return f"{binding.module}.{binding.name}"

    def literal(self, decl: Decl) -> str | None:
        """The source of a constant's literal value, such as `12.0`."""
        statement = decl.node
        value = statement.value if isinstance(statement, ast.Assign | ast.AnnAssign) else None
        if value is None or value.lineno != value.end_lineno:
            return None
        try:
            ast.literal_eval(value)
        except ValueError:
            return None
        return decl.module.text(value)

    def default(self, module: Module, node: ast.expr, declaration: str) -> str:
        """A default value. A name that isn't documented shows its constant's value instead."""
        if isinstance(node, ast.Name):
            target = self.resolve(module, node.id)
            if isinstance(target, Decl) and target.key not in self.documented:
                value = self.literal(target)
                if value is None:
                    module.fail(node, declaration, f"defaults to {node.id}, which is neither documented nor a literal")
                return value
        return self.render(module, node, declaration)

    def decorators(self, module: Module, node: ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef) -> list[str]:
        """Decorator lines, without @overload and @deprecated: surface fields show those."""
        lines = []
        for decorator in node.decorator_list:
            path = self.external(module, decorator)
            if path not in OVERLOAD and path not in DEPRECATED:
                lines.append(f"@{self.render(module, decorator, node.name)}")
        return lines

    def deprecation(self, module: Module, node: ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef) -> str | None:
        for decorator in node.decorator_list:
            if self.external(module, decorator) in DEPRECATED:
                message = decorator.args[0] if isinstance(decorator, ast.Call) and decorator.args else None
                if not isinstance(message, ast.Constant) or not isinstance(message.value, str):
                    module.fail(decorator, node.name, "@deprecated needs a literal message")
                return inline(message.value, partial(module.fail, decorator, node.name))
        return None

    def parameter(self, module: Module, argument: ast.arg, default: ast.expr | None, declaration: str) -> str:
        text = argument.arg
        if argument.annotation is not None:
            text += f": {self.render(module, argument.annotation, declaration)}"
        if default is not None:
            value = self.default(module, default, declaration)
            text += f" = {value}" if argument.annotation is not None else f"={value}"
        return text

    def parameters(self, module: Module, arguments: ast.arguments, declaration: str) -> list[str]:
        positional = [*arguments.posonlyargs, *arguments.args]
        defaults: list[ast.expr | None] = [None] * (len(positional) - len(arguments.defaults))
        defaults.extend(arguments.defaults)
        result = []
        for index, (argument, default) in enumerate(zip(positional, defaults, strict=True)):
            result.append(self.parameter(module, argument, default, declaration))
            if index + 1 == len(arguments.posonlyargs):
                result.append("/")
        if arguments.vararg:
            result.append(f"*{self.parameter(module, arguments.vararg, None, declaration)}")
        elif arguments.kwonlyargs:
            result.append("*")
        for argument, default in zip(arguments.kwonlyargs, arguments.kw_defaults, strict=True):
            result.append(self.parameter(module, argument, default, declaration))
        if arguments.kwarg:
            result.append(f"**{self.parameter(module, arguments.kwarg, None, declaration)}")
        return result

    def function(self, module: Module, node: ast.FunctionDef | ast.AsyncFunctionDef, indent: str = "") -> str:
        """`def name(...) -> T` after its decorator lines."""
        if getattr(node, "type_params", None):
            module.fail(node, node.name, "uses type parameter syntax, which the extractor doesn't support")
        parameters = self.parameters(module, node.args, node.name)
        returns = f" -> {self.render(module, node.returns, node.name)}" if node.returns else ""
        keyword = "async def" if isinstance(node, ast.AsyncFunctionDef) else "def"
        line = wrap(f"{keyword} {node.name}", parameters, returns, indent)
        return "\n".join([*(f"{indent}{decorator}" for decorator in self.decorators(module, node)), line])

    def implementation(
        self, module: Module, nodes: tuple[ast.stmt, ...]
    ) -> list[ast.FunctionDef | ast.AsyncFunctionDef]:
        """The defs Python keeps for one name: overloads, then the implementation if there is one."""
        group: list[ast.FunctionDef | ast.AsyncFunctionDef] = []
        for node in nodes:
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                if group and not self.is_overload(module, group[-1]):
                    group = []
                group.append(node)
        return group

    def is_overload(self, module: Module, node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
        return any(self.external(module, decorator) in OVERLOAD for decorator in node.decorator_list)

    def doc(self, module: Module, raw: str | None, node: ast.AST, declaration: str) -> Doc:
        return parse_doc(raw, lambda problem: module.fail(node, declaration, f"docstring {problem}"))

    def prose_doc(self, module: Module, raw: str | None, node: ast.AST, declaration: str) -> Doc:
        doc = self.doc(module, raw, node, declaration)
        if doc.parameters or doc.raises or doc.results or doc.attributes:
            module.fail(node, declaration, "docstring has a section, but only prose can document this declaration")
        return doc

    def function_doc(
        self, module: Module, group: list[ast.FunctionDef | ast.AsyncFunctionDef], declaration: str, *, shown: str
    ) -> tuple[list[str], Doc]:
        """Signatures and docs of a def and its overloads, or of a property's accessors when `shown` is "all".
        The last docstring wins, and the parameters it documents must exist."""
        overloads = [node for node in group if self.is_overload(module, node)]
        nodes = group if shown == "all" else overloads or group[-1:]
        source = next((node for node in reversed(group) if ast.get_docstring(node)), group[-1])
        doc = self.doc(module, ast.get_docstring(source), source, declaration)
        if doc.attributes:
            module.fail(source, declaration, "docstring has an Attributes section; move it to the class")
        check_parameters(doc, parameter_names(group), lambda problem: module.fail(source, declaration, problem))
        return [self.function(module, node) for node in nodes], doc

    # Classes.

    @staticmethod
    def class_node(decl: Decl) -> ast.ClassDef:
        node = decl.node
        assert isinstance(node, ast.ClassDef)
        return node

    def bases(self, decl: Decl) -> list[Decl | External]:
        result: list[Decl | External] = []
        for base in self.class_node(decl).bases:
            target = self.resolve_expr(decl.module, base)
            if isinstance(target, External) or (isinstance(target, Decl) and isinstance(target.node, ast.ClassDef)):
                result.append(target)
            else:
                decl.fail(base, f"inherits from {decl.module.text(base)}, which the extractor can't resolve to a class")
        return result

    def mro(self, decl: Decl) -> list[Decl | External]:
        """The C3 linearization that Python uses for `__mro__`. Another library's class is one opaque entry."""
        if decl.key in self.mros:
            return self.mros[decl.key]
        if decl.key in self.inheriting:
            decl.fail(None, "inherits from itself")
        self.inheriting.add(decl.key)
        bases = self.bases(decl)
        pending = [self.mro(base) if isinstance(base, Decl) else [base] for base in bases]
        pending = [list(sequence) for sequence in [*pending, bases] if sequence]
        result: list[Decl | External] = [decl]
        while pending:
            head = next((each[0] for each in pending if not any(each[0] in other[1:] for other in pending)), None)
            if head is None:
                decl.fail(None, "has bases in an order that Python can't linearize")
            result.append(head)
            pending = [each[1:] if each[0] == head else each for each in pending]
            pending = [each for each in pending if each]
        self.inheriting.discard(decl.key)
        self.mros[decl.key] = result
        return result

    def is_typeddict(self, decl: Decl) -> bool:
        return any(isinstance(item, External) and typing_name(item.path, "TypedDict") for item in self.mro(decl))

    def is_enum(self, decl: Decl) -> bool:
        return any(isinstance(item, External) and item.path in ENUM_BASES for item in self.mro(decl))

    def kind(self, decl: Decl) -> str:
        protocol = any(isinstance(base, External) and typing_name(base.path, "Protocol") for base in self.bases(decl))
        if protocol or self.is_typeddict(decl):
            return "interface"
        return "enum" if self.is_enum(decl) else "class"

    def opaque(self, decl: Decl) -> bool:
        """A documented generated class: a stub of its fields, without members, like TypeScript's generated types."""
        return decl.module.generated and decl.key in self.documented

    def dataclass_options(self, decl: Decl) -> dict[str, object] | None:
        """The options of the class's @dataclass decorator, or None if it has none."""
        for decorator in self.class_node(decl).decorator_list:
            if self.external(decl.module, decorator) != "dataclasses.dataclass":
                continue
            options: dict[str, object] = {}
            if isinstance(decorator, ast.Call):
                if decorator.args:
                    decl.fail(decorator, "@dataclass takes only literal keyword options here")
                for keyword in decorator.keywords:
                    if keyword.arg is None or not isinstance(keyword.value, ast.Constant):
                        decl.fail(decorator, "@dataclass takes only literal keyword options here")
                    options[keyword.arg] = keyword.value.value
            return options
        return None

    def own_fields(self, decl: Decl, options: dict[str, object]) -> list[Field]:
        kw_only = options.get("kw_only") is True
        fields: list[Field] = []
        for statement in self.class_node(decl).body:
            if not isinstance(statement, ast.AnnAssign) or not isinstance(statement.target, ast.Name):
                continue
            name, path = statement.target.id, self.external(decl.module, statement.annotation)
            if typing_name(path, "ClassVar"):
                continue
            if path == "dataclasses.KW_ONLY":
                kw_only = True
                continue
            if path == "dataclasses.InitVar":
                decl.fail(statement, "is an InitVar, which the extractor doesn't support", name)
            if name.startswith("_"):
                decl.fail(statement, "is private, but the dataclass constructor takes it", name)
            if statement.value is not None and self.external(decl.module, statement.value) == "dataclasses.field":
                decl.fail(statement, "uses dataclasses.field(), which the extractor doesn't support", name)
            fields.append(Field(decl, statement, kw_only))
        return fields

    def dataclass_fields(self, decl: Decl) -> list[Field]:
        """Constructor fields: bases' first, and an overriding field in its base's position."""
        fields: dict[str, Field] = {}
        for item in reversed(self.mro(decl)):
            options = self.dataclass_options(item) if isinstance(item, Decl) else None
            if isinstance(item, Decl) and options is not None:
                fields.update((each.name, each) for each in self.own_fields(item, options))
        return list(fields.values())

    def dataclass_constructor(self, decl: Decl) -> Member:
        fields = self.dataclass_fields(decl)
        parameters = ["self"]
        for kw_only in (False, True):
            listed = [self.field_parameter(each) for each in fields if each.kw_only is kw_only]
            parameters.extend(["*", *listed] if kw_only and listed else listed)
        names = frozenset(each.name for each in fields)
        signature = wrap("def __init__", parameters, " -> None")
        return Member("__init__", "constructor", [signature], Doc(), self.class_node(decl), parameters=names)

    def field_parameter(self, field: Field) -> str:
        module, statement = field.owner.module, field.statement
        declaration = f"{field.owner.name}.{field.name}"
        text = f"{field.name}: {self.render(module, statement.annotation, declaration)}"
        if statement.value is not None:
            text += f" = {self.default(module, statement.value, declaration)}"
        return text

    def class_doc(self, decl: Decl) -> Doc:
        node = self.class_node(decl)
        doc = self.doc(decl.module, ast.get_docstring(node), node, decl.name)
        if doc.results or doc.raises:
            decl.fail(None, "docstring has a Returns, Yields or Raises section; move it to the method it describes")
        return doc

    def body_members(self, decl: Decl) -> list[Member]:
        """The public members of the class body in order, documented by its docstring's Args and Attributes."""
        if decl.key in self.own_members:
            return self.own_members[decl.key]
        node = self.class_node(decl)
        typeddict, enum, options = self.is_typeddict(decl), self.is_enum(decl), self.dataclass_options(decl)
        groups: dict[str, list[ast.FunctionDef | ast.AsyncFunctionDef]] = {}
        for statement in node.body:
            if isinstance(statement, ast.FunctionDef | ast.AsyncFunctionDef):
                groups.setdefault(statement.name, []).append(statement)
        members: list[Member] = []
        constructor_at = 0
        for index, statement in enumerate(node.body):
            if isinstance(statement, ast.FunctionDef | ast.AsyncFunctionDef):
                group = groups.pop(statement.name, None)
                if group and (statement.name == "__init__" or not statement.name.startswith("_")):
                    members.append(self.method(decl, group))
            elif isinstance(statement, ast.AnnAssign):
                member = self.annotation(decl, statement, index, typeddict=typeddict)
                if member is not None:
                    members.append(member)
                    if options is not None and not member.static:
                        constructor_at = len(members)
            elif isinstance(statement, ast.Assign):
                members.extend(self.assignment(decl, statement, index, enum=enum))
            elif isinstance(statement, ast.ClassDef):
                if not statement.name.startswith("_"):
                    decl.fail(statement, "is a public nested class; move it to the module", statement.name)
            elif not isinstance(statement, ast.Pass) and not (
                isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Constant)
            ):
                decl.fail(statement, f"has a {type(statement).__name__} statement that the extractor can't document")
        declares_init = any(
            isinstance(statement, ast.FunctionDef | ast.AsyncFunctionDef) and statement.name == "__init__"
            for statement in node.body
        )
        if options is not None and options.get("init") is not False and not declares_init:
            members.insert(constructor_at, self.dataclass_constructor(decl))
        self.document_members(decl, members)
        self.own_members[decl.key] = members
        return members

    def document_members(self, decl: Decl, members: list[Member]) -> None:
        """Moves the class docstring's Args to the constructor, and its Attributes to the members they name."""
        doc = self.class_doc(decl)
        constructor = next((member for member in members if member.kind == "constructor"), None)
        if doc.parameters:
            if constructor is None:
                decl.fail(None, "docstring has an Args section, but the class doesn't declare a constructor")
            if constructor.doc.parameters:
                decl.fail(None, "documents constructor arguments in both the class and the __init__ docstrings")
            constructor.doc.parameters = doc.parameters
            check_parameters(doc, constructor.parameters, lambda problem: decl.fail(None, f"docstring {problem}"))
        for name, description in doc.attributes.items():
            member = next((each for each in members if each.name == name and each.kind in ("property", "case")), None)
            if member is None:
                decl.fail(None, f"docstring's Attributes section names {name}, which the class body doesn't declare")
            if member.doc.markdown():
                decl.fail(member.node, "is documented both in the class's Attributes section and on its own", name)
            member.doc = Doc(text=description)

    def method(self, decl: Decl, group: list[ast.FunctionDef | ast.AsyncFunctionDef]) -> Member:
        module, first = decl.module, group[0]
        declaration = f"{decl.name}.{first.name}"
        if any(self.external(module, decorator) in PROPERTIES for decorator in first.decorator_list):
            kind, nodes = "property", group
            signatures, doc = self.function_doc(module, group, declaration, shown="all")
        else:
            kind = "constructor" if first.name == "__init__" else "method"
            nodes = self.implementation(module, tuple(group))
            signatures, doc = self.function_doc(module, nodes, declaration, shown="overloads")
        bound = {"builtins.classmethod", "builtins.staticmethod"}
        static = any(self.external(module, decorator) in bound for node in nodes for decorator in node.decorator_list)
        deprecated = self.deprecated(module, nodes)
        return Member(first.name, kind, signatures, doc, nodes[-1], static, deprecated, parameter_names(nodes))

    def annotation(self, decl: Decl, statement: ast.AnnAssign, index: int, *, typeddict: bool) -> Member | None:
        """An annotated attribute, or a TypedDict key named `["key"]` as readers look it up."""
        module = decl.module
        if not isinstance(statement.target, ast.Name):
            decl.fail(statement, "annotates something other than a name in its body")
        name = statement.target.id
        if name.startswith("_") and not typeddict:
            return None
        declaration = f"{decl.name}.{name}"
        doc = self.prose_doc(module, docstring_after(self.class_node(decl).body, index), statement, declaration)
        signature = f"{name}: {self.render(module, statement.annotation, declaration)}"
        if typeddict:
            if statement.value is not None:
                decl.fail(statement, "gives a TypedDict key a value", name)
            return Member(f"[{json.dumps(name, ensure_ascii=False)}]", "property", [signature], doc, statement)
        if statement.value is not None:
            signature += f" = {self.default(module, statement.value, declaration)}"
        static = typing_name(self.external(module, statement.annotation), "ClassVar")
        return Member(name, "property", [signature], doc, statement, static=static)

    def assignment(self, decl: Decl, statement: ast.Assign, index: int, *, enum: bool) -> list[Member]:
        """An enum case. Other public assignments fail: their type is unknown without an annotation."""
        names = [name for target in statement.targets for name in assigned_names(target)]
        public = [name for name in names if not name.startswith("_")]
        if not public:
            return []
        if not enum or len(names) != 1:
            decl.fail(statement, "is a class attribute without a type annotation; annotate it", public[0])
        name = public[0]
        declaration = f"{decl.name}.{name}"
        doc = self.prose_doc(decl.module, docstring_after(self.class_node(decl).body, index), statement, declaration)
        signature = f"{name} = {self.render(decl.module, statement.value, declaration)}"
        return [Member(name, "case", [signature], doc, statement)]

    def owners(self, decl: Decl) -> dict[tuple[str, str], str | None]:
        """For each internal class in the MRO: None when its members count as the class's own, because it is the
        class or only undocumented classes lead to it, else the nearest documented base that includes it."""
        direct = {decl.key}
        stack = [decl]
        while stack:
            for base in self.bases(stack.pop()):
                if isinstance(base, Decl) and base.key not in self.documented and base.key not in direct:
                    direct.add(base.key)
                    stack.append(base)
        mro = self.mro(decl)
        documented = [item for item in mro[1:] if isinstance(item, Decl) and item.key in self.documented]
        owners: dict[tuple[str, str], str | None] = {}
        for item in mro:
            if isinstance(item, Decl):
                if item.key in direct:
                    owners[item.key] = None
                elif item.key in self.documented:
                    owners[item.key] = item.name
                else:
                    owner = next((base for base in documented if item in self.mro(base)), None)
                    if owner is None:
                        decl.fail(None, f"inherits from {item.name} through no documented base")
                    owners[item.key] = owner.name
        return owners

    def members(self, decl: Decl) -> list[dict[str, Any]]:
        """Own members, including those of undocumented bases, then inherited ones, nearest base first. Members of
        other libraries' classes, such as Exception, aren't listed."""
        owners = self.owners(decl)
        seen: set[str] = set()
        own: list[dict[str, Any]] = []
        inherited: list[dict[str, Any]] = []
        for item in self.mro(decl):
            if not isinstance(item, Decl) or self.opaque(item):
                continue
            owner = owners[item.key]
            for member in self.body_members(item):
                if member.name not in seen:
                    seen.add(member.name)
                    (own if owner is None else inherited).append(member.surface(owner))
        return own + inherited

    def visible_bases(self, decl: Decl) -> list[str]:
        """The bases as written, with each undocumented internal base replaced by its own visible bases."""
        result: list[str] = []
        for expression, base in zip(self.class_node(decl).bases, self.bases(decl), strict=True):
            if isinstance(base, Decl) and base.key not in self.documented:
                texts = self.visible_bases(base)
            else:
                texts = [self.render(decl.module, expression, decl.name)]
            result.extend(text for text in dict.fromkeys(texts) if text not in result)
        return result

    def class_line(self, decl: Decl) -> str:
        node = self.class_node(decl)
        if getattr(node, "type_params", None):
            decl.fail(None, "uses type parameter syntax, which the extractor doesn't support")
        parts = self.visible_bases(decl)
        for keyword in node.keywords:
            value = self.render(decl.module, keyword.value, decl.name)
            parts.append(f"{keyword.arg}={value}" if keyword.arg else f"**{value}")
        return wrap(f"class {decl.name}", parts, "") if parts else f"class {decl.name}"

    def stub(self, decl: Decl) -> str:
        """A generated class as a .pyi stub: its decorators, fields and public method signatures."""
        module, node = decl.module, self.class_node(decl)
        lines = [*self.decorators(module, node), f"{self.class_line(decl)}:"]
        body: list[str] = []
        for statement in node.body:
            if isinstance(statement, ast.AnnAssign) and isinstance(statement.target, ast.Name):
                name = statement.target.id
                declaration = f"{decl.name}.{name}"
                if not name.startswith("_"):
                    line = f"    {name}: {self.render(module, statement.annotation, declaration)}"
                    value = statement.value
                    body.append(f"{line} = {self.default(module, value, declaration)}" if value else line)
            elif isinstance(statement, ast.FunctionDef | ast.AsyncFunctionDef):
                if not statement.name.startswith("_"):
                    body.append(f"{self.function(module, statement, '    ')}: ...")
            elif isinstance(statement, ast.Assign) and any(
                not name.startswith("_") for target in statement.targets for name in assigned_names(target)
            ):
                decl.fail(statement, "is a class attribute without a type annotation; annotate it")
        return "\n".join([*lines, *(body or ["    ..."])])

    # Symbols.

    def symbol(self, package: Module, name: str) -> dict[str, Any]:
        """The surface symbol of a name in the package's `__all__`, which `collect` checked."""
        target = self.resolve(package, name)
        if isinstance(target, ModuleRef):
            return self.namespace(name, target.module)
        assert isinstance(target, Decl)
        node = target.node
        if isinstance(node, ast.ClassDef):
            result, members = self.class_symbol(target)
        elif isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            result, members = self.function_symbol(target), []
        else:
            result, members = self.value_symbol(target)
        home = self.documented[target.key]
        if home != package.name:
            result["origin"] = home
        if members:
            result["members"] = members
        return result

    @staticmethod
    def entry(name: str, kind: str, signatures: list[str], docs: str, deprecated: str | None = None) -> dict[str, Any]:
        result: dict[str, Any] = {"name": name, "kind": kind, "signatures": signatures, "docs": docs}
        if deprecated is not None:
            result["deprecated"] = deprecated
        return result

    def namespace(self, name: str, module: Module) -> dict[str, Any]:
        """An exported module, such as `webhooks` in `convohop`, documented by its module docstring."""
        parent, _, last = module.name.rpartition(".")
        signature = f"from {parent} import {last}" if parent else f"import {last}"
        if name != last:
            signature += f" as {name}"
        doc = self.prose_doc(module, ast.get_docstring(module.tree), module.tree, module.name)
        return self.entry(name, "namespace", [signature], doc.text)

    def class_symbol(self, decl: Decl) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        node = self.class_node(decl)
        self.mro(decl)
        doc = self.class_doc(decl)
        deprecated = self.deprecated(decl.module, [node])
        if self.opaque(decl):
            if doc.parameters or doc.attributes:
                decl.fail(None, "is generated, so its docstring can't document its members")
            return self.entry(decl.name, self.kind(decl), [self.stub(decl)], doc.text, deprecated), []
        signature = "\n".join([*self.decorators(decl.module, node), self.class_line(decl)])
        members = self.members(decl)
        return self.entry(decl.name, self.kind(decl), [signature], doc.text, deprecated), members

    def function_symbol(self, decl: Decl) -> dict[str, Any]:
        nodes = self.implementation(decl.module, decl.nodes)
        signatures, doc = self.function_doc(decl.module, nodes, decl.name, shown="overloads")
        return self.entry(decl.name, "function", signatures, doc.markdown(), self.deprecated(decl.module, nodes))

    def deprecated(
        self, module: Module, nodes: Sequence[ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef]
    ) -> str | None:
        return next((reason for node in nodes if (reason := self.deprecation(module, node)) is not None), None)

    def value_symbol(self, decl: Decl) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        """A type alias, a TypedDict declared with the functional syntax or a constant."""
        module, statement = decl.module, decl.node
        body = module.tree.body
        doc = self.prose_doc(module, docstring_after(body, body.index(statement)), statement, decl.name)
        if TYPE_ALIAS_STATEMENT is not None and isinstance(statement, TYPE_ALIAS_STATEMENT):
            if getattr(statement, "type_params", None):
                decl.fail(None, "uses type parameter syntax, which the extractor doesn't support")
            kind, signature = "type", self.render(module, statement, decl.name, multiline=True)
        elif not isinstance(statement, ast.Assign | ast.AnnAssign) or statement.value is None:
            decl.fail(None, "is a kind of declaration the extractor can't document")
        elif isinstance(statement, ast.AnnAssign) and typing_name(
            self.external(module, statement.annotation), "TypeAlias"
        ):
            kind, signature = "type", self.render(module, statement, decl.name, multiline=True)
        elif isinstance(statement.value, ast.Call) and typing_name(
            self.external(module, statement.value.func), "TypedDict"
        ):
            return self.typed_dict(decl, statement.value, doc)
        elif isinstance(statement, ast.Assign) and (
            len(statement.targets) != 1 or not isinstance(statement.targets[0], ast.Name)
        ):
            decl.fail(None, "assign each public constant in a statement of its own")
        else:
            kind, signature = "constant", f"{decl.name}: {self.constant_type(decl, statement)}"
        return self.entry(decl.name, kind, [signature], doc.text), []

    def constant_type(self, decl: Decl, statement: ast.Assign | ast.AnnAssign) -> str:
        """A constant's declared type, else its literal value's: the value itself would drift with each release."""
        annotation = statement.annotation if isinstance(statement, ast.AnnAssign) else None
        if annotation is not None and typing_name(self.external(decl.module, annotation), "Final"):
            annotation = annotation.slice if isinstance(annotation, ast.Subscript) else None
        if annotation is not None:
            return self.render(decl.module, annotation, decl.name)
        assert statement.value is not None
        try:
            inferred = scalar_type(ast.literal_eval(statement.value))
        except (ValueError, TypeError, SyntaxError, MemoryError, RecursionError):
            inferred = None
        if inferred is None:
            decl.fail(
                None, "is a constant of a type the extractor can't infer; annotate it, with TypeAlias for an alias"
            )
        return inferred

    def typed_dict(self, decl: Decl, call: ast.Call, doc: Doc) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        """`X = TypedDict("X", {...})`. Each key is a member, documented by the comment lines directly above it."""
        module = decl.module
        title, fields = call.args if len(call.args) == 2 else (None, None)
        if not (isinstance(title, ast.Constant) and title.value == decl.name and isinstance(fields, ast.Dict)):
            decl.fail(call, f'declare it as TypedDict("{decl.name}", {{...}}) with a literal dict of its keys')
        options = []
        for keyword in call.keywords:
            if keyword.arg is None:
                decl.fail(call, "passes TypedDict options with **; name each option")
            options.append(f", {keyword.arg}={self.render(module, keyword.value, decl.name)}")
        signature = f"{decl.name} = TypedDict({json.dumps(decl.name)}, {{...}}{''.join(options)})"
        members: list[dict[str, Any]] = []
        above = fields.lineno
        for key, value in zip(fields.keys, fields.values, strict=True):
            if not isinstance(key, ast.Constant) or not isinstance(key.value, str):
                decl.fail(key or value, "has a TypedDict key that isn't a string literal")
            label = f"[{json.dumps(key.value, ensure_ascii=False)}]"
            declaration = f"{decl.name}{label}"
            text = prose(self.comments(module, key.lineno, above), partial(module.fail, key, declaration))
            item = f"{module.text(key)}: {self.render(module, value, declaration)}"
            members.append(Member(label, "property", [item], Doc(text=text), key).surface(None))
            above = value.end_lineno or value.lineno
        return self.entry(decl.name, "interface", [signature], doc.text), members

    @staticmethod
    def comments(module: Module, line: int, above: int) -> list[str]:
        """The `#` comment lines directly above source line `line` and below line `above`, without their `#`."""
        lines: list[str] = []
        number = line - 1
        while number > above and (text := module.line(number).strip()).startswith("#"):
            lines.append(text[1:].removeprefix(" "))
            number -= 1
        return lines[::-1]

    def collect(self, packages: list[Module]) -> None:
        """Checks every package's `__all__` and records which package documents each declaration: the one that
        declares it, else the first that exports it."""
        self.packages = frozenset(package.name for package in packages)
        for package in packages:
            for name in self.exports(package):
                target = self.resolve(package, name)
                if target is None:
                    package.fail(None, "__all__", f"lists {name}, which the module neither defines nor imports")
                if isinstance(target, External):
                    package.fail(None, "__all__", f"lists {name}, which is {target.path}; document that elsewhere")
                if isinstance(target, Decl):
                    if target.name != name:
                        package.fail(None, "__all__", f"lists {name}, which renames {target.name}; export the original")
                    if target.key not in self.documented or target.module.name == package.name:
                        self.documented[target.key] = package.name


def extract(path: Path) -> dict[str, Any]:
    language = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(language, dict) or language.get("id") != "python":
        raise ExtractError(f"{path}: isn't the Python language config")
    packages = language.get("packages")
    if not isinstance(packages, list) or not packages:
        raise ExtractError(f"{path}: lists no packages")
    sources: dict[str, Path] = {}
    names: list[str] = []
    for package in packages:
        name, source = (package.get("name"), package.get("source")) if isinstance(package, dict) else (None, None)
        if not isinstance(name, str) or not all(part.isidentifier() for part in name.split(".")):
            raise ExtractError(f"{path}: package name {name!r} isn't a dotted Python module name")
        if not isinstance(source, str):
            raise ExtractError(f"{path}: package {name} has no source")
        top = name.partition(".")[0]
        root = Path(source)
        if root.name != top:
            raise ExtractError(f"{path}: package {name}'s source {source} isn't the directory of package {top}")
        if sources.setdefault(top, root) != root:
            raise ExtractError(f"{path}: package {name}'s source {source} differs from {top}'s, {sources[top]}")
        if name in names:
            raise ExtractError(f"{path}: lists package {name} twice")
        names.append(name)
    program = Program(sources)
    modules = []
    for name in names:
        module = program.find(name)
        if module is None:
            raise ExtractError(f"{path}: package {name} has no source under {sources[name.partition('.')[0]]}")
        modules.append(module)
    program.collect(modules)
    return {
        "language": "python",
        "packages": [
            {
                "name": module.name,
                "symbols": sorted(
                    (program.symbol(module, export) for export in program.exports(module)),
                    key=lambda symbol: symbol["name"].encode("utf-16-be"),
                ),
            }
            for module in modules
        ],
    }


def main(arguments: list[str]) -> int:
    if len(arguments) != 1 or arguments[0].startswith("-"):
        print("usage: python3 tools/docgen/extractors/python.py <language.json>", file=sys.stderr)
        return 2
    try:
        surface = extract(Path(arguments[0]))
    except (ExtractError, OSError, UnicodeError, json.JSONDecodeError) as error:
        print(f"python extractor: {error}", file=sys.stderr)
        return 1
    sys.stdout.buffer.write(json.dumps(surface, ensure_ascii=False, separators=(",", ":")).encode() + b"\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

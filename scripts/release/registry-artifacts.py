"""Offline registry artifact checks and Central bundle assembly; never uploads."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import time
import tomllib
import zipfile
from email.parser import BytesParser
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

MAVEN_MODULES = {
    "jvm": {"relay-server": "jar", "relay-server-kotlin": "jar"},
    "android": {"relay-android": "aar", "relay-android-core": "jar", "relay-android-push": "aar"},
}
CHECKSUMS = ("md5", "sha1", "sha256", "sha512")
REPOSITORY_URL = "https://github.com/ConvoHop/sdks"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def safe_name(name: str) -> str:
    path = PurePosixPath(name)
    require(not path.is_absolute() and ".." not in path.parts and "\\" not in name, "Unsafe archive path")
    return str(path)


def zip_files(data: bytes) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for entry in archive.infolist():
            name = safe_name(entry.filename)
            require(not stat.S_ISLNK(entry.external_attr >> 16), "Archive symlinks are not allowed")
            if entry.is_dir():
                continue
            require(name not in files, "Duplicate archive member")
            files[name] = archive.read(entry)
    return files


def tar_files(data: bytes) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for entry in archive:
            name = safe_name(entry.name)
            require(entry.isdir() or entry.isfile(), "Archive links and special files are not allowed")
            if entry.isdir():
                continue
            require(name not in files, "Duplicate archive member")
            stream = archive.extractfile(entry)
            if stream is None:
                raise ValueError("Missing archive contents")
            files[name] = stream.read()
    return files


def python_metadata(data: bytes, version: str) -> None:
    metadata = BytesParser().parsebytes(data)
    for key, expected in {
        "Name": "instantrelay",
        "Version": version,
        "Requires-Python": ">=3.11",
        "License-Expression": "Apache-2.0",
    }.items():
        require(metadata.get_all(key) == [expected], f"Python metadata {key} must be {expected}")
    require(
        "Private :: Do Not Upload" not in metadata.get_all("Classifier", []),
        "Python upload fence remains in the release",
    )


def inspect_python(directory: Path, version: str) -> None:
    wheel = zip_files((directory / f"instantrelay-{version}-py3-none-any.whl").read_bytes())
    info = f"instantrelay-{version}.dist-info"
    python_metadata(wheel[f"{info}/METADATA"], version)
    for name in ("instantrelay/py.typed", f"{info}/licenses/LICENSE", f"{info}/licenses/NOTICE"):
        require(name in wheel, f"Wheel is missing {name}")
    version_pattern = rf'^__version__ = "{re.escape(version)}"$'
    require(
        re.search(version_pattern, wheel["instantrelay/_version.py"].decode(), re.MULTILINE) is not None,
        "Wheel import version differs from its distribution",
    )
    sdist = tar_files((directory / f"instantrelay-{version}.tar.gz").read_bytes())
    prefix = f"instantrelay-{version}/"
    require(all(name.startswith(prefix) for name in sdist), "Unexpected sdist root")
    python_metadata(sdist[f"{prefix}PKG-INFO"], version)
    project = tomllib.loads(sdist[f"{prefix}pyproject.toml"].decode())["project"]
    require(project["name"] == "instantrelay", "Unexpected Python project name")
    require(
        "Private :: Do Not Upload" not in project.get("classifiers", []), "Private classifier remains in sdist source"
    )
    require(
        sdist[f"{prefix}src/instantrelay/_version.py"] == wheel["instantrelay/_version.py"], "Python artifact versions differ"
    )
    for name in ("LICENSE", "NOTICE", "README.md"):
        require(f"{prefix}{name}" in sdist, f"sdist is missing {name}")


def xml_namespace(root: ElementTree.Element) -> str:
    return root.tag[: root.tag.index("}") + 1] if root.tag.startswith("{") else ""


def parse_xml(data: bytes) -> ElementTree.Element:
    require(len(data) <= 1024 * 1024, "XML metadata exceeds the size limit")
    text = data.decode("utf-8")
    require(
        "\x00" not in text and re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", text, re.IGNORECASE) is None,
        "XML DTDs and entities are not allowed; metadata must be UTF-8",
    )
    return ElementTree.fromstring(text)  # noqa: S314 - DTD/entity declarations are rejected before parsing.


def inspect_nuget(directory: Path, version: str, sha: str) -> None:
    for extension in ("nupkg", "snupkg"):
        files = zip_files((directory / f"InstantRelay.{version}.{extension}").read_bytes())
        spec = parse_xml(files["InstantRelay.nuspec"])
        namespace = xml_namespace(spec)
        metadata = spec.find(f"{namespace}metadata")
        if metadata is None:
            raise ValueError("NuGet metadata is missing")
        values = {"id": "InstantRelay", "version": version}
        # NuGet omits the license from its symbol nuspec; the main package must carry it.
        if extension == "nupkg":
            values["license"] = "Apache-2.0"
        for key, expected in values.items():
            require(metadata.findtext(f"{namespace}{key}") == expected, f"NuGet {extension} {key} must be {expected}")
        repository = metadata.find(f"{namespace}repository")
        require(
            repository is not None and repository.get("url") == REPOSITORY_URL and repository.get("commit") == sha,
            "NuGet repository must identify the release commit",
        )
        if extension == "nupkg":
            for name in ("README.md", "LICENSE", "NOTICE"):
                require(name in files, f"NuGet package is missing {name}")
            for framework in ("netstandard2.0", "net10.0"):
                for suffix in ("dll", "xml"):
                    require(
                        f"lib/{framework}/Relay.{suffix}" in files, f"NuGet asset {framework}/{suffix} is missing"
                    )
        else:
            link = f'"https://raw.githubusercontent.com/ConvoHop/sdks/{sha}/*"'.encode()
            for framework in ("netstandard2.0", "net10.0"):
                require(
                    link in files[f"lib/{framework}/Relay.pdb"],
                    f"Source Link for {framework} differs from the release",
                )


def inspect_pubdev(directory: Path, version: str) -> None:
    files = tar_files((directory / f"instantrelay-{version}.tar.gz").read_bytes())
    pubspec = files["pubspec.yaml"].decode()
    for key, expected in {"name": "instantrelay", "version": version, "publish_to": "https://pub.dev"}.items():
        require(re.findall(rf"^{key}: (.+)$", pubspec, re.MULTILINE) == [expected], f"Flutter {key} must be {expected}")
    for name in ("README.md", "LICENSE", "NOTICE", "CHANGELOG.md"):
        require(name in files, f"Flutter archive is missing {name}")
    require(bool(files.get("lib/instantrelay.dart")), "Flutter archive has no public library")
    require("lib/src/version.dart" in files, "Flutter package version declaration is missing")
    require(
        re.findall(r"^const relayPackageVersion = '([^']+)';$", files["lib/src/version.dart"].decode(), re.MULTILINE)
        == [version],
        "Flutter library version differs from its pubspec",
    )
    forbidden = (".dart_tool/", "build/", ".git/")
    require(
        not any(name.startswith(forbidden) or name == "pubspec.lock" for name in files),
        "Flutter archive contains local build state",
    )


def maven_artifacts(sdk: str, version: str) -> dict[str, str]:
    require(sdk in MAVEN_MODULES, "Unknown Maven SDK")
    result = {}
    for module, packaging in MAVEN_MODULES[sdk].items():
        base = f"dev/instantrelay/{module}/{version}/{module}-{version}"
        for suffix in (f".{packaging}", ".pom", ".module", "-sources.jar", "-javadoc.jar"):
            result[f"{base}{suffix}"] = module
    return result


def inspect_pom(data: bytes, module: str, version: str, packaging: str) -> None:
    root = parse_xml(data)
    namespace = xml_namespace(root)

    def text(path: str) -> str:
        return root.findtext("/".join(f"{namespace}{part}" for part in path.split("/")), "").strip()

    for key, expected in {"groupId": "dev.instantrelay", "artifactId": module, "version": version}.items():
        require(text(key) == expected, f"Maven {module} {key} must be {expected}")
    require((text("packaging") or "jar") == packaging, f"Maven {module} has the wrong packaging")
    for key in (
        "name",
        "description",
        "url",
        "licenses/license/name",
        "licenses/license/url",
        "developers/developer/name",
        "scm/url",
        "scm/connection",
        "scm/developerConnection",
    ):
        require(bool(text(key)), f"Maven {module} POM is missing {key}")
    for dependency in root.findall(f"{namespace}dependencies/{namespace}dependency"):
        dependency_version = dependency.findtext(f"{namespace}version", "")
        require("SNAPSHOT" not in dependency_version, f"Maven {module} depends on a snapshot")
        if dependency.findtext(f"{namespace}groupId") == "dev.instantrelay":
            require(dependency_version == version, f"Maven {module} has an unaligned internal dependency")


def inspect_maven(files: dict[str, bytes], sdk: str, version: str, signed: bool = False) -> None:
    artifacts = maven_artifacts(sdk, version)
    expected = set(artifacts)
    expected.update(f"{name}.{algorithm}" for name in artifacts for algorithm in CHECKSUMS)
    if signed:
        expected.update(f"{name}.asc" for name in artifacts)
    require(set(files) == expected, "Maven bundle does not contain the exact artifacts, checksums and signature set")
    for name, module in artifacts.items():
        data = files[name]
        require(bool(data), f"Maven artifact {name} is empty")
        for algorithm in CHECKSUMS:
            digest = hashlib.new(algorithm, data, usedforsecurity=False).hexdigest().encode()
            require(files[f"{name}.{algorithm}"].strip() == digest, f"Maven {name} {algorithm} checksum differs")
        if name.endswith(".pom"):
            inspect_pom(data, module, version, MAVEN_MODULES[sdk][module])
        elif name.endswith(".module"):
            metadata = json.loads(data)
            require(isinstance(metadata, dict), f"Maven {module} module metadata must be an object")
            component = metadata.get("component")
            require(
                isinstance(component, dict)
                and all(
                    component.get(key) == value
                    for key, value in {"group": "dev.instantrelay", "module": module, "version": version}.items()
                ),
                f"Maven {module} module coordinates differ",
            )
            variants = metadata.get("variants")
            require(isinstance(variants, list) and bool(variants), f"Maven {module} variants are missing")
            for variant in variants:
                require(
                    isinstance(variant, dict) and isinstance(variant.get("name"), str),
                    f"Maven {module} variant metadata is malformed",
                )
                for dependency in variant.get("dependencies", []):
                    require(isinstance(dependency, dict), f"Maven {module} dependency metadata is malformed")
                    if dependency.get("group") == "dev.instantrelay":
                        dependency_version = dependency.get("version")
                        require(
                            isinstance(dependency_version, dict) and dependency_version.get("requires") == version,
                            f"Maven {module} has an unaligned module dependency",
                        )
        elif name.endswith((".jar", ".aar")):
            members = zip_files(data)
            if name.endswith("-sources.jar"):
                require(any(path.endswith((".java", ".kt")) for path in members), f"Maven {module} sources are missing")
            elif name.endswith("-javadoc.jar"):
                require(
                    any(path.endswith((".html", ".md")) and body for path, body in members.items()),
                    f"Maven {module} API documentation is missing",
                )
            elif name.endswith(".aar"):
                require(
                    "AndroidManifest.xml" in members and "classes.jar" in members,
                    f"Maven {module} Android library contents are missing",
                )
            else:
                require(any(path.endswith(".class") for path in members), f"Maven {module} bytecode is missing")


def bundle_maven(repository: Path, sdk: str, version: str, out: Path, signed: bool = False) -> None:
    require(
        re.fullmatch(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", version) is not None and version != "0.0.0",
        "Central bundles require a nonzero stable version",
    )
    require(
        out.name.endswith("-signed.tar.gz" if signed else "-unsigned.tar.gz"),
        "Name the bundle explicitly signed or unsigned",
    )
    repository = repository.resolve()
    files = {}
    for name in maven_artifacts(sdk, version):
        path = repository / name
        require(
            path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(repository),
            f"Missing or unsafe Maven artifact {name}",
        )
        files[name] = path.read_bytes()
        for algorithm in CHECKSUMS:
            files[f"{name}.{algorithm}"] = (
                hashlib.new(algorithm, files[name], usedforsecurity=False).hexdigest().encode() + b"\n"
            )
        signature = Path(f"{path}.asc")
        if signed:
            require(signature.is_file() and not signature.is_symlink(), f"Missing Maven signature for {name}")
            gpg = shutil.which("gpg")
            if gpg is None:
                raise ValueError("gpg is required to verify signed Central bundles")
            verified = subprocess.run(  # noqa: S603 - Absolute executable, fixed flags and checked local artifact paths; no shell.
                [gpg, "--batch", "--verify", str(signature), str(path)], check=False, capture_output=True
            )
            require(verified.returncode == 0, f"GPG could not verify the signature for {name}")
            files[f"{name}.asc"] = signature.read_bytes()
        else:
            require(not signature.exists(), "Signed artifacts need --signed; refusing to discard their signatures")
    inspect_maven(files, sdk, version, signed)
    out.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(out, "x:gz") as archive:
        for name, data in sorted(files.items()):
            entry = tarfile.TarInfo(name)
            entry.size = len(data)
            entry.mode = 0o644
            archive.addfile(entry, io.BytesIO(data))


def sign_maven_bundle(source: Path, sdk: str, version: str, out: Path) -> None:
    require(source.is_file() and not source.is_symlink(), "Missing or unsafe unsigned Maven bundle")
    files = tar_files(source.read_bytes())
    inspect_maven(files, sdk, version)
    require(out.suffix == ".zip" and not out.exists(), "Central needs a new signed ZIP bundle")
    key = os.environ.get("MAVEN_SIGNING_KEY", "")
    password = os.environ.get("MAVEN_SIGNING_PASSWORD", "")
    require(bool(key.strip()) and bool(password), "Set the existing MAVEN_SIGNING_KEY and MAVEN_SIGNING_PASSWORD")
    require("\n" not in password and "\r" not in password, "The signing passphrase must not contain a newline")
    gpg, agent_program = shutil.which("gpg"), shutil.which("gpg-agent")
    require(gpg is not None and agent_program is not None, "gpg and gpg-agent are required for Central signing")
    environment = {name: value for name, value in os.environ.items() if not name.startswith("MAVEN_")}
    with tempfile.TemporaryDirectory(prefix="relay-central-") as temporary:
        home = Path(temporary) / "gnupg"
        home.mkdir(mode=0o700)
        agent = subprocess.Popen(  # noqa: S603 - Absolute executable, fixed flags and isolated keyring.
            [agent_program, "--homedir", str(home), "--daemon", "--no-detach", "--allow-loopback-pinentry"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=environment,
        )
        try:
            for _ in range(50):
                if (home / "S.gpg-agent").exists():
                    break
                require(agent.poll() is None, "The isolated signing agent could not start")
                time.sleep(0.1)
            require((home / "S.gpg-agent").exists(), "The isolated signing agent did not become ready")
            base = [gpg, "--homedir", str(home), "--batch", "--no-tty", "--no-autostart"]

            def execute(arguments: list[str], label: str, secret: bytes | None = None) -> bytes:
                result = subprocess.run(  # noqa: S603 - Absolute executable and checked local artifact paths; no shell.
                    [*base, *arguments], input=secret, capture_output=True, check=False, env=environment,
                )
                require(result.returncode == 0, f"GPG could not {label}; signing diagnostics are withheld")
                return result.stdout

            execute(["--import"], "import the supplied signing key", key.encode())
            listing = execute(["--with-colons", "--list-secret-keys"], "identify the signing key").decode()
            fingerprints: list[str] = []
            primary = False
            for line in listing.splitlines():
                fields = line.split(":")
                if fields[0] == "sec":
                    primary = True
                elif fields[0] == "fpr" and primary:
                    fingerprints.append(fields[9])
                    primary = False
            require(
                len(fingerprints) == 1 and re.fullmatch(r"[0-9A-F]{40}|[0-9A-F]{64}", fingerprints[0]) is not None,
                "Supply exactly one identifiable signing key",
            )
            for name in maven_artifacts(sdk, version):
                path = Path(temporary) / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(files[name])
                signature = Path(f"{path}.asc")
                execute(
                    ["--local-user", fingerprints[0], "--pinentry-mode", "loopback", "--passphrase-fd", "0",
                     "--armor", "--digest-algo", "SHA512", "--detach-sign", "--output", str(signature), str(path)],
                    "sign an approved artifact", password.encode() + b"\n",
                )
                execute(["--verify", str(signature), str(path)], "verify the artifact signature")
                files[f"{name}.asc"] = signature.read_bytes()
        finally:
            agent.terminate()
            try:
                agent.wait(timeout=5)
            except subprocess.TimeoutExpired:
                agent.kill()
                agent.wait(timeout=5)
    inspect_maven(files, sdk, version, signed=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            archive.writestr(name, data)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    inspect = commands.add_parser("inspect")
    inspect.add_argument("--registry", required=True, choices=("pypi", "nuget", "pubdev", "maven-jvm", "maven-android"))
    inspect.add_argument("--version", required=True)
    inspect.add_argument("--sha", required=True)
    inspect.add_argument("--directory", required=True, type=Path)
    bundle = commands.add_parser("bundle-maven")
    bundle.add_argument("--sdk", required=True, choices=tuple(MAVEN_MODULES))
    bundle.add_argument("--version", required=True)
    bundle.add_argument("--repository", required=True, type=Path)
    bundle.add_argument("--out", required=True, type=Path)
    bundle.add_argument(
        "--signed", action="store_true", help="Require and verify existing GPG signatures; never creates a key"
    )
    signing = commands.add_parser("sign-maven")
    signing.add_argument("--sdk", required=True, choices=tuple(MAVEN_MODULES))
    signing.add_argument("--version", required=True)
    signing.add_argument("--source", required=True, type=Path)
    signing.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    if args.command == "bundle-maven":
        bundle_maven(args.repository, args.sdk, args.version, args.out, args.signed)
    elif args.command == "sign-maven":
        sign_maven_bundle(args.source, args.sdk, args.version, args.out)
    elif args.registry == "pypi":
        inspect_python(args.directory, args.version)
    elif args.registry == "nuget":
        inspect_nuget(args.directory, args.version, args.sha)
    elif args.registry == "pubdev":
        inspect_pubdev(args.directory, args.version)
    else:
        archive = args.directory / f"instantrelay-{args.registry}-{args.version}-unsigned.tar.gz"
        inspect_maven(tar_files(archive.read_bytes()), args.registry.removeprefix("maven-"), args.version)


if __name__ == "__main__":
    main()

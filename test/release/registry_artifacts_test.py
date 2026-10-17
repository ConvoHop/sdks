"""Maintained offline fixtures for registry package and Central bundle checks."""

# ruff: noqa: PT009, PT027 - Standard-library tests run inside node:test without requiring pytest.

from __future__ import annotations

import importlib.util
import io
import json
import subprocess
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("registry_artifacts", ROOT / "scripts/release/registry-artifacts.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the maintained artifact checker")
ARTIFACTS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ARTIFACTS)
VERSION = "0.1.0"
SHA = "a" * 40


def zipped(files: dict[str, bytes]) -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        for name, body in files.items():
            archive.writestr(name, body)
    return stream.getvalue()


def tarred(files: dict[str, bytes]) -> bytes:
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w:gz") as archive:
        for name, body in files.items():
            entry = tarfile.TarInfo(name)
            entry.size = len(body)
            archive.addfile(entry, io.BytesIO(body))
    return stream.getvalue()


def pom(module: str, packaging: str) -> bytes:
    return f"""<project xmlns="http://maven.apache.org/POM/4.0.0">
      <groupId>com.convohop</groupId><artifactId>{module}</artifactId><version>{VERSION}</version>
      <packaging>{packaging}</packaging><name>ConvoHop</name><description>SDK</description>
      <url>https://github.com/ConvoHop/sdks</url>
      <licenses><license><name>Apache-2.0</name><url>https://www.apache.org/licenses/LICENSE-2.0</url></license></licenses>
      <developers><developer><name>ConvoHop</name></developer></developers>
      <scm><url>https://github.com/ConvoHop/sdks</url><connection>scm:git:https://github.com/ConvoHop/sdks.git</connection>
      <developerConnection>scm:git:https://github.com/ConvoHop/sdks.git</developerConnection></scm>
    </project>""".encode()


class RegistryArtifactsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="convohop-registry-artifacts-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)

    def python(self, private: bool = False, wheel_version: str = VERSION) -> None:
        metadata = (
            f"Metadata-Version: 2.4\nName: convohop\nVersion: {VERSION}\nRequires-Python: >=3.11\n"
            "License-Expression: Apache-2.0\n"
        )
        if private:
            metadata += "Classifier: Private :: Do Not Upload\n"
        info = f"convohop-{VERSION}.dist-info"
        version_file = f'__version__ = "{wheel_version}"\n'.encode()
        (self.directory / f"convohop-{VERSION}-py3-none-any.whl").write_bytes(
            zipped(
                {
                    f"{info}/METADATA": metadata.encode(),
                    f"{info}/licenses/LICENSE": b"Apache-2.0",
                    f"{info}/licenses/NOTICE": b"ConvoHop",
                    "convohop/py.typed": b"",
                    "convohop/_version.py": version_file,
                }
            )
        )
        files = {
            "PKG-INFO": metadata.encode(),
            "pyproject.toml": b'[project]\nname = "convohop"\n',
            "src/convohop/_version.py": version_file,
            "README.md": b"SDK",
            "LICENSE": b"Apache-2.0",
            "NOTICE": b"ConvoHop",
        }
        (self.directory / f"convohop-{VERSION}.tar.gz").write_bytes(
            tarred({f"convohop-{VERSION}/{name}": body for name, body in files.items()})
        )

    def nuget(self, commit: str = SHA) -> None:
        spec = f"""<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">
          <metadata><id>ConvoHop</id><version>{VERSION}</version><license type="expression">Apache-2.0</license>
          <repository url="https://github.com/ConvoHop/sdks" commit="{commit}"/></metadata></package>""".encode()
        package = {"ConvoHop.nuspec": spec, "README.md": b"SDK", "LICENSE": b"Apache-2.0", "NOTICE": b"ConvoHop"}
        symbols = {"ConvoHop.nuspec": spec.replace(b'<license type="expression">Apache-2.0</license>', b"")}
        for framework in ("netstandard2.0", "net10.0"):
            for suffix in ("dll", "xml"):
                package[f"lib/{framework}/ConvoHop.{suffix}"] = b"fixture"
            symbols[f"lib/{framework}/ConvoHop.pdb"] = (
                f'"https://raw.githubusercontent.com/ConvoHop/sdks/{commit}/*"'.encode()
            )
        for extension, files in (("nupkg", package), ("snupkg", symbols)):
            (self.directory / f"ConvoHop.{VERSION}.{extension}").write_bytes(zipped(files))

    def maven(self, sdk: str, signatures: bool = False) -> None:
        for name, module in ARTIFACTS.maven_artifacts(sdk, VERSION).items():
            path = self.directory / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if name.endswith(".pom"):
                body = pom(module, ARTIFACTS.MAVEN_MODULES[sdk][module])
            elif name.endswith("-sources.jar"):
                body = zipped({"Example.kt": b"package fixture"})
            elif name.endswith("-javadoc.jar"):
                body = zipped({"reference/api.md": b"# API reference"})
            elif name.endswith(".module"):
                body = json.dumps(
                    {
                        "component": {"group": "com.convohop", "module": module, "version": VERSION},
                        "variants": [{"name": "runtimeElements"}],
                    }
                ).encode()
            elif name.endswith(".aar"):
                body = zipped(
                    {"AndroidManifest.xml": b"<manifest/>", "classes.jar": zipped({"Fixture.class": b"fixture"})}
                )
            else:
                body = zipped({"fixture.class": b"test fixture, not compiled SDK evidence"})
            path.write_bytes(body)
            if signatures:
                Path(f"{path}.asc").write_bytes(b"fixture signature; GPG verification is mocked")

    def test_python_metadata_and_import_version(self) -> None:
        self.python()
        ARTIFACTS.inspect_python(self.directory, VERSION)
        self.python(wheel_version="0.2.0")
        with self.assertRaisesRegex(ValueError, "import version"):
            ARTIFACTS.inspect_python(self.directory, VERSION)

    def test_python_private_metadata_is_not_publishable(self) -> None:
        self.python(private=True)
        with self.assertRaisesRegex(ValueError, "upload fence"):
            ARTIFACTS.inspect_python(self.directory, VERSION)

    def test_nuget_package_and_symbols_identify_the_source(self) -> None:
        self.nuget()
        ARTIFACTS.inspect_nuget(self.directory, VERSION, SHA)
        self.nuget(commit="b" * 40)
        with self.assertRaisesRegex(ValueError, "release commit"):
            ARTIFACTS.inspect_nuget(self.directory, VERSION, SHA)

    def test_nuget_symbols_without_license_still_require_the_exact_version_and_source_link(self) -> None:
        self.nuget()
        archive = self.directory / f"ConvoHop.{VERSION}.snupkg"
        files = ARTIFACTS.zip_files(archive.read_bytes())
        self.assertNotIn(b"<license", files["ConvoHop.nuspec"])
        ARTIFACTS.inspect_nuget(self.directory, VERSION, SHA)
        original = files["ConvoHop.nuspec"]
        files["ConvoHop.nuspec"] = original.replace(
            f"<version>{VERSION}</version>".encode(), b"<version>0.2.0</version>"
        )
        archive.write_bytes(zipped(files))
        with self.assertRaisesRegex(ValueError, "snupkg version"):
            ARTIFACTS.inspect_nuget(self.directory, VERSION, SHA)
        files["ConvoHop.nuspec"] = original
        files["lib/net10.0/ConvoHop.pdb"] = b"wrong Source Link"
        archive.write_bytes(zipped(files))
        with self.assertRaisesRegex(ValueError, "Source Link"):
            ARTIFACTS.inspect_nuget(self.directory, VERSION, SHA)

    def test_flutter_bootstrap_archive_is_a_real_package(self) -> None:
        files = {
            "pubspec.yaml": f"name: convohop\nversion: {VERSION}\npublish_to: https://pub.dev\n".encode(),
            "lib/convohop.dart": b"library;",
            "lib/src/version.dart": f"const convoHopPackageVersion = '{VERSION}';\n".encode(),
            "README.md": b"SDK",
            "LICENSE": b"Apache-2.0",
            "NOTICE": b"ConvoHop",
            "CHANGELOG.md": b"# Changelog",
        }
        archive = self.directory / f"convohop-{VERSION}.tar.gz"
        archive.write_bytes(tarred(files))
        ARTIFACTS.inspect_pubdev(self.directory, VERSION)
        files["lib/src/version.dart"] = b"const convoHopPackageVersion = '0.0.0';\n"
        archive.write_bytes(tarred(files))
        with self.assertRaisesRegex(ValueError, "library version"):
            ARTIFACTS.inspect_pubdev(self.directory, VERSION)
        files["lib/src/version.dart"] = f"const convoHopPackageVersion = '{VERSION}';\n".encode()
        files["pubspec.yaml"] = files["pubspec.yaml"].replace(b"https://pub.dev", b"none")
        archive.write_bytes(tarred(files))
        with self.assertRaisesRegex(ValueError, "publish_to"):
            ARTIFACTS.inspect_pubdev(self.directory, VERSION)

    def test_archives_reject_traversal_and_links(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsafe archive path"):
            ARTIFACTS.tar_files(tarred({"../outside": b"no"}))
        with self.assertRaisesRegex(ValueError, "Unsafe archive path"):
            ARTIFACTS.zip_files(zipped({"/outside": b"no"}))
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode="w:gz") as archive:
            entry = tarfile.TarInfo("link")
            entry.type = tarfile.SYMTYPE
            entry.linkname = "/outside"
            archive.addfile(entry)
        with self.assertRaisesRegex(ValueError, "links"):
            ARTIFACTS.tar_files(stream.getvalue())

    def test_both_maven_bundles_include_metadata_docs_sources_and_all_checksums(self) -> None:
        for sdk in ARTIFACTS.MAVEN_MODULES:
            with self.subTest(sdk=sdk):
                self.maven(sdk)
                out = self.directory / f"{sdk}-unsigned.tar.gz"
                ARTIFACTS.bundle_maven(self.directory, sdk, VERSION, out)
                files = ARTIFACTS.tar_files(out.read_bytes())
                ARTIFACTS.inspect_maven(files, sdk, VERSION)
                self.assertFalse(any(name.endswith(".asc") for name in files))
                first = next(name for name in files if name.endswith(".pom"))
                files[first] += b"\nchanged"
                with self.assertRaisesRegex(ValueError, "checksum"):
                    ARTIFACTS.inspect_maven(files, sdk, VERSION)

    def test_maven_does_not_disguise_missing_docs_or_wrong_namespace(self) -> None:
        self.maven("jvm")
        first = next(iter(ARTIFACTS.maven_artifacts("jvm", VERSION)))
        base = self.directory / first.removesuffix(".jar")
        Path(f"{base}-javadoc.jar").unlink()
        with self.assertRaisesRegex(ValueError, "Missing or unsafe Maven artifact"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, self.directory / "missing-unsigned.tar.gz")
        self.maven("jvm")
        pom_file = Path(f"{base}.pom")
        pom_file.write_bytes(pom_file.read_bytes().replace(b"com.convohop", b"io.github.convohop"))
        with self.assertRaisesRegex(ValueError, "groupId"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, self.directory / "wrong-unsigned.tar.gz")

    def test_signed_bundles_require_every_signature_and_gpg_verification(self) -> None:
        self.maven("jvm")
        out = self.directory / "release-signed.tar.gz"
        with self.assertRaisesRegex(ValueError, "Missing Maven signature"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, out, signed=True)
        self.maven("jvm", signatures=True)
        with (
            patch.object(ARTIFACTS.shutil, "which", return_value="/fixture/gpg"),
            patch.object(ARTIFACTS.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)),
            self.assertRaisesRegex(ValueError, "GPG could not verify"),
        ):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, out, signed=True)
        with (
            patch.object(ARTIFACTS.shutil, "which", return_value="/fixture/gpg"),
            patch.object(ARTIFACTS.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as verify,
        ):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, out, signed=True)
            self.assertEqual(verify.call_count, len(ARTIFACTS.maven_artifacts("jvm", VERSION)))
        ARTIFACTS.inspect_maven(ARTIFACTS.tar_files(out.read_bytes()), "jvm", VERSION, signed=True)
        with self.assertRaisesRegex(ValueError, "discard their signatures"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, self.directory / "wrong-unsigned.tar.gz")

    def test_xml_rejects_dtds_entities_and_oversized_metadata(self) -> None:
        for data in (
            b'<!DOCTYPE project [<!ENTITY x "expanded">]><project>&x;</project>',
            b'<!ENTITY x SYSTEM "file:///not-readable"><project/>',
            '<!DOCTYPE project [<!ENTITY x "expanded">]><project>&x;</project>'.encode("utf-16-le"),
        ):
            with self.assertRaisesRegex(ValueError, "DTDs and entities"):
                ARTIFACTS.parse_xml(data)
        with self.assertRaisesRegex(ValueError, "size limit"):
            ARTIFACTS.parse_xml(b" " * (1024 * 1024 + 1))

    def test_maven_rejects_snapshot_and_ambiguous_bundle_names(self) -> None:
        with self.assertRaisesRegex(ValueError, "stable version"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", "0.1.0-SNAPSHOT", self.directory / "release-unsigned.tar.gz")
        with self.assertRaisesRegex(ValueError, "explicitly signed or unsigned"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, self.directory / "release.tar.gz")

    def test_maven_rejects_unaligned_gradle_metadata(self) -> None:
        self.maven("jvm")
        name = next(name for name in ARTIFACTS.maven_artifacts("jvm", VERSION) if name.endswith(".module"))
        path = self.directory / name
        metadata = json.loads(path.read_bytes())
        metadata["variants"][0]["dependencies"] = [
            {
                "group": "com.convohop",
                "module": "convohop-server",
                "version": {"requires": "0.2.0"},
            }
        ]
        path.write_text(json.dumps(metadata))
        with self.assertRaisesRegex(ValueError, "unaligned module dependency"):
            ARTIFACTS.bundle_maven(self.directory, "jvm", VERSION, self.directory / "wrong-unsigned.tar.gz")


if __name__ == "__main__":
    unittest.main()

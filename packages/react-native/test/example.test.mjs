import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The example isn't a workspace: CI type-checks it against the repository's root node_modules, which hold this
// package's devDependencies (example/README.md). These tests keep the versions the example declares, and an app built
// from it installs, in step with the ones that check covers.
const packageDir = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(packageDir, "package.json"));
const read = path => JSON.parse(readFileSync(path, "utf8"));
const pkg = read(join(packageDir, "package.json"));
const example = read(join(packageDir, "example", "package.json"));
const declared = { ...example.dependencies, ...example.devDependencies };
// Not every package exports its package.json, so look for its folder where Node would.
const folder = name => require.resolve.paths(name).map(dir => join(dir, name))
  .find(dir => existsSync(join(dir, "package.json")));
const installed = name => read(join(folder(name), "package.json")).version;

/** Whether `range`, an exact version or a caret range, admits `version`, as npm decides. */
function admits(range, version) {
  const match = /^(\^?)(\d+)\.(\d+)\.(\d+)$/.exec(range);
  assert.ok(match, `${range} is an exact version or a caret range`);
  const floor = match.slice(2).map(Number), actual = version.split(".").map(Number);
  // A caret range fixes the parts up to and including the floor's first nonzero one; an exact version fixes all.
  const fixed = match[1] === "" ? 3 : floor[0] > 0 ? 1 : floor[1] > 0 ? 2 : 3;
  for (let index = 0; index < 3; index++) {
    if (actual[index] !== floor[index]) return index >= fixed && actual[index] > floor[index];
  }
  return true;
}

test("admits() reads exact versions and caret ranges as npm does", () => {
  for (const [range, version, expected] of [
    ["19.2.3", "19.2.3", true], ["19.2.3", "19.2.4", false], ["^19.2.0", "19.3.0", true], ["^19.2.0", "19.2.0", true],
    ["^19.2.0", "19.1.9", false], ["^19.2.0", "20.0.0", false], ["^7.0.2", "7.0.1", false], ["^7.0.2", "7.1.0", true],
    ["^0.87.1", "0.87.4", true], ["^0.87.1", "0.88.0", false], ["^0.0.3", "0.0.4", false], ["^0.0.3", "0.0.3", true],
  ]) assert.equal(admits(range, version), expected, `${range} admits ${version}`);
  assert.throws(() => admits(">=0.76", "0.87.1"), /exact version or a caret range/);
});

test("the example's versions admit the ones its type check runs against", () => {
  // react is the exception: the next test pins it to React Native's renderer.
  const shared = Object.keys(declared).filter(name => name !== "react" && name in pkg.devDependencies).sort();
  assert.deepEqual(shared, ["@livekit/react-native", "@livekit/react-native-webrtc",
    "@react-native-async-storage/async-storage", "@react-native-community/netinfo", "@types/react", "livekit-client",
    "react-native", "react-native-safe-area-context", "typescript"]);
  for (const name of shared) {
    assert.ok(admits(declared[name], installed(name)), `${name}: the example declares ${declared[name]}, but the ` +
      `type check runs against ${installed(name)}. Change the example with this package's devDependencies.`);
  }
});

test("the example pins react to the version React Native's renderer was built with", () => {
  const renderer = readFileSync(join(folder("react-native"), "Libraries/Renderer/implementations/ReactFabric-prod.js"),
    "utf8");
  const built = /version: "([^"]+)",\s*rendererPackageName: "react-native-renderer"/.exec(renderer);
  assert.ok(built, "React Native's renderer names the React version it was built with");
  assert.equal(declared.react, built[1]);
});

test("React Native's own packages share its version", () => {
  for (const [label, dependencies] of [["the package", pkg.devDependencies], ["the example", declared]]) {
    const own = Object.keys(dependencies).filter(name => name.startsWith("@react-native/"));
    assert.ok(own.length > 0, `${label} has some`);
    for (const name of own) assert.equal(dependencies[name], dependencies["react-native"], `${label}: ${name}`);
  }
});

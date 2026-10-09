import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { fakeSpecs } from "./support/native.mjs";

// React Native's Codegen reads the specs when an app builds. These tests run the same parser and generators, so a
// spec Codegen rejects, or one the test fakes don't match, fails here instead of in an app's native build.
const packageDir = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(packageDir, "package.json"));
const { TypeScriptParser } = require("@react-native/codegen/lib/parsers/typescript/parser.js");
const RNCodegen = require("@react-native/codegen/lib/generators/RNCodegen.js");
const { codegenConfig } = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
const specsDir = join(packageDir, codegenConfig.jsSrcsDir);

function parseSpecs() {
  const parser = new TypeScriptParser(), modules = {};
  for (const file of readdirSync(specsDir).sort()) {
    const parsed = Object.entries(parser.parseFile(join(specsDir, file)).modules);
    assert.equal(parsed.length, 1, `${file} declares one module`);
    const [[name, module]] = parsed;
    assert.equal(file, `Native${module.moduleName}.ts`);
    modules[name] = module;
  }
  return modules;
}

function filesUnder(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile())
    .map(entry => relative(dir, join(entry.parentPath, entry.name))).sort();
}

// The selectors of an Objective-C protocol's or implementation's instance methods.
function selectors(text) {
  return [...text.matchAll(/^- \([^)]*\)([^;{]*)/gm)].map(([, declaration]) => {
    const keywords = [...declaration.replace(/\([^)]*\)/g, " ").matchAll(/(\w+)\s*:/g)].map(([, keyword]) => keyword);
    return keywords.length === 0 ? declaration.trim() : `${keywords.join(":")}:`;
  });
}

test("Codegen builds the package's TurboModules from src/specs", () => {
  assert.deepEqual(codegenConfig, { name: "RNConvoHopSpec", type: "modules", jsSrcsDir: "src/specs",
    android: { javaPackageName: "com.convohop.reactnative" },
    ios: { modulesProvider: { ConvoHopCalls: "ConvoHopCallsModule", ConvoHopPlatform: "ConvoHopPlatformModule",
      ConvoHopPush: "ConvoHopPushModule" } } });
});

test("each spec parses as one TurboModule whose methods and events the test fakes implement", () => {
  const modules = Object.values(parseSpecs());
  assert.deepEqual(modules.map(module => module.moduleName).sort(), Object.keys(fakeSpecs).sort());
  for (const { type, moduleName, spec } of modules) {
    assert.equal(type, "NativeModule");
    assert.deepEqual(spec.methods.map(method => method.name).sort(), [...fakeSpecs[moduleName].methods].sort(), `${moduleName} methods`);
    assert.deepEqual(spec.eventEmitters.map(event => event.name).sort(), [...fakeSpecs[moduleName].events].sort(), `${moduleName} events`);
  }
});

test("Codegen generates the Android, iOS and C++ bindings for every spec", t => {
  const outputDirectory = mkdtempSync(join(tmpdir(), "convohop-codegen-"));
  t.after(() => rmSync(outputDirectory, { recursive: true, force: true }));
  const generated = RNCodegen.generate({ libraryName: codegenConfig.name, schema: { modules: parseSpecs() }, outputDirectory,
    packageName: codegenConfig.android.javaPackageName, assumeNonnull: false },
  { generators: ["modulesAndroid", "modulesCxx", "modulesIOS"], test: false });
  assert.equal(generated, true);
  const files = filesUnder(outputDirectory);
  for (const name of Object.keys(fakeSpecs)) {
    assert.ok(files.includes(join("java", "com", "convohop", "reactnative", `Native${name}Spec.java`)), `${name} Android spec`);
    assert.ok(files.some(file => readFileSync(join(outputDirectory, file), "utf8").includes(`class JSI_EXPORT Native${name}CxxSpec`)),
      `${name} C++ spec`);
  }
  assert.ok(files.includes(join(codegenConfig.name, `${codegenConfig.name}.h`)), "iOS spec header");
  assert.ok(files.includes(join("jni", `${codegenConfig.name}-generated.cpp`)), "Android JNI bindings");
});

test("each iOS module provider implements every method of its generated protocol", t => {
  const outputDirectory = mkdtempSync(join(tmpdir(), "convohop-codegen-ios-"));
  t.after(() => rmSync(outputDirectory, { recursive: true, force: true }));
  assert.equal(RNCodegen.generate({ libraryName: codegenConfig.name, schema: { modules: parseSpecs() }, outputDirectory,
    assumeNonnull: false }, { generators: ["modulesIOS"], test: false }), true);
  const header = readFileSync(join(outputDirectory, codegenConfig.name, `${codegenConfig.name}.h`), "utf8");
  assert.deepEqual(Object.keys(codegenConfig.ios.modulesProvider).sort(), Object.keys(fakeSpecs).sort());
  for (const [name, className] of Object.entries(codegenConfig.ios.modulesProvider)) {
    const source = readFileSync(join(packageDir, "ios", `${className}.mm`), "utf8");
    assert.match(source, new RegExp(`@interface ${className}\\s*:\\s*Native${name}SpecBase\\s*<Native${name}Spec\\b`));
    assert.match(source, new RegExp(`\\+ \\(NSString \\*\\)moduleName\\s*\\{\\s*return @"${name}";`));
    const protocol = header.match(new RegExp(`@protocol Native${name}Spec <[^>]*>([\\s\\S]*?)@end`));
    assert.ok(protocol, `${name} protocol`);
    const required = selectors(protocol[1]);
    assert.ok(required.length > 0, `${name} selectors`);
    const implemented = new Set(selectors(source.slice(source.indexOf("@implementation"))));
    assert.deepEqual(required.filter(selector => !implemented.has(selector)), [], `${className} implements Native${name}Spec`);
    assert.ok(implemented.has("getTurboModule:"), `${className} creates its JSI module`);
  }
});

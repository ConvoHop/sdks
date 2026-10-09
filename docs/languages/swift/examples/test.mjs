// Tests the examples against the conformance mock on macOS, then builds them for iOS, where the CallKit samples
// compile. The docs pipeline runs commands from the repository root, so each step runs in the examples directory.
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL(".", import.meta.url));
const derivedData = ".build/DerivedData";
const steps = [
  ["swift", ["test", "--jobs", "2", "--force-resolved-versions", "--disable-keychain"]],
  [
    "xcodebuild",
    [
      "build",
      "-quiet",
      "-scheme",
      "Examples",
      "-destination",
      "generic/platform=iOS",
      "-derivedDataPath",
      derivedData,
      "-jobs",
      "2",
      "CODE_SIGNING_ALLOWED=NO",
    ],
  ],
];

try {
  for (const [command, args] of steps) {
    console.error(`> ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, {
      cwd,
      stdio: "inherit",
      // The tests start the mock with this Node.js.
      env: { ...process.env, CONVOHOP_NODE: process.execPath },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  }
} finally {
  // An iOS build's derived data takes gigabytes.
  rmSync(`${cwd}/${derivedData}`, { recursive: true, force: true });
}

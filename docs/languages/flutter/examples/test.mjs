// Analyzes the examples, checks their formatting and runs their tests against the conformance mock. The docs pipeline
// runs commands from the repository root, and flutter has no option to work in another directory.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL(".", import.meta.url));
const steps = [
  ["flutter", ["analyze", "--fatal-infos"]],
  ["dart", ["format", "--output=none", "--set-exit-if-changed", "lib", "test"]],
  ["flutter", ["test", "--concurrency=2"]],
];

for (const [command, args] of steps) {
  console.error(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    // The tests start the mock with this Node.js.
    env: { ...process.env, CONVOHOP_NODE: process.execPath },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

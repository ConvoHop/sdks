// Run reports: JUnit XML for CI test views, summary.json for tooling and summary.md for humans.
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// XML 1.0 forbids most control characters even when escaped.
const INVALID_XML = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;
const clean = text => String(text).replace(INVALID_XML, "\uFFFD");
const attribute = text => clean(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll("\"", "&quot;").replaceAll("\n", "&#10;").replaceAll("\r", "&#13;").replaceAll("\t", "&#9;");
const cdata = text => `<![CDATA[${clean(text).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
const seconds = ms => (ms / 1000).toFixed(3);

export function totals(scenarios) {
  const count = status => scenarios.filter(scenario => scenario.status === status).length;
  return { scenarios: scenarios.length, passed: count("passed"), failed: count("failed"), skipped: count("skipped") };
}

export function failureText(failure) {
  return failure.step === null ? failure.message : `step ${failure.step} (${failure.do}): ${failure.message}`;
}

export function junit(summary) {
  const all = summary.suites.flatMap(suite => suite.scenarios), sum = totals(all);
  const properties = [["driver", `${summary.driver.name} ${summary.driver.version}`], ["driver.language", summary.driver.language],
    ["driver.features", summary.driver.features.join(",")], ["target", `${summary.target.kind}:${summary.target.name}`],
    ["target.capabilities", summary.target.capabilities.join(",")], ["protocolVersion", String(summary.protocolVersion)]];
  const lines = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    `<testsuites name="ConvoHop conformance" tests="${sum.scenarios}" failures="${sum.failed}" errors="0" skipped="${sum.skipped}" time="${seconds(summary.durationMs)}">`];
  for (const suite of summary.suites) {
    const counts = totals(suite.scenarios);
    lines.push(`  <testsuite name="${attribute(suite.suite)}" tests="${counts.scenarios}" failures="${counts.failed}" errors="0" ` +
      `skipped="${counts.skipped}" time="${seconds(suite.durationMs)}" timestamp="${attribute(summary.startedAt)}">`);
    lines.push("    <properties>");
    for (const [name, value] of properties) lines.push(`      <property name="${attribute(name)}" value="${attribute(value)}"/>`);
    lines.push("    </properties>");
    for (const scenario of suite.scenarios) {
      const open = `    <testcase classname="conformance.${attribute(suite.suite)}" name="${attribute(scenario.id)}" time="${seconds(scenario.durationMs)}"`;
      if (scenario.status === "passed") { lines.push(`${open}/>`); continue; }
      lines.push(`${open}>`);
      if (scenario.status === "skipped") lines.push(`      <skipped message="${attribute(scenario.reason)}"/>`);
      else {
        const text = failureText(scenario.failure);
        lines.push(`      <failure message="${attribute(text.split("\n")[0].slice(0, 500))}" type="${attribute(scenario.failure.do ?? "scenario")}">` +
          `${cdata(`${scenario.title}\n${text}`)}</failure>`);
      }
      lines.push("    </testcase>");
    }
    lines.push("  </testsuite>");
  }
  lines.push("</testsuites>", "");
  return lines.join("\n");
}

const cell = text => String(text).replaceAll("|", "\\|").replaceAll("\n", " ").slice(0, 300);

export function markdown(summary) {
  const all = summary.suites.flatMap(suite => suite.scenarios), sum = totals(all);
  const lines = ["## ConvoHop conformance", "",
    `Driver **${summary.driver.name} ${summary.driver.version}** (${summary.driver.language}) against target ` +
    `**${summary.target.kind}:${summary.target.name}**, protocol v${summary.protocolVersion}.`, "",
    `**${sum.passed} passed, ${sum.failed} failed, ${sum.skipped} skipped** of ${sum.scenarios} scenarios in ${seconds(summary.durationMs)} s.`, "",
    "| Suite | Passed | Failed | Skipped |", "| --- | ---: | ---: | ---: |"];
  for (const suite of summary.suites) {
    const counts = totals(suite.scenarios);
    lines.push(`| ${cell(suite.suite)} | ${counts.passed} | ${counts.failed} | ${counts.skipped} |`);
  }
  const failed = all.filter(scenario => scenario.status === "failed");
  if (failed.length) {
    lines.push("", "### Failures", "", "| Scenario | Failure |", "| --- | --- |");
    for (const scenario of failed) lines.push(`| \`${cell(scenario.id)}\` | ${cell(failureText(scenario.failure))} |`);
  }
  const skipped = all.filter(scenario => scenario.status === "skipped");
  if (skipped.length) {
    lines.push("", "### Skipped", "", "| Scenario | Reason |", "| --- | --- |");
    for (const scenario of skipped) lines.push(`| \`${cell(scenario.id)}\` | ${cell(scenario.reason)} |`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function writeReports(directory, summary, { stepSummary = process.env.GITHUB_STEP_SUMMARY } = {}) {
  await mkdir(directory, { recursive: true });
  const files = { junit: join(directory, "junit.xml"), summary: join(directory, "summary.json"), markdown: join(directory, "summary.md") };
  const text = markdown(summary);
  await Promise.all([writeFile(files.junit, junit(summary)), writeFile(files.summary, `${JSON.stringify(summary, null, 2)}\n`),
    writeFile(files.markdown, text)]);
  if (stepSummary) await appendFile(stepSummary, text);
  return files;
}

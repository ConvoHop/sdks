/**
 * Renders docs/site from validated inputs; generate.mjs loads them. Every
 * page follows markdown.mjs's MDX-safe subset and is linted, with its links
 * checked, before anything is written. See docs/docs-pipeline.md for the layout.
 */
import { posix } from "node:path";
import { formatJson } from "../../sdkgen/lib/json.mjs";
import { codeUnitCompare } from "../../sdkgen/lib/naming.mjs";
import { formatReference, schemaReference, validate } from "./languages.mjs";
import {
  boldHeadings,
  checkLinks,
  codeBlock,
  codeSpan,
  escapeMdx,
  headingSlug,
  parsePage,
  rebaseLinks,
  tableCell,
  toPlainText,
} from "./markdown.mjs";

/** Symbol kinds in reference page order, with their section titles. */
export const SYMBOL_GROUPS = [
  ["class", "Classes"],
  ["struct", "Structs"],
  ["interface", "Interfaces"],
  ["enum", "Enums"],
  ["type", "Types"],
  ["function", "Functions"],
  ["constant", "Constants"],
  ["namespace", "Namespaces"],
];

const MEMBER_LABELS = {
  constructor: "constructor",
  method: "method",
  property: "property",
  case: "case",
  call: "call signature",
  index: "index signature",
};

/** Site-relative paths of everything docgen writes. */
export const sitePaths = {
  readme: "README.md",
  home: "index.md",
  manifest: "manifest.json",
  llms: "llms.txt",
  llmsFull: "llms-full.txt",
  operationIndex: "operations/index.md",
  operationData: "operations/index.json",
  operation: operation => `operations/${operation.plane}/${operation.field}.md`,
  language: id => `${id}/index.md`,
  languageLlmsFull: id => `${id}/llms-full.txt`,
  quickstart: (id, topic) => `${id}/quickstarts/${topic}.md`,
  referenceIndex: id => `${id}/reference/index.md`,
  reference: (id, slug) => `${id}/reference/${slug}.md`,
  referenceData: (id, slug) => `${id}/reference/${slug}.json`,
  coverage: id => `${id}/reference/operations.md`,
};

function link(from, to, anchor) {
  const relative = posix.relative(posix.dirname(from), to);
  return anchor ? `${relative}#${anchor}` : relative;
}

/** "a", "a and b", "a, b and c". */
function series(items) {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1);
}

function sentence(markdown) {
  return markdown.replace(/[.\s]+$/, "");
}

/**
 * Extracted Markdown (docs and deprecation messages) as reference pages and
 * their JSON show it: MDX-safe, with headings as bold paragraphs, so headings
 * such as ## Examples can repeat across symbols without breaking the page.
 */
function embed(markdown) {
  return boldHeadings(escapeMdx(markdown));
}

function canSend(language, operation) {
  return operation.layer === "both" || language.config.packages.some(pkg => pkg.layer === operation.layer);
}

/**
 * Renders the site. `languages` are `{ id, directory, config, surface,
 * operations, overview, quickstarts }`, where `operations` comes from
 * loadOperationMap, `overview` is `{ markdown, source }` and `quickstarts`
 * maps topic IDs to `{ markdown, source }`, with includes already expanded.
 * `snippets` maps operation IDs to docs/snippets Markdown. Returns
 * `{ files: [{ path, contents }], problems }` with repository-relative paths.
 */
export function renderSite({ root, config, ir, snippets, languages }) {
  const problems = [];
  const output = config.outputDirectory;
  const topics = new Map(config.topics.map(topic => [topic.id, topic]));
  /** Pages in reading order: `{ path, kind, markdown, source?, language?, topic?, package?, operation? }`. */
  const pages = [];
  /** JSON files: `{ path, value, schema }`. */
  const data = [];
  /** `<language>\0<reference>` -> `{ page, anchor, display, static }`. */
  const headings = new Map();
  /** `<language>\0<reference>` -> operations it sends, in IR order. */
  const sends = new Map();

  for (const language of languages) {
    for (const operation of ir.operations) {
      for (const entry of language.operations.get(operation.id) ?? []) {
        const key = `${language.id}\0${formatReference(entry.package.name, entry.symbol, entry.members)}`;
        if (!sends.has(key)) sends.set(key, []);
        sends.get(key).push(operation);
      }
    }
  }

  const memberLinks = (language, operation, from) =>
    (language.operations.get(operation.id) ?? [])
      .map(entry => {
        const target = headings.get(`${language.id}\0${formatReference(entry.package.name, entry.symbol, entry.members)}`);
        return `[${codeSpan(target.display)}${target.static ? " (static)" : ""}](${link(from, target.page, target.anchor)})`;
      })
      .join(", ");

  // Package reference pages, which also fill `headings` for the pages that link to members.
  for (const language of languages) {
    for (const pkg of language.config.packages) {
      const page = sitePaths.reference(language.id, pkg.slug);
      const dataPath = sitePaths.referenceData(language.id, pkg.slug);
      const surfacePackage = language.surface.packages.find(candidate => candidate.name === pkg.name);
      const lines = [
        `# ${codeSpan(pkg.name)}`,
        "",
        escapeMdx(pkg.summary),
        "",
        `**Layer:** ${capitalize(pkg.layer)}. **Runtime:** ${sentence(escapeMdx(pkg.runtime))}. **Source:** ${codeSpan(pkg.source)}.`,
      ];
      const item = (node, heading, level, reference, display) => {
        const key = `${language.id}\0${reference}`;
        const anchor = headingSlug(heading);
        headings.set(key, { page, anchor, display, static: Boolean(node.static) });
        const operations = sends.get(key) ?? [];
        const docs = embed(node.docs);
        const deprecated = node.deprecated === undefined ? undefined : embed(node.deprecated);
        lines.push("", `${"#".repeat(level)} ${heading}`);
        if (deprecated !== undefined) lines.push("", deprecated ? `**Deprecated:** ${deprecated}` : "**Deprecated.**");
        lines.push("", codeBlock(node.signatures.join("\n"), language.config.codeFence));
        if (docs) lines.push("", docs);
        const notes = [];
        if (node.origin) notes.push(`Re-exported from ${codeSpan(node.origin)}.`);
        if (node.inherited) notes.push(`Inherited from ${codeSpan(node.inherited)}.`);
        if (operations.length) {
          notes.push(`Sends ${series(operations.map(operation => `[${codeSpan(operation.id)}](${link(page, sitePaths.operation(operation))})`))}.`);
        }
        if (notes.length) lines.push("", notes.join(" "));
        const entry = { name: node.name, kind: node.kind, ref: reference, anchor, signatures: node.signatures, docs };
        if (deprecated !== undefined) entry.deprecated = deprecated;
        if (node.static) entry.static = true;
        if (node.origin) entry.origin = node.origin;
        if (node.inherited) entry.inherited = node.inherited;
        if (operations.length) entry.operations = operations.map(operation => ({ id: operation.id, page: link(dataPath, sitePaths.operation(operation)) }));
        return entry;
      };
      const members = (symbol, nodes, chain, parent, level) =>
        nodes.map(member => {
          const path = [...chain, member];
          const display =
            member.kind === "constructor" ? parent : /^[([]/.test(member.name) ? `${parent}${member.name}` : `${parent}.${member.name}`;
          const heading = `${codeSpan(display)} ${member.static ? "static " : ""}${MEMBER_LABELS[member.kind]}`;
          const entry = item(member, heading, Math.min(6, level), formatReference(pkg.name, symbol, path), display);
          if (member.members) entry.members = members(symbol, member.members, path, display, level + 1);
          return entry;
        });
      const symbols = [];
      for (const [kind, title] of SYMBOL_GROUPS) {
        const group = surfacePackage.symbols.filter(symbol => symbol.kind === kind).sort((a, b) => codeUnitCompare(a.name, b.name));
        if (!group.length) continue;
        lines.push("", `## ${title}`);
        for (const symbol of group) {
          const entry = item(symbol, `${codeSpan(symbol.name)} ${symbol.kind}`, 3, formatReference(pkg.name, symbol), symbol.name);
          if (symbol.members) entry.members = members(symbol, symbol.members, [], symbol.name, 4);
          symbols.push(entry);
        }
      }
      pages.push({ path: page, kind: "reference", markdown: lines.join("\n"), language: language.id, package: pkg.name });
      data.push({
        path: dataPath,
        schema: "reference",
        value: { language: language.id, package: pkg.name, layer: pkg.layer, page: posix.basename(page), symbols },
      });
    }
  }

  // Operation coverage per language.
  for (const language of languages) {
    const page = sitePaths.coverage(language.id);
    const name = language.config.name;
    const available = ir.operations.filter(operation => canSend(language, operation));
    const wrapped = available.filter(operation => language.operations.get(operation.id)?.length);
    const lines = [
      `# ${name} operation coverage`,
      "",
      `The ${name} SDK members that send each API operation. ${wrapped.length} of the ${available.length} operations that ${name} packages can send ${wrapped.length === 1 ? "has" : "have"} a method.`,
    ];
    for (const plane of ir.planes) {
      const operations = available.filter(operation => operation.plane === plane.name);
      if (!operations.length) continue;
      lines.push("", `## ${capitalize(plane.name)}`, "", escapeMdx(plane.summary), "", "| Operation | Layer | Members |", "| --- | --- | --- |");
      for (const operation of operations) {
        const members = memberLinks(language, operation, page) || "Not wrapped by a method";
        lines.push(`| [${codeSpan(operation.id)}](${link(page, sitePaths.operation(operation))}) | ${operation.layer} | ${tableCell(members)} |`);
      }
    }
    pages.push({ path: page, kind: "coverage", markdown: lines.join("\n"), language: language.id });
  }

  // Language home, quickstart and reference index pages, placed before each language's reference pages.
  const languagePages = [];
  for (const language of languages) {
    const { id } = language;
    const home = sitePaths.language(id);
    const lines = [language.overview.markdown.replace(/\n+$/, ""), "", "## Packages", "", "| Package | Layer | Runtime | Summary |", "| --- | --- | --- | --- |"];
    for (const pkg of language.config.packages) {
      lines.push(
        `| [${codeSpan(pkg.name)}](${link(home, sitePaths.reference(id, pkg.slug))}) | ${capitalize(pkg.layer)} | ${tableCell(escapeMdx(pkg.runtime))} | ${tableCell(escapeMdx(pkg.summary))} |`,
      );
    }
    const quickstarts = config.topics.filter(topic => language.config.quickstarts.includes(topic.id));
    if (quickstarts.length) {
      lines.push("", "## Quickstarts", "", "| Quickstart | Summary |", "| --- | --- |");
      for (const topic of quickstarts) {
        lines.push(`| [${escapeMdx(topic.title)}](${link(home, sitePaths.quickstart(id, topic.id))}) | ${tableCell(escapeMdx(topic.summary))} |`);
      }
    }
    lines.push(
      "",
      "## Reference",
      "",
      `- [Package reference](${link(home, sitePaths.referenceIndex(id))}): every public declaration, by package.`,
      `- [Operation coverage](${link(home, sitePaths.coverage(id))}): the members that send each API operation.`,
      `- [${language.config.name} in one file](${link(home, sitePaths.languageLlmsFull(id))}): every ${language.config.name} page, for LLMs and agents.`,
    );
    languagePages.push({ path: home, kind: "language", markdown: lines.join("\n"), source: language.overview.source, language: id });
    for (const topic of quickstarts) {
      const quickstart = language.quickstarts.get(topic.id);
      languagePages.push({
        path: sitePaths.quickstart(id, topic.id),
        kind: "quickstart",
        markdown: quickstart.markdown,
        source: quickstart.source,
        language: id,
        topic: topic.id,
      });
    }
    const index = sitePaths.referenceIndex(id);
    const reference = [
      `# ${language.config.name} reference`,
      "",
      `The public API of each ${language.config.name} package, generated from its declarations.`,
      "",
      "| Package | Layer | Summary |",
      "| --- | --- | --- |",
      ...language.config.packages.map(
        pkg => `| [${codeSpan(pkg.name)}](${link(index, sitePaths.reference(id, pkg.slug))}) | ${capitalize(pkg.layer)} | ${tableCell(escapeMdx(pkg.summary))} |`,
      ),
      "",
      `[Operation coverage](${link(index, sitePaths.coverage(id))}) lists the members that send each API operation.`,
    ];
    languagePages.push({ path: index, kind: "reference-index", markdown: reference.join("\n"), language: id });
  }

  // Operation pages.
  const operationPages = [];
  for (const operation of ir.operations) {
    const page = sitePaths.operation(operation);
    const snippet = snippets.get(operation.id);
    if (!/^## [^\n]+\n\n/.test(snippet)) {
      problems.push(`docs/snippets for ${operation.id} must start with an H2; run npm run generate:graphql`);
      continue;
    }
    const lines = [`# ${codeSpan(operation.id)}`, "", snippet.replace(/^## [^\n]+\n\n/, "").replace(/\n+$/, ""), "", "## SDK members", ""];
    const rows = languages
      .filter(language => canSend(language, operation))
      .map(language => `| [${language.config.name}](${link(page, sitePaths.coverage(language.id))}) | ${tableCell(memberLinks(language, operation, page) || "Not wrapped by a method")} |`);
    if (rows.length) lines.push("| Language | Members |", "| --- | --- |", ...rows);
    else lines.push("No SDK has a package that can send this operation.");
    operationPages.push({ path: page, kind: "operation", markdown: lines.join("\n"), operation: operation.id });
  }
  const operationIndex = [
    "# API operations",
    "",
    "Every operation in the ConvoHop GraphQL API, with its authorization, idempotency, input, result and errors, and the SDK members that send it.",
  ];
  for (const plane of ir.planes) {
    const operations = ir.operations.filter(operation => operation.plane === plane.name);
    if (!operations.length) continue;
    operationIndex.push("", `## ${capitalize(plane.name)}`, "", escapeMdx(plane.summary), "", "| Operation | Kind | Layer | Summary |", "| --- | --- | --- | --- |");
    for (const operation of operations) {
      operationIndex.push(
        `| [${codeSpan(operation.id)}](${link(sitePaths.operationIndex, sitePaths.operation(operation))}) | ${operation.kind} | ${operation.layer} | ${tableCell(escapeMdx(operation.summary))} |`,
      );
    }
  }
  data.push({
    path: sitePaths.operationData,
    schema: "operation-index",
    value: {
      operations: ir.operations.map(operation => ({
        id: operation.id,
        plane: operation.plane,
        kind: operation.kind,
        field: operation.field,
        operationName: operation.operationName,
        layer: operation.layer,
        summary: operation.summary,
        page: link(sitePaths.operationData, sitePaths.operation(operation)),
        languages: Object.fromEntries(
          languages
            .filter(language => canSend(language, operation))
            .map(language => [
              language.id,
              (language.operations.get(operation.id) ?? []).map(entry => {
                const reference = formatReference(entry.package.name, entry.symbol, entry.members);
                const target = headings.get(`${language.id}\0${reference}`);
                return { ref: reference, package: entry.package.name, page: link(sitePaths.operationData, target.page, target.anchor) };
              }),
            ]),
        ),
      })),
    },
  });

  // Home page.
  const home = [
    `# ${escapeMdx(config.title)}`,
    "",
    escapeMdx(config.description),
    "",
    "## Languages",
    "",
    "| Language | Status | Packages |",
    "| --- | --- | --- |",
    ...languages.map(language => {
      const packages = language.config.packages.map(pkg => `[${codeSpan(pkg.name)}](${link(sitePaths.home, sitePaths.reference(language.id, pkg.slug))})`);
      return `| [${language.config.name}](${link(sitePaths.home, sitePaths.language(language.id))}) | ${capitalize(language.config.status)} | ${tableCell(packages.join(", "))} |`;
    }),
    "",
    "## Quickstarts",
    "",
    "| Topic | Summary | Languages |",
    "| --- | --- | --- |",
    ...config.topics.map(topic => {
      const available = languages
        .filter(language => language.config.quickstarts.includes(topic.id))
        .map(language => `[${language.config.name}](${link(sitePaths.home, sitePaths.quickstart(language.id, topic.id))})`);
      return `| ${escapeMdx(topic.title)} | ${tableCell(escapeMdx(topic.summary))} | ${tableCell(available.join(", ") || "None yet")} |`;
    }),
    "",
    "## API operations",
    "",
    `The [operation reference](${sitePaths.operationIndex}) documents each of the ${ir.operations.length} GraphQL operations and the SDK members that send it.`,
    "",
    "## For LLMs and agents",
    "",
    `[llms.txt](${sitePaths.llms}) lists these pages and [llms-full.txt](${sitePaths.llmsFull}) contains all of them. Each language also has one file with all of its pages, linked from its home page.`,
  ];

  const ordered = [{ path: sitePaths.home, kind: "home", markdown: home.join("\n") }];
  for (const language of languages) {
    ordered.push(...languagePages.filter(page => page.language === language.id && page.kind !== "reference-index"));
    ordered.push(...languagePages.filter(page => page.language === language.id && page.kind === "reference-index"));
    ordered.push(...pages.filter(page => page.language === language.id && page.kind === "reference"));
    ordered.push(...pages.filter(page => page.language === language.id && page.kind === "coverage"));
  }
  ordered.push({ path: sitePaths.operationIndex, kind: "operation-index", markdown: operationIndex.join("\n") }, ...operationPages);
  for (const page of ordered) page.markdown = `${page.markdown.replace(/\n+$/, "")}\n`;

  // Lint every page and check links against everything the site contains.
  const parsed = new Map();
  for (const page of ordered) {
    const result = parsePage(page.markdown);
    const from = page.source ? ` (from ${page.source})` : "";
    for (const error of result.errors) problems.push(`${output}/${page.path}:${error.line}: ${error.message}${from}`);
    parsed.set(page.path, result);
  }
  const files = [
    sitePaths.readme,
    sitePaths.manifest,
    sitePaths.llms,
    sitePaths.llmsFull,
    ...ordered.map(page => page.path),
    ...data.map(file => file.path),
    ...languages.map(language => sitePaths.languageLlmsFull(language.id)),
  ];
  for (const problem of checkLinks(parsed, files)) {
    const page = ordered.find(candidate => candidate.path === problem.path);
    problems.push(`${output}/${problem.path}:${problem.line}: ${problem.message}${page?.source ? ` (from ${page.source})` : ""}`);
  }

  const describe = page => {
    const entry = { path: page.path, kind: page.kind, title: parsed.get(page.path).title, description: parsed.get(page.path).description };
    for (const key of ["language", "topic", "package", "operation"]) if (page[key]) entry[key] = page[key];
    return entry;
  };
  data.push({
    path: sitePaths.manifest,
    schema: "manifest",
    value: {
      title: config.title,
      description: config.description,
      topics: config.topics.map(topic => ({ id: topic.id, title: topic.title, summary: topic.summary })),
      languages: languages.map(language => ({
        id: language.id,
        name: language.config.name,
        status: language.config.status,
        codeFence: language.config.codeFence,
        home: sitePaths.language(language.id),
        reference: sitePaths.referenceIndex(language.id),
        coverage: sitePaths.coverage(language.id),
        llmsFull: sitePaths.languageLlmsFull(language.id),
        packages: language.config.packages.map(pkg => ({
          name: pkg.name,
          slug: pkg.slug,
          layer: pkg.layer,
          summary: toPlainText(pkg.summary),
          runtime: toPlainText(pkg.runtime),
          source: pkg.source,
          reference: sitePaths.reference(language.id, pkg.slug),
          data: sitePaths.referenceData(language.id, pkg.slug),
        })),
        quickstarts: config.topics
          .filter(topic => language.config.quickstarts.includes(topic.id))
          .map(topic => ({ topic: topic.id, path: sitePaths.quickstart(language.id, topic.id) })),
      })),
      operations: { index: sitePaths.operationIndex, data: sitePaths.operationData },
      llms: { index: sitePaths.llms, full: sitePaths.llmsFull },
      pages: ordered.map(describe),
    },
  });

  // llms.txt (https://llmstxt.org) and the concatenated llms-full.txt files.
  const entry = page => `- [${parsed.get(page.path).title}](${page.path}): ${parsed.get(page.path).description}`;
  const llms = [`# ${config.title}`, "", `> ${config.description}`, ""];
  llms.push(
    "Pages are Markdown. Each language has an overview, quickstarts with tested code, a reference for each package and the SDK members that send each API operation. The API operation pages document the GraphQL API that every SDK wraps.",
  );
  for (const language of languages) {
    llms.push("", `## ${language.config.name}`, "", ...ordered.filter(page => page.language === language.id).map(entry));
  }
  llms.push("", "## API operations", "", ...ordered.filter(page => page.kind === "operation-index" || page.kind === "operation").map(entry));
  llms.push("", "## Optional", "", `- [Every page in one file](${sitePaths.llmsFull}): all of the pages above.`);
  for (const language of languages) {
    llms.push(`- [${language.config.name} in one file](${sitePaths.languageLlmsFull(language.id)}): every ${language.config.name} page.`);
  }
  const concatenate = (selected, file) => `${selected.map(page => rebaseLinks(page.markdown, page.path, file).replace(/\n+$/, "")).join("\n\n")}\n`;
  const text = [
    { path: sitePaths.readme, contents: README },
    { path: sitePaths.llms, contents: `${llms.join("\n")}\n` },
    { path: sitePaths.llmsFull, contents: concatenate(ordered, sitePaths.llmsFull) },
    ...languages.map(language => ({
      path: sitePaths.languageLlmsFull(language.id),
      contents: concatenate(
        ordered.filter(page => page.language === language.id),
        sitePaths.languageLlmsFull(language.id),
      ),
    })),
  ];

  for (const file of data) {
    file.value = { $schema: schemaReference(`${output}/${file.path}`, file.schema), ...file.value };
    validate(root, file.schema, file.value, `${output}/${file.path}`, problems);
  }
  const all = [
    ...text,
    ...ordered.map(page => ({ path: page.path, contents: page.markdown })),
    ...data.map(file => ({ path: file.path, contents: formatJson(file.value) })),
  ]
    .map(file => ({ path: `${output}/${file.path}`, contents: file.contents }))
    .sort((a, b) => codeUnitCompare(a.path, b.path));
  return { files: all, problems };
}

const README = `# Generated SDK documentation

Don't edit this directory. \`npm run generate:docs\` writes it from \`docs/languages/\`, \`schema/ir.json\` and \`docs/snippets/\`, and \`npm run check:docs\` fails when it's out of date.

[The docs pipeline](../docs-pipeline.md) describes the format and layout, how a website renders it and how to add a language.
`;

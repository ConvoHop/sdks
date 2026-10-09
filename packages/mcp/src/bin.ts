#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createConvoHopMcpServer, redact, serverOptionsFromEnvironment } from "./index.js";

// stdout carries the MCP protocol, so diagnostics go to stderr and never include a configured secret.
const secrets = [process.env.CONVOHOP_PORTAL_TOKEN, process.env.CONVOHOP_BACKEND_KEY]
  .filter((value): value is string => !!value);
try {
  const options = serverOptionsFromEnvironment(process.env);
  if (options.portalToken) secrets.push(options.portalToken);
  if (options.backendKey) secrets.push(options.backendKey);
  await createConvoHopMcpServer(options).connect(new StdioServerTransport());
} catch (error) {
  process.stderr.write(`convohop-mcp: ${String(redact(error instanceof Error ? error.message : "startup failed", secrets))}\n`);
  process.exitCode = 1;
}

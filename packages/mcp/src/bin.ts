#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createRelayMcpServer, redact, serverOptionsFromEnvironment } from "./index.js";

// stdout carries the MCP protocol, so diagnostics go to stderr and never include a configured secret.
const secrets = [process.env.RELAY_PORTAL_TOKEN, process.env.RELAY_BACKEND_KEY]
  .filter((value): value is string => !!value);
try {
  const options = serverOptionsFromEnvironment(process.env);
  if (options.portalToken) secrets.push(options.portalToken);
  if (options.backendKey) secrets.push(options.backendKey);
  await createRelayMcpServer(options).connect(new StdioServerTransport());
} catch (error) {
  process.stderr.write(`relay-mcp: ${String(redact(error instanceof Error ? error.message : "startup failed", secrets))}\n`);
  process.exitCode = 1;
}

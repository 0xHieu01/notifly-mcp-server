#!/usr/bin/env node

/**
 * Notifly MCP Server - Main Entry Point
 *
 * Standalone MCP Server using StdioServerTransport for AI-powered
 * Notifly SDK and API integration assistance.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./constants.js";
import { createMcpServer } from "./mcp-setup.js";

/**
 * Parse command-line arguments
 */
function parseArgs(): {
  help?: boolean;
  version?: boolean;
} {
  const args = process.argv.slice(2);
  const parsed: { help?: boolean; version?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--version" || arg === "-v") {
      parsed.version = true;
    }
  }

  return parsed;
}

/**
 * Display help message
 * NOTE: This writes to stderr to comply with MCP stdio specification
 * All help/version info goes to stderr, not stdout
 */
function displayHelp(): void {
  console.error(`
${MCP_SERVER_NAME} v${MCP_SERVER_VERSION}

Usage:
  notifly-mcp-server [options]
  npx notifly-mcp-server [options]

Options:
  --version, -v            Show version number
  --help, -h               Show this help message

Note: HTTP transport has been archived. Only stdio transport is available.

Examples:
  notifly-mcp-server

MCP Client Configuration:
  Add this to your MCP client configuration file:

  {
    "mcpServers": {
      "notifly": {
        "command": "npx",
        "args": ["-y", "notifly-mcp-server@latest"]
      }
    }
  }

Documentation:
  https://docs.notifly.tech/mcp-server
  https://github.com/notifly-tech/notifly-mcp-server
`);
}

/**
 * Main server function
 */
async function main() {
  // Parse arguments
  const args = parseArgs();

  // Handle --version
  if (args.version) {
    // Write to stderr - help/version should not interfere with MCP protocol
    console.error(`${MCP_SERVER_VERSION}`);
    process.exit(0);
  }

  // Handle --help
  if (args.help) {
    // Write to stderr - help/version should not interfere with MCP protocol
    displayHelp();
    process.exit(0);
  }

  // HTTP transport has been archived - only stdio transport is available
  // Check if user tried to use HTTP transport
  const useHttp = process.argv.includes("--http") || process.env.NOTIFLY_USE_HTTP === "true";

  if (useHttp) {
    console.error("[Error] HTTP transport has been archived and is not available in this build.");
    console.error(
      "Please use stdio transport (default) or check docs/archive/ for HTTP implementation."
    );
    process.exit(1);
  }

  // Create MCP server instance
  const server = createMcpServer();

  // Use stdio transport (default)
  // Per MCP stdio specification:
  // - stdout: ONLY valid MCP messages (JSON-RPC)
  // - stderr: Logging and diagnostics (optional)
  // - stdin: ONLY valid MCP messages (JSON-RPC)
  // - Messages delimited by newlines
  // - StdioServerTransport from SDK handles this automatically
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  // This is per MCP spec: stderr is for optional logging
  console.error(`${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} connected (stdio)`);
}

// Run the server
main().catch((error) => {
  // Fatal errors always go to stderr per MCP stdio specification
  console.error("[Fatal Error] Fatal error running MCP server:", error);
  process.exit(1);
});

# Notifly MCP Server

[![npm version](https://img.shields.io/npm/v/notifly-mcp-server.svg?logo=npm&label=npm)](https://www.npmjs.com/package/notifly-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/notifly-mcp-server.svg)](https://www.npmjs.com/package/notifly-mcp-server)
[![License](https://img.shields.io/npm/l/notifly-mcp-server.svg)](LICENSE)

Notifly MCP Server enables AI agents to deliver real‑time, trustworthy Notifly
documentation and SDK code examples for seamless integrations right inside any
MCP‑compatible client.

Implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/),
an open standard for enabling LLMs to interact with external tools and data.

Key capabilities:

- **Documentation Search** — Search Notifly docs (user guides, API reference,
  troubleshooting, best practices) with semantic ranking.
- **SDK Search** — Explore Notifly SDKs (iOS, Android, Flutter, React Native,
  JavaScript), Google Tag Manager templates, and implementation examples. Find
  symbols and retrieve production‑ready snippets.

## Installation

### Prerequisites

- Node.js >= 18

### Quick Start

Install Notifly MCP Server:

```bash
npm i -g notifly-mcp-server@latest
```

Create or update the `.mcp.json` at your project root (or the configuration
location your MCP client uses). Using `npx` ensures you always run the latest
published version:

#### Shared MCP configuration

Add Notifly with:

```json
{
  "mcpServers": {
    "notifly-mcp-server": {
      "command": "npx",
      "args": ["-y", "notifly-mcp-server@latest"]
    }
  }
}
```

Place this in your client’s MCP config (e.g., VS Code extension settings,
`~/.cursor/mcp.json`, or your Copilot client’s MCP settings).

#### Claude Code Configuration

Open your terminal to access the Claude Code CLI. Run the following command to
register the Notifly MCP Server.

```bash
claude mcp add --transport stdio notifly-mcp-server -- npx -y notifly-mcp-server@latest
```

#### Codex Configuration

Open `~/.codex/config.toml`. Add the following configuration and restart the
Codex CLI:

```toml
[mcp_servers]
  [mcp_servers.notifly]
  command = "npx"
  args = ["-y", "notifly-mcp-server@latest"]
```

Restart your MCP client to load the configuration.

## Command-Line Options

```bash
notifly-mcp-server [options]

--version, -v  Show version
--help, -h     Show help
```

## Usage

This package runs as an MCP server. Once configured in your MCP client, you can
invoke `search_docs` and `search_sdk` directly from the client’s tool palette or
assistant UI.

Notes:

- Network access is required to fetch documentation pages and SDK source files.
- Default timeouts and result counts can be tuned via environment variables:
  - `DOCS_SEARCH_MAX_RESULTS` (default: 3)
  - `SDK_SEARCH_MAX_RESULTS` (default: 3)

## Local Development

### Local Setup

```bash
# Clone and install
git clone https://github.com/notifly-tech/notifly-mcp-server.git
cd notifly-mcp-server
npm install

# Build
npm run build

# Run tests
npm test

# Development mode (watch for changes)
npm run dev
```

### MCP Client Configuration for Local Development

Before the package is published, configure your MCP client to use the local
build:

```json
{
  "mcpServers": {
    "notifly": {
      "command": "node",
      "args": ["/absolute/path/to/notifly-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/notifly-mcp-server` with your actual project path.

## Contributing

Contributions are welcome! Please read our guidelines in
[CONTRIBUTING.md](CONTRIBUTING.md) and open an issue to discuss significant
changes before submitting a PR.

## Support

If you encounter issues or have feature requests, please open an issue on
GitHub. For usage questions, check the docs and examples returned by the tools.

## License

MIT License with Custom Restrictions - see [LICENSE](LICENSE) for details.

## Resources

- [Documentation](https://docs.notifly.tech)
- [GitHub Issues](https://github.com/notifly-tech/notifly-mcp-server/issues)
- [Notifly Dashboard](https://console.notifly.tech/)

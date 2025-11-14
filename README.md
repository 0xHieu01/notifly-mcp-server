# Notifly MCP Server

Notifly MCP Server implements the
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/), an open-source
standard that allows large language models to interact with external tools and
data sources.

It provides two developer‑focused tools that keep you in flow while integrating
Notifly:

- **Documentation Search** — Search across Notifly documentation: user guides,
  API reference, troubleshooting, and best practices.
- **SDK Search** — Search across Notifly SDKs (iOS, Android, Flutter, React
  Native) and integration examples. Discover SDK symbols (types, methods,
  parameters) and retrieve production‑ready snippets.

## Installation

### Prerequisites

- Node.js >= 18

### Quick Start

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "notifly": {
      "command": "npx",
      "args": ["-y", "notifly-mcp-server@latest"]
    }
  }
}
```

Restart your MCP client to load the configuration.

## Available Tools

| Tool        | Command       | Description                                           |
| ----------- | ------------- | ----------------------------------------------------- |
| Docs Search | `search_docs` | Semantic search across official Notifly documentation |
| SDK Search  | `search_sdk`  | Search SDK source code and implementation examples    |

## Command-Line Options

```bash
notifly-mcp-server [options]

--version, -v  Show version
--help, -h     Show help
```

## Development

### Local Setup

```bash
# Clone and install
git clone https://github.com/notifly-tech/notifly-mcp-server.git
cd notifly-mcp-server
npm install

# dev:seed-llms
npm run dev:seed-llms

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

## License

MIT License with Custom Restrictions - see [LICENSE](LICENSE) for details.

## Resources

- [Documentation](https://docs.notifly.tech)
- [GitHub Issues](https://github.com/notifly-tech/notifly-mcp-server/issues)
- [Notifly Dashboard](https://console.notifly.tech/)

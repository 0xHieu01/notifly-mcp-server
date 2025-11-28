import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { MCP_TOOLS } from "./tools/index.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./constants.js";
import { formatErrorForUser, ConfigurationError, ValidationError } from "./errors.js";
import type { ServerContext } from "./types.js";

export function createMcpServer() {
  // Create server context
  const context: ServerContext = {};

  // Create MCP server instance
  const server = new Server(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Object.entries(MCP_TOOLS).map(([name, tool]) => {
      // Convert Zod schema to JSON Schema for MCP compliance
      const zodObject = z.object(tool.inputSchema);
      const jsonSchema = zodToJsonSchema(zodObject, {
        target: "jsonSchema7",
        $refStrategy: "none",
      });

      return {
        name,
        description: tool.description || `Tool: ${name}`,
        inputSchema: jsonSchema as any,
      };
    });

    return { tools };
  });

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;

    const tool = MCP_TOOLS[name as keyof typeof MCP_TOOLS];
    if (!tool) {
      throw new ConfigurationError(
        `Tool not found: ${name}. Available tools: ${Object.keys(MCP_TOOLS).join(", ")}`
      );
    }

    try {
      // Validate arguments using Zod schema before invoking the tool
      const zodObject = z.object(tool.inputSchema);
      const parseResult = zodObject.safeParse(rawArgs || {});

      if (!parseResult.success) {
        const errorDetails = parseResult.error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new ValidationError(`Invalid arguments: ${errorDetails}`);
      }

      // Execute tool with validated arguments
      const result = await tool.handler(parseResult.data as any, context);

      return {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Format error for user-friendly display
      const errorMessage = formatErrorForUser(error);

      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

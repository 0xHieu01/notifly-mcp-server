/**
 * Core type system for Notifly MCP Server.
 *
 * Defines TypeScript types for server context, tool handlers,
 * and MCP integration.
 */

/**
 * Server context passed to all tool handlers
 */
export type ServerContext = {};

/**
 * Tool definition structure following MCP protocol
 */
export type ToolDefinition<TInput = any, TOutput = any> = {
  /** Tool name used for invocation */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Zod schema for input validation */
  inputSchema: Record<string, any>;
  /** Tool handler function */
  handler: (params: TInput, context: ServerContext) => Promise<TOutput>;
  /** Optional annotations for MCP hints */
  annotations?: {
    readOnlyHint?: boolean;
    openWorldHint?: boolean;
  };
};

/**
 * Notifly API response wrapper
 */
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Organization entity from Notifly API
 */
export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

/**
 * Project entity from Notifly API
 */
export type Project = {
  id: string;
  name: string;
  organizationId: string;
  apiKey?: string;
  createdAt: string;
};

/**
 * Campaign entity from Notifly API
 */
export type Campaign = {
  id: string;
  name: string;
  projectId: string;
  status: "active" | "inactive" | "draft";
  createdAt: string;
};

/**
 * Generic message send request payload (email, SMS, etc.)
 */
export type GenericMessagePayload = {
  projectId: string;
  to: string;
  subject?: string;
  body: string;
  templateId?: string;
};

/**
 * Custom error classes for Notifly MCP Server
 */

/**
 * Base error class for all Notifly MCP errors
 */
export class NotiflyMcpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotiflyMcpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when API authentication fails
 */
export class AuthenticationError extends NotiflyMcpError {
  constructor(message = "Authentication failed. Please check your API key.") {
    super(message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when API request fails
 */
export class ApiError extends NotiflyMcpError {
  public readonly statusCode?: number;
  public readonly response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Error thrown when user input is invalid
 */
export class ValidationError extends NotiflyMcpError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends NotiflyMcpError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends NotiflyMcpError {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Format error for user-friendly display in MCP responses
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof ApiError) {
    let message = `[API Error]\n\n${error.message}`;
    if (error.statusCode) {
      message += `\n\nStatus Code: ${error.statusCode}`;
      if (error.statusCode === 401 || error.statusCode === 403) {
        message += `\n\nTip: Check your credentials and permissions.`;
      } else if (error.statusCode === 429) {
        message += `\n\nTip: You may be rate limited. Retry later or reduce request frequency.`;
      }
    }
    return message;
  }
  if (error instanceof ValidationError) {
    return `[Validation Error]\n\n${error.message}`;
  }

  if (error instanceof ConfigurationError) {
    return `[Configuration Error]\n\n${error.message}`;
  }

  if (error instanceof NotFoundError) {
    return `[Not Found]\n\n${error.message}`;
  }

  if (error instanceof Error) {
    return `[Error]\n\n${error.message}`;
  }

  return `[Unknown Error]\n\n${String(error)}`;
}

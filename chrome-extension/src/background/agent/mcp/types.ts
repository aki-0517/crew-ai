/**
 * MCP Client Types
 */

export interface MCPServerConfig {
  url: string;
  name: string;
  enabled: boolean;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: string;
  error?: string;
}

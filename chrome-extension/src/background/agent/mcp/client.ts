import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { createLogger } from '@src/background/log';
import type { MCPToolResult } from './types';

const logger = createLogger('MCPClient');

// Hardcoded MCP server URL for MVP
const MCP_SERVER_URL = 'http://localhost:8000/sse';

export class MCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private connected: boolean = false;

  /**
   * Connect to MCP server
   */
  async connect(): Promise<boolean> {
    if (this.connected) return true;

    try {
      logger.info(`Connecting to MCP server at ${MCP_SERVER_URL}`);

      this.transport = new SSEClientTransport(new URL(MCP_SERVER_URL));
      this.client = new Client(
        {
          name: 'crew-defi-agent',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      await this.client.connect(this.transport);
      this.connected = true;

      logger.info('✅ Connected to MCP server');
      return true;
    } catch (error) {
      logger.error(`Failed to connect to MCP server: ${error}`);
      this.connected = false;
      return false;
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<MCPToolResult> {
    // Try to connect if not connected
    if (!this.connected) {
      const success = await this.connect();
      if (!success) {
        return {
          content: '',
          error: 'MCP server not available',
        };
      }
    }

    try {
      if (!this.client) {
        throw new Error('MCP client not initialized');
      }

      logger.debug(`Calling MCP tool: ${name}`, args);

      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      // Extract text content from result
      const content = (result.content as any)
        .map((item: any) => {
          if (item.type === 'text') {
            return item.text;
          }
          return '';
        })
        .join('\n');

      logger.debug(`MCP tool ${name} returned ${content.length} chars`);

      return {
        content,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`MCP tool call failed: ${errorMsg}`);

      return {
        content: '',
        error: errorMsg,
      };
    }
  }

  /**
   * Check if MCP server is available
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        logger.error(`Error disconnecting: ${error}`);
      }
      this.client = null;
      this.transport = null;
      this.connected = false;
    }
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}

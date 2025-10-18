import { z } from 'zod';
import type { ActionSchema } from '../actions/schemas';

/**
 * DeFi Llama MCP Tool Schemas
 * These match the tools available from the Python MCP server
 */

export const getProtocolSchema: ActionSchema = {
  name: 'get_protocol',
  description:
    'Get detailed TVL and metrics for a DeFi protocol. Use this to analyze specific protocols like Aave, Uniswap, Compound, Curve, etc.',
  schema: z.object({
    protocol: z.string().describe('Protocol slug (e.g., aave, uniswap, compound)'),
  }),
};

export const getChainsSchema: ActionSchema = {
  name: 'get_chains',
  description:
    'Get TVL data for all blockchain networks. Use this to compare chains like Ethereum, Arbitrum, Polygon, etc.',
  schema: z.object({}),
};

export const getTVLSchema: ActionSchema = {
  name: 'get_tvl',
  description: 'Get current TVL (Total Value Locked) for a specific protocol. Quick lookup for TVL numbers.',
  schema: z.object({
    protocol: z.string().describe('Protocol slug (e.g., aave, uniswap)'),
  }),
};

export const compareProtocolsSchema: ActionSchema = {
  name: 'compare_protocols',
  description:
    'Compare multiple DeFi protocols side-by-side. Use this to analyze which protocol has higher TVL, fees, or volume.',
  schema: z.object({
    protocols: z.string().describe('Comma-separated protocol slugs (e.g., "aave,compound,makerdao")'),
    metric: z.enum(['tvl', 'fees', 'volume']).default('tvl').describe('Metric to compare'),
  }),
};

export const getHistoricalChainTVLSchema: ActionSchema = {
  name: 'get_historical_chain_tvl',
  description: 'Get historical TVL data for a blockchain. Use this to analyze trends over time.',
  schema: z.object({
    chain: z.string().describe('Chain name (e.g., Ethereum, Arbitrum, Polygon)'),
  }),
};

// Export all schemas as array for easy registration
export const MCP_TOOL_SCHEMAS = [
  getProtocolSchema,
  getChainsSchema,
  getTVLSchema,
  compareProtocolsSchema,
  getHistoricalChainTVLSchema,
];

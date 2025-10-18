# MCP Client for DeFi Llama Integration

This module provides Model Context Protocol (MCP) client integration for accessing DeFi Llama data from the agent.

## Architecture

```
agent/
├── mcp/
│   ├── client.ts      # SSE-based MCP client
│   ├── schemas.ts     # DeFi Llama tool schemas
│   ├── types.ts       # TypeScript interfaces
│   └── README.md      # This file
│
└── actions/
    └── builder.ts     # Registers MCP tools as Actions
```

## Features

- **5 DeFi Llama Tools**: Protocol TVL, chain data, comparisons, historical data
- **Graceful Degradation**: Agent continues if MCP server is unavailable
- **Automatic Reconnection**: Reconnects if connection drops
- **Error Handling**: All errors are caught and returned as ActionResult
- **Zero Configuration**: Hardcoded MCP server URL for MVP

## Available Tools

### 1. `get_protocol`

Get detailed TVL and metrics for a specific protocol.

```json
{ "protocol": "aave" }
```

### 2. `get_chains`

Get TVL data for all blockchain networks.

```json
{}
```

### 3. `get_tvl`

Quick TVL lookup for a protocol.

```json
{ "protocol": "uniswap" }
```

### 4. `compare_protocols`

Compare multiple protocols side-by-side.

```json
{
  "protocols": "aave,compound,makerdao",
  "metric": "tvl"
}
```

### 5. `get_historical_chain_tvl`

Get historical TVL data for a blockchain.

```json
{ "chain": "Ethereum" }
```

## Usage

The MCP client is automatically initialized when the ActionBuilder creates actions:

```typescript
const actionBuilder = new ActionBuilder(context, extractorLLM);
const allActions = actionBuilder.buildAllActions(); // Includes MCP tools
```

## Error Handling

If MCP server is unavailable:

1. Connection attempt fails gracefully
2. Action returns error message in extractedContent
3. Agent can continue with other actions
4. Error is logged but doesn't crash the agent

## Configuration

**MCP Server URL**: `http://localhost:8000/sse` (hardcoded in `client.ts`)

To change the server URL:

```typescript
// In client.ts
const MCP_SERVER_URL = 'http://your-server:8000/sse';
```

## Testing

### 1. Start MCP Server

```bash
cd /home/owen/DeFi-Copilot/DeFI-Copilot
uv run defi_llama_server.py
```

### 2. Build Extension

```bash
cd /home/owen/DeFi-Copilot/nanobrowser
pnpm build
```

### 3. Load Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `nanobrowser/dist/`

### 4. Test with Agent

Try queries like:

- "What is the TVL of Aave?"
- "Compare Aave and Compound TVL"
- "Which blockchain has the highest TVL?"

## Troubleshooting

### MCP Server Not Connecting

- Check if server is running: `curl http://localhost:8000/sse`
- Check browser console for connection errors
- Verify port 8000 is not blocked

### Tools Not Showing Up

- Check extension logs: `chrome://extensions/` → Details → Inspect service worker
- Look for "Registered X MCP actions" log
- Verify `buildAllActions()` is called in executor.ts

### Tool Calls Failing

- Check MCP server logs for errors
- Verify DeFi Llama API is reachable
- Check tool arguments match schema

## Adding New Tools

1. Add schema to `schemas.ts`:

```typescript
export const newToolSchema: ActionSchema = {
  name: 'new_tool',
  description: 'Description for LLM',
  schema: z.object({
    param: z.string().describe('Parameter description'),
  }),
};
```

2. Add to export array:

```typescript
export const MCP_TOOL_SCHEMAS = [
  // ... existing tools
  newToolSchema,
];
```

3. Add corresponding tool to Python MCP server (`defi_llama_server.py`)

The action will be automatically registered!

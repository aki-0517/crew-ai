# Nanobrowser Agent Architecture Guide

## Overview

Nanobrowser is a multi-agent Chrome extension that automates web browsing tasks using AI. It employs a sophisticated architecture where specialized agents work together to understand, plan, and execute web automation tasks.

---

## 1. How Nanobrowser Works

### High-Level Flow

```
User Task → Background Service Worker → Executor → Agents (Navigator + Planner) → Browser Actions → Results
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension                              │
│                                                                   │
│  ┌──────────────┐         ┌─────────────────────────────────┐  │
│  │  Side Panel  │ ◄─────► │  Background Service Worker      │  │
│  │  (UI)        │         │                                  │  │
│  └──────────────┘         │  ┌─────────────────────────┐    │  │
│                            │  │      Executor           │    │  │
│                            │  │                         │    │  │
│                            │  │  ┌────────────────┐    │    │  │
│                            │  │  │ Navigator Agent│    │    │  │
│                            │  │  │ (Action Exec)  │    │    │  │
│                            │  │  └────────────────┘    │    │  │
│                            │  │                         │    │  │
│                            │  │  ┌────────────────┐    │    │  │
│                            │  │  │ Planner Agent  │    │    │  │
│                            │  │  │ (Strategy)     │    │    │  │
│                            │  │  └────────────────┘    │    │  │
│                            │  │                         │    │  │
│                            │  │  ┌────────────────┐    │    │  │
│                            │  │  │ Action Registry│    │    │  │
│                            │  │  │ (Actions Pool) │    │    │  │
│                            │  │  └────────────────┘    │    │  │
│                            │  └─────────────────────────┘    │  │
│                            │           │                      │  │
│                            │           ▼                      │  │
│                            │  ┌─────────────────────────┐    │  │
│                            │  │   Browser Context       │    │  │
│                            │  │   (DOM, Tabs, etc)      │    │  │
│                            │  └─────────────────────────┘    │  │
│                            └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Background Service Worker** (`chrome-extension/src/background/index.ts`)
   - Entry point for all task execution
   - Manages communication between UI and agents
   - Handles Chrome extension APIs

2. **Executor** (`chrome-extension/src/background/agent/executor.ts`)
   - Orchestrates the agent workflow
   - Coordinates Navigator and Planner agents
   - Manages task state and execution lifecycle

3. **Browser Context** (`chrome-extension/src/background/browser/context.ts`)
   - Manages browser state (tabs, DOM, etc.)
   - Provides browser automation capabilities
   - Handles page interactions

4. **Message Manager** (`chrome-extension/src/background/agent/messages/service.ts`)
   - Manages conversation history between agents and LLM
   - Formats messages for different agent types

5. **Event Manager** (`chrome-extension/src/background/agent/event/manager.ts`)
   - Publishes execution events to UI
   - Tracks agent progress and state changes

---

## 2. Agent Connection & Communication

### Executor Setup Process

When a task is initiated (from `background/index.ts`):

```typescript
// 1. User submits task from side panel
// 2. Background worker receives task message
// 3. Setup executor with LLM models
const executor = new Executor(
  task,                    // User's task description
  taskId,                  // Unique task identifier
  browserContext,          // Browser automation context
  navigatorLLM,            // LLM for Navigator agent
  {
    plannerLLM,            // LLM for Planner agent (optional)
    agentOptions: { ... }, // Configuration options
    generalSettings        // Extension settings
  }
);

// 4. Execute the task
await executor.execute();
```

### Agent Execution Loop

The executor runs a sophisticated loop (from `executor.ts:execute()`):

```typescript
for (step = 0; step < maxSteps; step++) {
  // 1. Check if should stop (pause/cancel)
  if (await this.shouldStop()) break;

  // 2. Run Planner periodically for strategic guidance
  if (step % planningInterval === 0 || navigatorDone) {
    latestPlanOutput = await this.runPlanner();

    // Check if task is complete
    if (this.checkTaskCompletion(latestPlanOutput)) break;
  }

  // 3. Execute Navigator to perform actions
  navigatorDone = await this.navigate();

  // If Navigator indicates completion, validate with Planner
  if (navigatorDone) {
    // Next planner run will validate
  }
}
```

### Communication Flow

```
┌──────────┐    Prompts    ┌──────────┐    Actions    ┌──────────┐
│ Planner  │  ─────────►   │ Navigator│  ──────────►  │ Browser  │
│  Agent   │               │  Agent   │               │ Context  │
└──────────┘               └──────────┘               └──────────┘
     │                          │                          │
     │                          │                          │
     └──────────────────────────┴──────────────────────────┘
                                │
                         Message Manager
                      (Shared Conversation)
```

---

## 3. Agent Architecture

### Base Agent Class

All agents inherit from `BaseAgent` (`chrome-extension/src/background/agent/agents/base.ts`):

```typescript
abstract class BaseAgent<T extends z.ZodType, M = unknown> {
  protected id: string; // Agent identifier
  protected chatLLM: BaseChatModel; // LangChain LLM instance
  protected prompt: BasePrompt; // System prompt
  protected context: AgentContext; // Shared execution context
  protected actions: Record<string, Action>; // Available actions
  protected modelOutputSchema: T; // Zod validation schema

  // Main execution method (implemented by subclasses)
  abstract execute(): Promise<AgentOutput<M>>;

  // Invoke LLM with structured output
  async invoke(inputMessages: BaseMessage[]): Promise<ModelOutput> {
    // Handles structured output or manual JSON extraction
    // Supports multiple LLM providers
  }
}
```

### Agent Context

Shared context between agents (`types.ts:AgentContext`):

```typescript
class AgentContext {
  taskId: string;                    // Current task ID
  browserContext: BrowserContext;    // Browser state & automation
  messageManager: MessageManager;    // Conversation history
  eventManager: EventManager;        // Event publishing
  options: AgentOptions;             // Configuration
  history: AgentStepHistory;         // Action history
  paused/stopped: boolean;           // Execution state
  nSteps: number;                    // Current step count
  actionResults: ActionResult[];     // Results from actions
}
```

### Current Agents

#### 1. Navigator Agent

**Purpose**: Executes concrete web actions (click, type, navigate, etc.)

**Location**: `chrome-extension/src/background/agent/agents/navigator.ts`

**Key Features**:

- Maintains an action registry with all available actions
- Analyzes current browser state (DOM tree)
- Decides which actions to take
- Executes multiple actions per step
- Updates conversation memory

**Output Schema**:

```typescript
{
  current_state: {
    evaluation_previous_goal: string,
    memory: string,
    next_goal: string
  },
  action: [
    { action_name: { param1: value, ... } },
    ...
  ]
}
```

**Available Actions** (from `actions/schemas.ts`):

- Navigation: `go_to_url`, `go_back`, `search_google`
- Interaction: `click_element`, `input_text`, `send_keys`
- Content: `cache_content`, `scroll_to_text`, `scroll_to_percent`
- Tab Management: `open_tab`, `switch_tab`, `close_tab`
- Dropdown: `select_dropdown_option`, `get_dropdown_options`
- Pagination: `next_page`, `previous_page`
- Control: `wait`, `done`

#### 2. Planner Agent

**Purpose**: High-level strategic planning and task validation

**Location**: `chrome-extension/src/background/agent/agents/planner.ts`

**Key Features**:

- Evaluates overall task progress
- Identifies challenges
- Suggests next steps
- Determines when task is complete
- Provides final answer

**Output Schema**:

```typescript
{
  observation: string,        // What has been done so far
  challenges: string,         // Current obstacles
  done: boolean,              // Is task complete?
  next_steps: string,         // What to do next
  final_answer: string,       // Result when done=true
  reasoning: string,          // Thought process
  web_task: boolean          // Is this a web-based task?
}
```

---

## 4. Adding Your Own Agent

Yes, you **can** add your own custom agent! Here's how:

### Step 1: Create Your Agent Class

Create a new file: `chrome-extension/src/background/agent/agents/your-agent.ts`

```typescript
import { z } from 'zod';
import { BaseAgent, type BaseAgentOptions, type ExtraAgentOptions } from './base';
import { createLogger } from '@src/background/log';
import type { AgentOutput } from '../types';
import { Actors, ExecutionState } from '../event/types';

const logger = createLogger('YourAgent');

// Define your agent's output schema
export const yourAgentOutputSchema = z.object({
  analysis: z.string(),
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
  // Add your custom fields
});

export type YourAgentOutput = z.infer<typeof yourAgentOutputSchema>;

export class YourAgent extends BaseAgent<typeof yourAgentOutputSchema, YourAgentOutput> {
  constructor(options: BaseAgentOptions, extraOptions?: Partial<ExtraAgentOptions>) {
    super(yourAgentOutputSchema, options, { ...extraOptions, id: 'your_agent' });
  }

  async execute(): Promise<AgentOutput<YourAgentOutput>> {
    try {
      // Emit start event
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.STEP_START, 'Analyzing...');

      // Get message history
      const messages = this.context.messageManager.getMessages();
      const inputMessages = [this.prompt.getSystemMessage(), ...messages];

      // Invoke LLM
      const modelOutput = await this.invoke(inputMessages);

      if (!modelOutput) {
        throw new Error('Failed to get agent output');
      }

      // Process output
      logger.info('Agent output:', modelOutput);

      // Emit completion event
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.STEP_OK, `Analysis complete: ${modelOutput.recommendation}`);

      return {
        id: this.id,
        result: modelOutput,
      };
    } catch (error) {
      logger.error('Agent execution failed:', error);
      return {
        id: this.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

### Step 2: Create Your Agent's Prompt

Create: `chrome-extension/src/background/agent/prompts/your-agent.ts`

```typescript
import { BasePrompt } from './base';
import { SystemMessage } from '@langchain/core/messages';

export class YourAgentPrompt extends BasePrompt {
  getSystemMessage(): SystemMessage {
    const systemPrompt = `You are a specialized agent for [describe purpose].

Your role is to:
1. [Key responsibility 1]
2. [Key responsibility 2]
3. [Key responsibility 3]

You must respond with a JSON object containing:
- analysis: string (your analysis of the situation)
- recommendation: string (what should be done)
- confidence: number (0-1, how confident you are)

Always be thorough and precise in your analysis.`;

    return new SystemMessage(systemPrompt);
  }
}
```

### Step 3: Register Your Agent in the Executor

Modify `chrome-extension/src/background/agent/executor.ts`:

```typescript
import { YourAgent } from './agents/your-agent';
import { YourAgentPrompt } from './prompts/your-agent';

export class Executor {
  private readonly navigator: NavigatorAgent;
  private readonly planner: PlannerAgent;
  private readonly yourAgent: YourAgent;  // Add your agent
  // ...

  constructor(...) {
    // ... existing code ...

    // Initialize your agent
    const yourAgentPrompt = new YourAgentPrompt();
    this.yourAgent = new YourAgent({
      chatLLM: navigatorLLM,  // or use a dedicated LLM
      context: context,
      prompt: yourAgentPrompt,
    });

    // ... rest of constructor ...
  }

  async execute(): Promise<void> {
    // ... existing code ...

    for (step = 0; step < allowedMaxSteps; step++) {
      // ... existing code ...

      // Add your agent's execution logic
      // Example: Run your agent every 5 steps
      if (step % 5 === 0) {
        const yourAgentOutput = await this.yourAgent.execute();
        // Process output
        if (yourAgentOutput.result) {
          logger.info('Your agent recommendation:', yourAgentOutput.result.recommendation);
          // You could influence the navigator or planner based on this
        }
      }

      // ... rest of loop ...
    }
  }
}
```

### Step 4: Add to Storage Configuration (Optional)

If you want users to configure your agent's model in settings:

1. Add to `packages/storage/lib/agent-models/index.ts`:

```typescript
export enum AgentNameEnum {
  Navigator = 'navigator',
  Planner = 'planner',
  YourAgent = 'your_agent', // Add this
}
```

2. Update the options page to include your agent in the UI.

### Step 5: Define Custom Actions (Optional)

If your agent needs custom actions:

1. Create action schemas in `actions/schemas.ts`:

```typescript
export const yourCustomActionSchema: ActionSchema = {
  name: 'your_custom_action',
  description: 'Description of what this action does',
  schema: z.object({
    intent: z.string().describe('purpose of this action'),
    param1: z.string(),
    param2: z.number(),
  }),
};
```

2. Implement the action in `actions/builder.ts`:

```typescript
export class ActionBuilder {
  // ... existing code ...

  buildYourCustomAction(): Action {
    return new Action(async (args: { param1: string; param2: number }) => {
      // Implement your action logic
      logger.info('Executing your custom action', args);

      try {
        // Do something with browser context
        const result = await this.context.browserContext.doSomething(args);

        return new ActionResult({
          success: true,
          extractedContent: result,
        });
      } catch (error) {
        return new ActionResult({
          success: false,
          error: error.message,
        });
      }
    }, yourCustomActionSchema);
  }

  buildDefaultActions(): Action[] {
    return [
      // ... existing actions ...
      this.buildYourCustomAction(),
    ];
  }
}
```

---

## 5. Example: Creating a "Validator" Agent

Here's a complete example of creating a validator agent that checks if actions were successful:

```typescript
// agents/validator.ts
import { z } from 'zod';
import { BaseAgent, type BaseAgentOptions } from './base';
import type { AgentOutput } from '../types';
import { HumanMessage } from '@langchain/core/messages';

export const validatorOutputSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type ValidatorOutput = z.infer<typeof validatorOutputSchema>;

export class ValidatorAgent extends BaseAgent<typeof validatorOutputSchema, ValidatorOutput> {
  constructor(options: BaseAgentOptions) {
    super(validatorOutputSchema, options, { id: 'validator' });
  }

  async execute(): Promise<AgentOutput<ValidatorOutput>> {
    try {
      // Get recent action results
      const recentActions = this.context.actionResults.slice(-3);

      // Get browser state
      const browserState = await this.context.browserContext.getState(false);

      // Create validation prompt
      const validationQuery = `
Recent actions:
${recentActions.map(a => `- Success: ${a.success}, Error: ${a.error || 'none'}`).join('\n')}

Current URL: ${browserState.url}

Validate if the recent actions achieved their intended goals.
`;

      const messages = [this.prompt.getSystemMessage(), new HumanMessage(validationQuery)];

      const output = await this.invoke(messages);

      return {
        id: this.id,
        result: output,
      };
    } catch (error) {
      return {
        id: this.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

---

## 6. Best Practices for Custom Agents

1. **Keep agents focused**: Each agent should have a single, clear responsibility
2. **Use structured output**: Always define Zod schemas for type safety and validation
3. **Handle errors gracefully**: Catch and log errors, emit appropriate events
4. **Emit events**: Keep the UI informed about agent progress
5. **Respect context state**: Check `context.paused` and `context.stopped`
6. **Use the logger**: Log important decisions and errors
7. **Test thoroughly**: Test with different LLM providers
8. **Document prompts**: Clear system prompts lead to better agent behavior
9. **Consider token limits**: Be mindful of message history size
10. **Coordinate with other agents**: Ensure your agent plays well with existing agents

---

## 7. Agent Capabilities & Limitations

### What Agents Can Do

- Access browser state (DOM, tabs, cookies, etc.)
- Execute browser actions (click, type, navigate)
- Maintain conversation history
- Emit events to UI
- Store and retrieve data
- Make decisions based on LLM reasoning

### What Agents Cannot Do

- Directly manipulate the file system (Chrome extension sandbox)
- Make arbitrary network requests (must go through Chrome APIs)
- Execute arbitrary code (security restrictions)
- Access resources outside the browser context

---

## 8. Testing Your Agent

1. **Build the extension**:

```bash
pnpm build
```

2. **Load unpacked extension** in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

3. **Test with simple tasks**:
   - Open the side panel
   - Enter a task that exercises your agent
   - Monitor the console for logs

4. **Unit tests** (optional):

```typescript
// chrome-extension/src/background/agent/__tests__/your-agent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { YourAgent } from '../agents/your-agent';

describe('YourAgent', () => {
  it('should produce valid output', async () => {
    // Create mock dependencies
    const mockLLM = vi.fn();
    const mockContext = {
      /* ... */
    };

    const agent = new YourAgent({
      chatLLM: mockLLM,
      context: mockContext,
      prompt: mockPrompt,
    });

    const output = await agent.execute();
    expect(output.result).toBeDefined();
  });
});
```

---

## 9. Advanced Topics

### Multi-Agent Coordination

Agents can coordinate through:

- **Shared message history**: All agents see the same conversation
- **Context state**: Agents can set flags or data in the context
- **Event system**: Agents can emit and listen to events

### Custom LLM Integration

You can use different LLMs for different agents:

```typescript
const navigator = new NavigatorAgent({
  chatLLM: createChatModel(providers['openai'], { model: 'gpt-4' }),
  // ...
});

const planner = new PlannerAgent({
  chatLLM: createChatModel(providers['anthropic'], { model: 'claude-3-5-sonnet' }),
  // ...
});
```

### Agent with Tools

Create agents that use LangChain tools:

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';

const tools = [
  new DynamicStructuredTool({
    name: 'search_database',
    description: 'Search internal database',
    schema: z.object({ query: z.string() }),
    func: async ({ query }) => {
      // Implementation
      return result;
    },
  }),
];

// Use tools with your agent's LLM
```

---

## Summary

**Yes, you can absolutely add your own agent!** The architecture is designed to be extensible:

1. **Create** your agent class extending `BaseAgent`
2. **Define** your agent's output schema with Zod
3. **Write** a system prompt for your agent
4. **Register** your agent in the Executor
5. **Integrate** your agent into the execution loop
6. **(Optional)** Add custom actions specific to your agent

The multi-agent architecture allows you to create specialized agents for specific tasks like:

- **Security Agent**: Validates safety of actions
- **Data Extraction Agent**: Specialized in scraping structured data
- **Form Filling Agent**: Expert at filling out forms
- **Analytics Agent**: Tracks and analyzes user behavior patterns
- **DeFi Agent**: Specialized for DeFi protocols and transactions 🚀

Each agent gets access to the same browser context, can execute actions, and can coordinate with other agents through shared context and messaging.

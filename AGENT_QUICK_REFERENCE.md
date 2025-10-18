# Agent Quick Reference Guide

A quick reference for common agent operations and patterns in nanobrowser.

## Agent Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Submits Task                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Background Worker (index.ts)                    │
│  - Creates Executor                                          │
│  - Initializes LLM models                                    │
│  - Sets up browser context                                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Executor.execute()                           │
│                                                               │
│  Loop (step = 0 to maxSteps):                               │
│    ┌────────────────────────────────────────┐              │
│    │ 1. Check if paused/stopped             │              │
│    └────────────────────────────────────────┘              │
│                       │                                      │
│    ┌────────────────────────────────────────┐              │
│    │ 2. Run Planner (every N steps)         │              │
│    │    - Evaluate progress                  │              │
│    │    - Check if done                      │              │
│    │    - Provide strategic guidance         │              │
│    └────────────────────────────────────────┘              │
│                       │                                      │
│    ┌────────────────────────────────────────┐              │
│    │ 3. Run Navigator                        │              │
│    │    - Analyze browser state              │              │
│    │    - Choose actions                     │              │
│    │    - Execute actions                    │              │
│    └────────────────────────────────────────┘              │
│                       │                                      │
│    ┌────────────────────────────────────────┐              │
│    │ 4. Custom Agent (optional)              │              │
│    │    - Your specialized logic             │              │
│    └────────────────────────────────────────┘              │
│                                                               │
│  End Loop                                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Task Complete / Failed                      │
│  - Cleanup resources                                         │
│  - Store history                                             │
│  - Emit final event                                          │
└─────────────────────────────────────────────────────────────┘
```

## Agent Class Structure

```typescript
// Minimal agent template
import { z } from 'zod';
import { BaseAgent, type BaseAgentOptions } from './base';
import type { AgentOutput } from '../types';

// 1. Define output schema
export const myAgentOutputSchema = z.object({
  field1: z.string(),
  field2: z.number(),
});

export type MyAgentOutput = z.infer<typeof myAgentOutputSchema>;

// 2. Create agent class
export class MyAgent extends BaseAgent<typeof myAgentOutputSchema, MyAgentOutput> {
  constructor(options: BaseAgentOptions) {
    super(myAgentOutputSchema, options, { id: 'my_agent' });
  }

  // 3. Implement execute method
  async execute(): Promise<AgentOutput<MyAgentOutput>> {
    try {
      // Get browser state
      const state = await this.context.browserContext.getState(false);

      // Prepare messages
      const messages = [this.prompt.getSystemMessage(), new HumanMessage('Your query here')];

      // Invoke LLM
      const output = await this.invoke(messages);

      // Return result
      return { id: this.id, result: output };
    } catch (error) {
      return { id: this.id, error: String(error) };
    }
  }
}
```

## Key Objects & Methods

### AgentContext

```typescript
// Access shared context
this.context.taskId; // Current task ID
this.context.browserContext; // Browser automation
this.context.messageManager; // Conversation history
this.context.eventManager; // Event system
this.context.options; // Configuration
this.context.history; // Action history
this.context.nSteps; // Current step number
this.context.paused; // Is task paused?
this.context.stopped; // Is task stopped?
this.context.actionResults; // Previous action results

// Methods
this.context.emitEvent(actor, state, details);
this.context.pause();
this.context.resume();
this.context.stop();
```

### Browser Context

```typescript
// Get browser state
const state = await this.context.browserContext.getState(includeScreenshot);

// State properties
state.url; // Current URL
state.title; // Page title
state.elementTree; // DOM tree with interactive elements
state.openTabs; // List of open tabs
state.screenshot; // Screenshot (if requested)

// Navigate
await this.context.browserContext.getCurrentPage().navigate(url);

// Switch tabs
await this.context.browserContext.switchTab(tabId);

// Get page
const page = await this.context.browserContext.getCurrentPage();
```

### Message Manager

```typescript
// Get messages
const messages = this.context.messageManager.getMessages();

// Add messages
this.context.messageManager.addNewTask(task);
this.context.messageManager.addPlan(plan, position);
this.context.messageManager.addMessage(message);

// Message history
this.context.messageManager.initTaskMessages(systemMsg, task);
```

### Event Manager

```typescript
// Emit events
await this.context.emitEvent(
  Actors.SYSTEM, // or Actors.PLANNER, Actors.NAVIGATOR
  ExecutionState.STEP_START, // or STEP_OK, STEP_FAIL, etc.
  'Event description',
);

// Event types
ExecutionState.TASK_START;
ExecutionState.TASK_OK;
ExecutionState.TASK_FAIL;
ExecutionState.TASK_CANCEL;
ExecutionState.TASK_PAUSE;
ExecutionState.STEP_START;
ExecutionState.STEP_OK;
ExecutionState.STEP_FAIL;
```

## Common Patterns

### Pattern 1: Analyze Current Page

```typescript
async execute(): Promise<AgentOutput<MyOutput>> {
  // Get current page content
  const state = await this.context.browserContext.getState(false);
  const pageText = state.elementTree.getVisibleText();

  // Analyze with LLM
  const messages = [
    this.prompt.getSystemMessage(),
    new HumanMessage(`Analyze this page: ${pageText.substring(0, 5000)}`),
  ];

  const result = await this.invoke(messages);
  return { id: this.id, result };
}
```

### Pattern 2: Make Decision Based on History

```typescript
async execute(): Promise<AgentOutput<MyOutput>> {
  // Get recent actions
  const recentActions = this.context.actionResults.slice(-5);

  // Build context
  const actionSummary = recentActions
    .map(a => `Action ${a.success ? 'succeeded' : 'failed'}: ${a.extractedContent}`)
    .join('\n');

  const messages = [
    this.prompt.getSystemMessage(),
    new HumanMessage(`Recent actions:\n${actionSummary}\n\nWhat should we do next?`),
  ];

  const result = await this.invoke(messages);
  return { id: this.id, result };
}
```

### Pattern 3: Store Result for Other Agents

```typescript
async execute(): Promise<AgentOutput<MyOutput>> {
  const result = await this.invoke(messages);

  // Store result for other agents to access
  this.context.actionResults.push({
    isDone: false,
    success: true,
    extractedContent: JSON.stringify(result),
    error: null,
    includeInMemory: true,  // Important: include in message history
    interactedElement: null,
  });

  return { id: this.id, result };
}
```

### Pattern 4: Conditional Execution

```typescript
// In Executor.execute()
if (this.myAgent && this.shouldRunMyAgent(context)) {
  const output = await this.myAgent.execute();

  if (output.result?.criticalFlag) {
    // Take special action
    await this.handleCriticalCase();
  }
}
```

### Pattern 5: Multi-Step Analysis

```typescript
async execute(): Promise<AgentOutput<MyOutput>> {
  // Step 1: Gather information
  const state = await this.context.browserContext.getState(false);

  // Step 2: First pass analysis
  const preliminaryAnalysis = await this.invoke([
    this.prompt.getSystemMessage(),
    new HumanMessage(`Quick analysis of: ${state.url}`),
  ]);

  // Step 3: Detailed analysis based on preliminary results
  if (preliminaryAnalysis.needsDeepDive) {
    const detailedAnalysis = await this.invoke([
      this.prompt.getSystemMessage(),
      new HumanMessage(`Detailed analysis requested`),
    ]);
    return { id: this.id, result: detailedAnalysis };
  }

  return { id: this.id, result: preliminaryAnalysis };
}
```

## Action Creation

### Creating a Custom Action

```typescript
// 1. Define schema
export const myActionSchema: ActionSchema = {
  name: 'my_action',
  description: 'What this action does',
  schema: z.object({
    intent: z.string().describe('purpose'),
    param1: z.string(),
    param2: z.number().optional(),
  }),
};

// 2. Implement action
buildMyAction(): Action {
  return new Action(
    async (args: { param1: string; param2?: number }) => {
      try {
        // Emit start event
        await this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.STEP_START,
          `Executing my_action: ${args.param1}`
        );

        // Do something
        const result = await this.doSomething(args);

        // Emit success event
        await this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.STEP_OK,
          'Action completed'
        );

        return new ActionResult({
          success: true,
          extractedContent: result,
          includeInMemory: true,
        });
      } catch (error) {
        return new ActionResult({
          success: false,
          error: error.message,
        });
      }
    },
    myActionSchema,
    false  // hasIndex: does this action use an element index?
  );
}

// 3. Register action
buildDefaultActions(): Action[] {
  return [
    // ... existing actions
    this.buildMyAction(),
  ];
}
```

## Prompt Engineering

### Good Prompt Structure

```typescript
export class MyPrompt extends BasePrompt {
  getSystemMessage(): SystemMessage {
    return new SystemMessage(`You are a [role] with expertise in [domain].

Your responsibilities:
1. [Responsibility 1]
2. [Responsibility 2]
3. [Responsibility 3]

Guidelines:
- Be specific and precise
- Consider [important factor]
- Always check for [critical condition]

Output format:
You must respond with a JSON object containing:
- field1: string (description)
- field2: number (description)

Example:
{
  "field1": "example value",
  "field2": 42
}

Remember: [critical reminder]`);
  }
}
```

## Debugging Tips

```typescript
// 1. Use the logger
import { createLogger } from '@src/background/log';
const logger = createLogger('MyAgent');

logger.info('Agent starting');
logger.debug('Detailed info', { data: someObject });
logger.error('Something went wrong', error);

// 2. Check browser console
// All logs appear in the background service worker console

// 3. Emit events for visibility
await this.context.emitEvent(Actors.SYSTEM, ExecutionState.STEP_START, 'Debug: Current state is...');

// 4. Store intermediate results
this.context.actionResults.push({
  isDone: false,
  success: true,
  extractedContent: `Debug: ${JSON.stringify(debugInfo)}`,
  error: null,
  includeInMemory: true,
  interactedElement: null,
});

// 5. Use DEV mode
if (import.meta.env.DEV) {
  logger.debug('Dev-only debug info', this.context.history);
}
```

## Common Pitfalls

### ❌ Don't Do This

```typescript
// 1. Blocking without checking paused/stopped
for (let i = 0; i < 1000; i++) {
  await doSomething(); // Task can't be paused!
}

// 2. Not handling errors
const result = await this.invoke(messages); // Will crash if fails

// 3. Forgetting to emit events
const result = await longRunningTask(); // User has no feedback

// 4. Not validating LLM output
return { id: this.id, result: await this.invoke(messages) }; // What if it's null?

// 5. Modifying shared state unsafely
this.context.nSteps = 0; // Executor manages this!
```

### ✅ Do This Instead

```typescript
// 1. Check paused/stopped
for (let i = 0; i < 1000; i++) {
  if (this.context.paused || this.context.stopped) break;
  await doSomething();
}

// 2. Handle errors
try {
  const result = await this.invoke(messages);
  if (!result) throw new Error('No result');
  return { id: this.id, result };
} catch (error) {
  logger.error('Failed:', error);
  return { id: this.id, error: String(error) };
}

// 3. Emit events
await this.context.emitEvent(Actors.SYSTEM, ExecutionState.STEP_START, 'Starting...');
const result = await longRunningTask();
await this.context.emitEvent(Actors.SYSTEM, ExecutionState.STEP_OK, 'Done!');

// 4. Validate output
const output = await this.invoke(messages);
if (!output) throw new Error('Invalid output');
return { id: this.id, result: output };

// 5. Only read shared state, use proper methods to modify
const currentStep = this.context.nSteps; // Read: OK
// context.nSteps++  // Write: Don't do this!
```

## File Locations Reference

```
chrome-extension/src/background/
├── agent/
│   ├── agents/
│   │   ├── base.ts           ← Base agent class
│   │   ├── navigator.ts      ← Navigator implementation
│   │   ├── planner.ts        ← Planner implementation
│   │   └── your-agent.ts     ← YOUR AGENT HERE
│   ├── actions/
│   │   ├── builder.ts        ← Action implementations
│   │   └── schemas.ts        ← Action schemas
│   ├── prompts/
│   │   ├── base.ts           ← Base prompt class
│   │   ├── navigator.ts      ← Navigator prompt
│   │   ├── planner.ts        ← Planner prompt
│   │   └── your-prompt.ts    ← YOUR PROMPT HERE
│   ├── executor.ts           ← Main orchestrator (REGISTER HERE)
│   ├── types.ts              ← Type definitions
│   └── helper.ts             ← Helper functions
├── browser/
│   └── context.ts            ← Browser automation
└── index.ts                  ← Entry point

packages/storage/lib/
├── agent-models/
│   └── index.ts              ← Agent model configuration
└── general-settings/
    └── index.ts              ← General settings
```

## Integration Checklist

- [ ] Create agent class in `agents/your-agent.ts`
- [ ] Define Zod output schema
- [ ] Implement `execute()` method
- [ ] Create prompt in `prompts/your-prompt.ts`
- [ ] Register agent in `executor.ts`
- [ ] Add to execution loop in `executor.execute()`
- [ ] (Optional) Add custom actions in `actions/`
- [ ] (Optional) Add to storage configuration
- [ ] (Optional) Add UI components for agent output
- [ ] Test with `pnpm build`
- [ ] Load unpacked extension in Chrome
- [ ] Test with various tasks

## Resources

- **Full Guide**: See `AGENT_ARCHITECTURE_GUIDE.md`
- **DeFi Example**: See `EXAMPLE_DEFI_AGENT.md`
- **LangChain Docs**: https://js.langchain.com/docs/
- **Zod Docs**: https://zod.dev/
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/

---

Happy Agent Building! 🤖✨

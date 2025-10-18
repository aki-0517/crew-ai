# Nanobrowser Agent Documentation

## Overview

This directory contains comprehensive documentation about the nanobrowser multi-agent architecture. These guides will help you understand how the system works and how to create your own custom agents.

## 📚 Documentation Files

### 1. **AGENT_ARCHITECTURE_GUIDE.md**

_Complete architectural deep-dive_

**What's inside:**

- ✅ How nanobrowser works (high-level architecture)
- ✅ How agents connect and communicate
- ✅ Detailed agent architecture explanation
- ✅ Step-by-step guide to adding custom agents
- ✅ Best practices and patterns
- ✅ Advanced topics (multi-agent coordination, custom LLMs)

**Read this if:** You want a comprehensive understanding of the entire system.

**Estimated reading time:** 30-40 minutes

---

### 2. **EXAMPLE_DEFI_AGENT.md**

_Complete working example of a DeFi security agent_

**What's inside:**

- ✅ Full implementation of a DeFi analysis agent
- ✅ Risk assessment and protocol analysis
- ✅ Custom DeFi-specific actions
- ✅ Integration with the executor
- ✅ UI components for displaying results
- ✅ Testing instructions

**Read this if:** You want to see a complete, real-world agent implementation.

**Estimated reading time:** 20-30 minutes

---

### 3. **AGENT_QUICK_REFERENCE.md**

_Quick lookup for common patterns and operations_

**What's inside:**

- ✅ Visual execution flow diagram
- ✅ Minimal agent template
- ✅ Key objects and methods reference
- ✅ Common patterns and code snippets
- ✅ Debugging tips
- ✅ Integration checklist

**Read this if:** You need quick answers or code snippets while developing.

**Estimated reading time:** 10-15 minutes (reference material)

---

## 🚀 Getting Started Path

### For Complete Beginners

```
1. Read: AGENT_ARCHITECTURE_GUIDE.md (Sections 1-3)
   └─> Understand how nanobrowser works

2. Read: EXAMPLE_DEFI_AGENT.md
   └─> See a complete working example

3. Reference: AGENT_QUICK_REFERENCE.md
   └─> Use as you build your own agent
```

### For Experienced Developers

```
1. Skim: AGENT_ARCHITECTURE_GUIDE.md (Sections 1-2)
   └─> Get the big picture

2. Study: AGENT_ARCHITECTURE_GUIDE.md (Section 4)
   └─> Focus on "Adding Your Own Agent"

3. Reference: AGENT_QUICK_REFERENCE.md
   └─> Copy patterns and templates

4. Study: EXAMPLE_DEFI_AGENT.md
   └─> See advanced patterns and techniques
```

### For Quick Prototyping

```
1. Copy: AGENT_QUICK_REFERENCE.md (Agent Class Structure)
   └─> Get the minimal template

2. Reference: AGENT_QUICK_REFERENCE.md (Integration Checklist)
   └─> Follow the checklist

3. Build and test!
```

---

## 🎯 Key Concepts Summary

### The Multi-Agent System

Nanobrowser uses **specialized agents** that work together:

| Agent          | Role       | Responsibility                                             |
| -------------- | ---------- | ---------------------------------------------------------- |
| **Navigator**  | Executor   | Performs concrete web actions (click, type, navigate)      |
| **Planner**    | Strategist | High-level planning, task validation, completion detection |
| **Your Agent** | Specialist | Custom logic for your specific use case                    |

### Agent Lifecycle

```
1. User submits task
2. Executor initializes agents
3. Loop:
   - Planner assesses progress (periodic)
   - Navigator executes actions (every step)
   - Your agent runs (when appropriate)
4. Task completes or fails
5. Cleanup and store history
```

### Key Components

- **BaseAgent**: All agents inherit from this
- **AgentContext**: Shared state between agents
- **Executor**: Orchestrates agent execution
- **Actions**: Concrete browser operations
- **BrowserContext**: Browser automation interface
- **MessageManager**: Conversation history
- **EventManager**: UI event publishing

---

## 💡 Common Use Cases

### 1. Create a Specialized Analysis Agent

**Example:** Security auditor, SEO analyzer, accessibility checker

**What to read:**

- AGENT_ARCHITECTURE_GUIDE.md (Section 4)
- EXAMPLE_DEFI_AGENT.md (Agent Class section)

### 2. Add Custom Actions

**Example:** Custom form filling, specialized scraping, API calls

**What to read:**

- AGENT_QUICK_REFERENCE.md (Action Creation section)
- EXAMPLE_DEFI_AGENT.md (Custom DeFi Actions section)

### 3. Multi-Agent Coordination

**Example:** One agent validates another's work, agents share findings

**What to read:**

- AGENT_ARCHITECTURE_GUIDE.md (Section 9: Advanced Topics)
- AGENT_QUICK_REFERENCE.md (Pattern 3: Store Result for Other Agents)

### 4. Custom LLM Integration

**Example:** Use different models for different agents

**What to read:**

- AGENT_ARCHITECTURE_GUIDE.md (Section 9: Custom LLM Integration)

---

## 🛠️ Development Workflow

### Step 1: Plan Your Agent

**Questions to answer:**

- What is the agent's specific purpose?
- What information does it need?
- What should it output?
- When should it run in the execution loop?

### Step 2: Create the Agent

**Files to create:**

```
chrome-extension/src/background/agent/
├── agents/your-agent.ts        (agent implementation)
└── prompts/your-prompt.ts      (system prompt)
```

**Use templates from:** AGENT_QUICK_REFERENCE.md

### Step 3: Integrate with Executor

**File to modify:**

```
chrome-extension/src/background/agent/executor.ts
```

**Reference:** EXAMPLE_DEFI_AGENT.md (Section 3)

### Step 4: (Optional) Add Custom Actions

**Files to modify:**

```
chrome-extension/src/background/agent/actions/
├── schemas.ts   (action schemas)
└── builder.ts   (action implementations)
```

**Reference:** AGENT_QUICK_REFERENCE.md (Action Creation)

### Step 5: Test

```bash
# Build
pnpm build

# Load in Chrome
chrome://extensions/ -> Load unpacked -> Select dist/

# Test with tasks
# Monitor background service worker console for logs
```

---

## 📖 Code Examples Index

### Minimal Agent Template

→ **AGENT_QUICK_REFERENCE.md** - "Agent Class Structure"

### Complete Agent Implementation

→ **EXAMPLE_DEFI_AGENT.md** - "Agent Class"

### Specialized Prompts

→ **EXAMPLE_DEFI_AGENT.md** - "Agent Prompt"

### Custom Actions

→ **EXAMPLE_DEFI_AGENT.md** - "Custom DeFi Actions"

### Browser Automation

→ **AGENT_QUICK_REFERENCE.md** - "Browser Context"

### Event Handling

→ **AGENT_QUICK_REFERENCE.md** - "Event Manager"

### Error Handling

→ **AGENT_QUICK_REFERENCE.md** - "Common Pitfalls"

---

## 🐛 Troubleshooting

### My agent isn't executing

**Check:**

1. Is it registered in `executor.ts`?
2. Is it initialized in the constructor?
3. Is it called in the execution loop?
4. Check the background service worker console for errors

**See:** AGENT_QUICK_REFERENCE.md - "Integration Checklist"

### LLM returns invalid output

**Check:**

1. Is your Zod schema correct?
2. Is your prompt clear about the required format?
3. Try with `withStructuredOutput: true`
4. Add validation and error handling

**See:** AGENT_QUICK_REFERENCE.md - "Common Pitfalls"

### Agent crashes the extension

**Check:**

1. Are you handling all errors with try-catch?
2. Are you checking `context.paused` and `context.stopped`?
3. Are you using the logger for debugging?

**See:** AGENT_QUICK_REFERENCE.md - "Debugging Tips"

### Agent doesn't see browser state

**Check:**

1. Are you calling `browserContext.getState()`?
2. Are you using the correct context reference?
3. Check if the page has loaded

**See:** AGENT_QUICK_REFERENCE.md - "Pattern 1: Analyze Current Page"

---

## 🔗 Related Files

### Core System Files

```
chrome-extension/src/background/
├── index.ts                    # Entry point
├── agent/
│   ├── executor.ts             # Main orchestrator
│   ├── types.ts                # Type definitions
│   ├── agents/
│   │   ├── base.ts             # Base agent class
│   │   ├── navigator.ts        # Navigator agent
│   │   └── planner.ts          # Planner agent
│   ├── actions/
│   │   ├── builder.ts          # Action builder
│   │   └── schemas.ts          # Action schemas
│   └── prompts/
│       ├── base.ts             # Base prompt
│       ├── navigator.ts        # Navigator prompt
│       └── planner.ts          # Planner prompt
└── browser/
    └── context.ts              # Browser automation
```

### Storage Configuration

```
packages/storage/lib/
├── agent-models/index.ts       # Agent model settings
└── general-settings/index.ts   # General settings
```

### UI Components

```
pages/side-panel/src/
└── components/                 # UI components
```

---

## 🤝 Contributing

If you create an interesting agent, consider:

1. **Documenting it**: Share your implementation
2. **Creating a PR**: Contribute back to the project
3. **Sharing insights**: What worked well? What didn't?

---

## 📝 Quick Links

- [Main README](./README.md) - Project overview
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Development Guide](./AGENTS.md) - Original development documentation

---

## ❓ FAQ

### Can I create multiple specialized agents?

**Yes!** You can create as many agents as you need. Each agent can have a specific responsibility.

### Can agents communicate with each other?

**Yes!** Through:

- Shared `AgentContext`
- Message history
- Action results
- Event system

See: AGENT_ARCHITECTURE_GUIDE.md (Section 9)

### Can I use different LLMs for different agents?

**Yes!** Each agent can have its own LLM configuration.

See: AGENT_ARCHITECTURE_GUIDE.md (Section 9: Custom LLM Integration)

### Do I need to modify the UI for my agent?

**Not necessarily.** Agents can emit events that appear in the chat. But you can add custom UI components if needed.

See: EXAMPLE_DEFI_AGENT.md (Integration with UI)

### Can my agent call external APIs?

**Yes!** Agents run in the background service worker and can make HTTP requests. Just be mindful of CORS and Chrome extension permissions.

### How do I debug my agent?

Use the logger, emit events, check the background service worker console, and store intermediate results.

See: AGENT_QUICK_REFERENCE.md (Debugging Tips)

---

## 🎓 Learning Resources

### Official Documentation

- [LangChain JS](https://js.langchain.com/docs/)
- [Zod](https://zod.dev/)
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/)

### Nanobrowser Docs

- [Architecture Guide](./AGENT_ARCHITECTURE_GUIDE.md)
- [DeFi Example](./EXAMPLE_DEFI_AGENT.md)
- [Quick Reference](./AGENT_QUICK_REFERENCE.md)

---

## 📞 Getting Help

1. Check the **Troubleshooting** section above
2. Review the **Common Pitfalls** in AGENT_QUICK_REFERENCE.md
3. Look at the **EXAMPLE_DEFI_AGENT.md** for working code
4. Check the project's GitHub issues

---

## ✅ Next Steps

**You're ready to start building!**

1. Choose which documentation to read based on your experience level
2. Follow the getting started path
3. Use the templates and examples
4. Build something amazing!

---

**Happy Agent Building! 🤖✨**

_Last updated: October 2025_

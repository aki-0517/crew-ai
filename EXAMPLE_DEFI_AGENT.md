# Example: Creating a DeFi Agent for Nanobrowser

This is a practical example showing how to create a specialized DeFi agent that can analyze DeFi protocols, check smart contract risks, and provide transaction recommendations.

## Complete Implementation

### 1. Agent Class

File: `chrome-extension/src/background/agent/agents/defi.ts`

```typescript
import { z } from 'zod';
import { BaseAgent, type BaseAgentOptions, type ExtraAgentOptions } from './base';
import { createLogger } from '@src/background/log';
import type { AgentOutput } from '../types';
import { HumanMessage } from '@langchain/core/messages';
import { Actors, ExecutionState } from '../event/types';
import {
  isAbortedError,
  isAuthenticationError,
  isBadRequestError,
  isForbiddenError,
  ChatModelAuthError,
  ChatModelBadRequestError,
  ChatModelForbiddenError,
  RequestCancelledError,
} from './errors';

const logger = createLogger('DeFiAgent');

// Define the output schema for DeFi analysis
export const defiAnalysisSchema = z.object({
  protocol_name: z.string().describe('Name of the DeFi protocol'),
  protocol_type: z.enum(['DEX', 'Lending', 'Staking', 'Bridge', 'Yield', 'Other']),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']),
  risk_factors: z.array(z.string()).describe('List of identified risks'),
  apr_apy: z.string().nullable().describe('APR or APY if available'),
  tvl: z.string().nullable().describe('Total Value Locked if available'),
  audit_status: z.enum(['Audited', 'Unaudited', 'Unknown']),
  audit_firms: z.array(z.string()).describe('List of audit firms'),
  recommended_action: z.enum(['Proceed', 'Proceed with Caution', 'Do Not Proceed']),
  confidence: z.number().min(0).max(1).describe('Confidence in the analysis (0-1)'),
  explanation: z.string().describe('Detailed explanation of the analysis'),
  additional_checks: z.array(z.string()).describe('Additional checks recommended'),
});

export type DeFiAnalysis = z.infer<typeof defiAnalysisSchema>;

/**
 * DeFi Agent - Specialized agent for analyzing DeFi protocols and transactions
 *
 * This agent can:
 * - Analyze DeFi protocol safety and risks
 * - Extract key metrics (APY, TVL, etc.)
 * - Check for audit reports
 * - Provide transaction recommendations
 * - Identify common DeFi risks (rug pulls, smart contract vulnerabilities, etc.)
 */
export class DeFiAgent extends BaseAgent<typeof defiAnalysisSchema, DeFiAnalysis> {
  constructor(options: BaseAgentOptions, extraOptions?: Partial<ExtraAgentOptions>) {
    super(defiAnalysisSchema, options, { ...extraOptions, id: 'defi' });
  }

  async execute(): Promise<AgentOutput<DeFiAnalysis>> {
    const agentOutput: AgentOutput<DeFiAnalysis> = {
      id: this.id,
    };

    try {
      // Emit start event
      await this.context.emitEvent(Actors.SYSTEM, ExecutionState.STEP_START, 'DeFi Agent analyzing protocol...');

      // Get current browser state
      const browserState = await this.context.browserContext.getState(false);
      const currentUrl = browserState.url;
      const pageTitle = browserState.title;

      // Get visible text from page
      const pageText = browserState.elementTree.getVisibleText();

      // Prepare analysis query
      const analysisQuery = `Analyze this DeFi protocol page:

URL: ${currentUrl}
Page Title: ${pageTitle}

Page Content (first 5000 chars):
${pageText.substring(0, 5000)}

Perform a comprehensive DeFi security and viability analysis.
Extract key metrics if available.
Identify any red flags or security concerns.`;

      // Get message history
      const messages = this.context.messageManager.getMessages();

      // Prepare input for LLM
      const inputMessages = [
        this.prompt.getSystemMessage(),
        ...messages.slice(-5), // Include last 5 messages for context
        new HumanMessage(analysisQuery),
      ];

      // Invoke LLM with structured output
      logger.info('Invoking DeFi analysis LLM...');
      const modelOutput = await this.invoke(inputMessages);

      if (!modelOutput) {
        throw new Error('Failed to validate DeFi analysis output');
      }

      logger.info('DeFi Analysis Result:', {
        protocol: modelOutput.protocol_name,
        risk: modelOutput.risk_level,
        recommendation: modelOutput.recommended_action,
        confidence: modelOutput.confidence,
      });

      // Store analysis in context for other agents to use
      this.context.actionResults.push({
        isDone: false,
        success: true,
        extractedContent: JSON.stringify(modelOutput),
        error: null,
        includeInMemory: true,
        interactedElement: null,
      });

      // Emit completion event
      await this.context.emitEvent(
        Actors.SYSTEM,
        ExecutionState.STEP_OK,
        `DeFi Analysis: ${modelOutput.protocol_name} - Risk: ${modelOutput.risk_level} - ${modelOutput.recommended_action}`,
      );

      agentOutput.result = modelOutput;
      return agentOutput;
    } catch (error) {
      logger.error('DeFi agent execution failed:', error);

      // Handle specific errors
      if (isAbortedError(error)) {
        throw new RequestCancelledError('DeFi analysis was cancelled');
      }
      if (isAuthenticationError(error)) {
        throw new ChatModelAuthError('Authentication failed for DeFi analysis');
      }
      if (isBadRequestError(error)) {
        throw new ChatModelBadRequestError('Invalid request for DeFi analysis');
      }
      if (isForbiddenError(error)) {
        throw new ChatModelForbiddenError('Access forbidden for DeFi analysis');
      }

      // Emit failure event
      await this.context.emitEvent(
        Actors.SYSTEM,
        ExecutionState.STEP_FAIL,
        `DeFi analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      agentOutput.error = error instanceof Error ? error.message : String(error);
      return agentOutput;
    }
  }

  /**
   * Helper method to analyze a specific protocol by URL
   */
  async analyzeProtocol(protocolUrl: string): Promise<AgentOutput<DeFiAnalysis>> {
    // Navigate to the protocol
    await this.context.browserContext.getCurrentPage().navigate(protocolUrl);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Run analysis
    return await this.execute();
  }
}
```

### 2. Agent Prompt

File: `chrome-extension/src/background/agent/prompts/defi.ts`

```typescript
import { BasePrompt } from './base';
import { SystemMessage } from '@langchain/core/messages';

/**
 * Prompt for the DeFi Agent
 *
 * This prompt instructs the agent to be a DeFi security expert
 */
export class DeFiPrompt extends BasePrompt {
  getSystemMessage(): SystemMessage {
    const systemPrompt = `You are an expert DeFi (Decentralized Finance) security analyst and protocol researcher.

Your expertise includes:
- Smart contract security analysis
- DeFi protocol risk assessment
- Tokenomics evaluation
- Identifying rug pulls and scams
- Understanding yield farming mechanics
- Evaluating audit reports and audit firms
- Assessing Total Value Locked (TVL) and liquidity
- Analyzing APY/APR sustainability

Your role is to analyze DeFi protocols and provide comprehensive risk assessments.

CRITICAL ANALYSIS CHECKLIST:
1. Protocol Identification
   - What is the protocol name and type?
   - What blockchain is it on?

2. Risk Assessment
   - Is the protocol audited? By whom?
   - Are there any known vulnerabilities?
   - Is the team anonymous or doxxed?
   - What is the contract age and history?
   - Is there a time lock on admin functions?
   - Are there whale wallets or centralization risks?

3. Financial Metrics
   - What is the APY/APR?
   - Is the yield sustainable?
   - What is the TVL?
   - What are the token unlock schedules?

4. Red Flags to Watch For
   - Unrealistic APY (>1000% without explanation)
   - Anonymous team with no audit
   - Recently deployed contracts (<30 days)
   - Locked liquidity status
   - Centralized admin keys
   - Copycat contracts
   - No audit or audit by unknown firms
   - Suspicious token distribution

5. Recommendation
   - Should the user proceed?
   - What additional checks are needed?
   - What are the specific risks?

IMPORTANT:
- Be conservative in risk assessment
- Always recommend additional due diligence
- Flag any uncertainties clearly
- Provide specific, actionable recommendations
- If information is missing, mark it as "Unknown" rather than guessing

You must respond with a structured JSON object following the defiAnalysisSchema format.`;

    return new SystemMessage(systemPrompt);
  }
}
```

### 3. Integration with Executor

File: `chrome-extension/src/background/agent/executor.ts` (modifications)

```typescript
// Add imports at the top
import { DeFiAgent, type DeFiAnalysis } from './agents/defi';
import { DeFiPrompt } from './prompts/defi';

export class Executor {
  private readonly navigator: NavigatorAgent;
  private readonly planner: PlannerAgent;
  private readonly defi: DeFiAgent | null; // Add DeFi agent
  // ... existing fields ...

  constructor(
    task: string,
    taskId: string,
    browserContext: BrowserContext,
    navigatorLLM: BaseChatModel,
    extraArgs?: Partial<ExecutorExtraArgs>,
  ) {
    // ... existing initialization ...

    // Initialize DeFi agent if enabled in settings
    const defiEnabled = extraArgs?.generalSettings?.enableDeFiAgent ?? false;

    if (defiEnabled) {
      const defiLLM = extraArgs?.defiLLM ?? navigatorLLM;
      const defiPrompt = new DeFiPrompt();

      this.defi = new DeFiAgent({
        chatLLM: defiLLM,
        context: context,
        prompt: defiPrompt,
      });

      logger.info('DeFi Agent initialized');
    } else {
      this.defi = null;
    }

    this.context = context;
    // ... rest of constructor ...
  }

  async execute(): Promise<void> {
    logger.info(`🚀 Executing task: ${this.tasks[this.tasks.length - 1]}`);

    const context = this.context;
    context.nSteps = 0;
    const allowedMaxSteps = this.context.options.maxSteps;

    try {
      this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, this.context.taskId);

      // Check if this is a DeFi-related task
      const isDeFiTask = await this.checkIfDeFiTask(this.tasks[this.tasks.length - 1]);

      // If DeFi task and DeFi agent is enabled, run initial analysis
      if (isDeFiTask && this.defi) {
        logger.info('🏦 DeFi task detected, running initial protocol analysis...');
        const defiAnalysis = await this.defi.execute();

        if (defiAnalysis.result) {
          // Store analysis for navigator to use
          logger.info(`DeFi Analysis: ${defiAnalysis.result.protocol_name}`);
          logger.info(`Risk Level: ${defiAnalysis.result.risk_level}`);
          logger.info(`Recommendation: ${defiAnalysis.result.recommended_action}`);

          // If critical risk, potentially halt execution
          if (
            defiAnalysis.result.risk_level === 'Critical' &&
            defiAnalysis.result.recommended_action === 'Do Not Proceed'
          ) {
            logger.warn('⚠️  Critical risk detected, halting execution');
            this.context.emitEvent(
              Actors.SYSTEM,
              ExecutionState.TASK_FAIL,
              'Critical risk detected in DeFi protocol. Task halted for safety.',
            );
            return;
          }
        }
      }

      // Continue with normal execution loop
      let step = 0;
      let latestPlanOutput: AgentOutput<PlannerOutput> | null = null;
      let navigatorDone = false;

      for (step = 0; step < allowedMaxSteps; step++) {
        // ... existing loop code ...

        // Optionally re-run DeFi analysis after certain navigator actions
        if (this.defi && this.shouldRunDeFiRecheck(context)) {
          logger.info('🔄 Running DeFi re-check after navigation...');
          await this.defi.execute();
        }

        // ... rest of loop ...
      }

      // ... rest of execute method ...
    } catch (error) {
      // ... existing error handling ...
    }
  }

  /**
   * Check if the task is DeFi-related
   */
  private async checkIfDeFiTask(task: string): Promise<boolean> {
    const defiKeywords = [
      'defi',
      'swap',
      'stake',
      'yield',
      'farm',
      'pool',
      'liquidity',
      'apy',
      'apr',
      'token',
      'dex',
      'uniswap',
      'aave',
      'compound',
      'lend',
      'borrow',
      'collateral',
      'protocol',
      'smart contract',
      'ethereum',
      'bsc',
      'polygon',
      'arbitrum',
      'optimism',
    ];

    const lowerTask = task.toLowerCase();
    return defiKeywords.some(keyword => lowerTask.includes(keyword));
  }

  /**
   * Determine if DeFi agent should re-check after certain actions
   */
  private shouldRunDeFiRecheck(context: AgentContext): boolean {
    // Re-check if we've navigated to a new page
    const recentResults = context.actionResults.slice(-3);
    return recentResults.some(
      result => result.extractedContent?.includes('go_to_url') || result.extractedContent?.includes('switch_tab'),
    );
  }
}
```

### 4. Storage Configuration

File: `packages/storage/lib/agent-models/index.ts` (add to existing enum)

```typescript
export enum AgentNameEnum {
  Navigator = 'navigator',
  Planner = 'planner',
  DeFi = 'defi', // Add this
}
```

File: `packages/storage/lib/general-settings/index.ts` (add to config)

```typescript
export interface GeneralSettingsConfig {
  // ... existing settings ...
  enableDeFiAgent: boolean; // Add this
}

export const DEFAULT_SETTINGS: GeneralSettingsConfig = {
  // ... existing defaults ...
  enableDeFiAgent: true, // Enable by default
};
```

### 5. Custom DeFi Actions

File: `chrome-extension/src/background/agent/actions/schemas.ts` (add new actions)

```typescript
// DeFi-specific actions
export const checkContractAuditActionSchema: ActionSchema = {
  name: 'check_contract_audit',
  description: 'Check if a smart contract address has been audited',
  schema: z.object({
    intent: z.string().describe('purpose of this action'),
    contract_address: z.string().describe('Smart contract address to check'),
    chain: z.string().describe('Blockchain (ethereum, bsc, polygon, etc.)'),
  }),
};

export const extractTokenomicsActionSchema: ActionSchema = {
  name: 'extract_tokenomics',
  description: 'Extract tokenomics information from the current page',
  schema: z.object({
    intent: z.string().describe('purpose of this action'),
  }),
};

export const checkWalletBalanceActionSchema: ActionSchema = {
  name: 'check_wallet_balance',
  description: 'Check wallet balance and token holdings',
  schema: z.object({
    intent: z.string().describe('purpose of this action'),
    wallet_address: z.string().describe('Wallet address to check'),
  }),
};
```

File: `chrome-extension/src/background/agent/actions/builder.ts` (implement actions)

```typescript
export class ActionBuilder {
  // ... existing methods ...

  /**
   * Check if a smart contract has been audited
   */
  buildCheckContractAuditAction(): Action {
    return new Action(async (args: { contract_address: string; chain: string }) => {
      const { contract_address, chain } = args;
      logger.info(`Checking audit for contract ${contract_address} on ${chain}`);

      try {
        // Navigate to audit checking sites
        const auditSites = [
          `https://etherscan.io/address/${contract_address}`,
          `https://de.fi/scanner/contract/${contract_address}`,
        ];

        await this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.STEP_START,
          `Checking audit status for contract ${contract_address.substring(0, 10)}...`,
        );

        // Open first audit site
        const page = await this.context.browserContext.getCurrentPage();
        await page.navigate(auditSites[0]);
        await page.waitForPageLoad();

        // Extract page content
        const state = await this.context.browserContext.getState(false);
        const pageText = state.elementTree.getVisibleText();

        await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.STEP_OK, 'Contract information retrieved');

        return new ActionResult({
          success: true,
          extractedContent: `Contract audit check: ${pageText.substring(0, 1000)}`,
          includeInMemory: true,
        });
      } catch (error) {
        logger.error('Failed to check contract audit:', error);
        return new ActionResult({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, checkContractAuditActionSchema);
  }

  /**
   * Extract tokenomics information
   */
  buildExtractTokenomicsAction(): Action {
    return new Action(async () => {
      logger.info('Extracting tokenomics information');

      try {
        const state = await this.context.browserContext.getState(true);
        const pageText = state.elementTree.getVisibleText();

        // Look for common tokenomics keywords
        const tokenomicsKeywords = [
          'total supply',
          'circulating supply',
          'market cap',
          'token distribution',
          'vesting',
          'unlock schedule',
          'tokenomics',
          'token allocation',
        ];

        const relevantInfo: string[] = [];
        const lines = pageText.split('\n');

        for (const line of lines) {
          if (tokenomicsKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
            relevantInfo.push(line.trim());
          }
        }

        return new ActionResult({
          success: true,
          extractedContent: `Tokenomics: ${relevantInfo.join(' | ')}`,
          includeInMemory: true,
        });
      } catch (error) {
        return new ActionResult({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, extractTokenomicsActionSchema);
  }

  buildDefaultActions(): Action[] {
    return [
      // ... existing actions ...
      this.buildCheckContractAuditAction(),
      this.buildExtractTokenomicsAction(),
    ];
  }
}
```

### 6. Usage Examples

```typescript
// Example 1: Analyze a DeFi protocol
// User task: "Analyze the Uniswap protocol on uniswap.org"
// The DeFi agent will automatically:
// - Navigate to uniswap.org
// - Extract protocol information
// - Check for audits
// - Assess risk level
// - Provide recommendations

// Example 2: Check if a protocol is safe
// User task: "Is compound.finance safe to use?"
// Result:
// {
//   protocol_name: "Compound Finance",
//   protocol_type: "Lending",
//   risk_level: "Low",
//   audit_status: "Audited",
//   audit_firms: ["Trail of Bits", "OpenZeppelin"],
//   recommended_action: "Proceed",
//   confidence: 0.95,
//   explanation: "Compound is a well-established lending protocol..."
// }

// Example 3: Analyze suspicious DeFi site
// User task: "Check sketchy-defi-project.xyz"
// Result:
// {
//   protocol_name: "Unknown Protocol",
//   protocol_type: "Yield",
//   risk_level: "Critical",
//   risk_factors: [
//     "No audit found",
//     "Anonymous team",
//     "Unrealistic APY (5000%)",
//     "Recently deployed (<7 days)",
//     "Copycat of existing protocol"
//   ],
//   recommended_action: "Do Not Proceed",
//   confidence: 0.85,
//   explanation: "Multiple critical red flags detected..."
// }
```

## Integration with UI

To display DeFi analysis in the side panel:

File: `pages/side-panel/src/components/ChatMessage.tsx` (add)

```typescript
// Add rendering for DeFi analysis results
if (message.type === 'defi_analysis') {
  const analysis = JSON.parse(message.content) as DeFiAnalysis;

  return (
    <div className="defi-analysis-card">
      <h3>{analysis.protocol_name}</h3>
      <div className={`risk-badge risk-${analysis.risk_level.toLowerCase()}`}>
        Risk: {analysis.risk_level}
      </div>
      <p>{analysis.explanation}</p>
      <ul>
        {analysis.risk_factors.map((risk, i) => (
          <li key={i}>{risk}</li>
        ))}
      </ul>
      <div className="recommendation">
        {analysis.recommended_action}
      </div>
    </div>
  );
}
```

## Testing the DeFi Agent

```bash
# 1. Build the extension
pnpm build

# 2. Load in Chrome
# chrome://extensions/ -> Load unpacked -> Select dist/

# 3. Test with DeFi sites:
# - "Analyze uniswap.org"
# - "Check if aave.com is safe"
# - "What are the risks of using curve.fi?"
```

## Next Steps

1. **Enhance with external APIs**:
   - Integrate with DeFiLlama API for TVL data
   - Use Etherscan API for contract verification
   - Add CoinGecko API for token prices

2. **Add more DeFi-specific actions**:
   - Check rugpull history
   - Analyze wallet transactions
   - Compare similar protocols
   - Track whale movements

3. **Improve risk assessment**:
   - Machine learning models for scam detection
   - Historical data analysis
   - Social sentiment analysis

4. **Add transaction simulation**:
   - Simulate transactions before execution
   - Estimate gas costs
   - Check for sandwich attacks

This DeFi agent demonstrates the power and flexibility of the nanobrowser agent architecture! 🚀

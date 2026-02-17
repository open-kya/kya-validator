/**
 * Agent Control Panel - Controls for managing agent interactions.
 */
import { useState, useEffect, useRef } from 'react';
import { useDemoStore, PromptConfig } from '../../store/demoStore';
import { AgentMode, AgentMessage, MessageType, ClientType } from '../../types/demoTypes';
import { demoApi } from '../../api/demoApi';
import RecipientApiView from './RecipientApiView';
import PromptEditor from './PromptEditor';
import PromptSelector from './PromptSelector';
import ParameterEditor from './ParameterEditor';
import PromptPreview from './PromptPreview';
import ScenarioSelector from './ScenarioSelector';

// Expanded message templates for variety
const MESSAGE_TEMPLATES = [
  { id: 'procure', label: 'Procure Services', content: 'I need to procure cloud infrastructure services.' },
  { id: 'quote', label: 'Get Quote', content: 'Can you provide a quote for GPU inference services?' },
  { id: 'negotiate', label: 'Negotiate Terms', content: 'I would like to negotiate better pricing terms.' },
  { id: 'support', label: 'Request Support', content: 'I need technical support for my deployment.' },
];

// Expanded message pools for auto-send and variety
const PROCUREMENT_MESSAGES = [
  "I need to procure GPU compute resources for ML training",
  "Looking for inference services with low latency",
  "Need data pipeline solutions for real-time processing",
  "Requesting storage solutions for large datasets",
  "What are your pricing tiers for compute_gpu services?",
  "Do you offer bulk discounts for long-term commitments?",
  "Can you provide availability for 100 GPU nodes next week?",
  "I need a custom solution for distributed training",
  "What GPU instance types do you have available?",
  "Looking for high-performance storage for model checkpoints",
  "Need scalable inference endpoints for production",
  "What's your capacity for burst workloads?",
  "I need managed Kubernetes with GPU support",
  "Can you provide dedicated GPU clusters?",
  "What are your SLA guarantees for compute services?",
];

const QUOTE_MESSAGES = [
  "Can you provide a quote for GPU inference services?",
  "I need pricing for 50 A100 GPU instances monthly",
  "What's the cost for 100TB of high-speed storage?",
  "Requesting a quote for data pipeline orchestration",
  "Can you give me a quote for real-time inference at 10k QPS?",
  "I need pricing for managed MLflow deployment",
  "What's your rate for on-demand GPU instances?",
  "Can you provide a quote for spot GPU instances?",
  "I need pricing for multi-region deployment",
  "What's the cost for dedicated GPU nodes?",
  "Requesting a quote for model serving infrastructure",
  "I need pricing for data preprocessing pipelines",
  "Can you give me a quote for batch inference jobs?",
  "What's your pricing for GPU-accelerated databases?",
  "I need a quote for edge deployment solutions",
];

const NEGOTIATION_MESSAGES = [
  "I would like to negotiate better pricing terms",
  "Can we discuss volume discounts for annual contracts?",
  "I need a more competitive rate for our enterprise needs",
  "What terms can you offer for 3-year commitments?",
  "Can you improve the SLA guarantees?",
  "I need more flexible billing options",
  "Can we negotiate a better rate for reserved instances?",
  "What incentives do you offer for early payment?",
  "I need custom terms for our compliance requirements",
  "Can you include premium support in the base package?",
  "I need better pricing for multi-region deployment",
  "What's your best offer for enterprise customers?",
  "Can we negotiate a trial period before commitment?",
  "I need more favorable terms for data egress",
  "What discounts can you offer for prepayment?",
];

const SUPPORT_MESSAGES = [
  "I need technical support for my deployment",
  "Having issues with GPU instance provisioning",
  "Need help with data pipeline configuration",
  "Experiencing latency issues in inference endpoints",
  "Can you help debug my model deployment?",
  "I need assistance with authentication setup",
  "Having trouble with storage mount points",
  "Need help configuring auto-scaling policies",
  "Can you assist with network configuration?",
  "I need support for custom framework integration",
  "Having issues with model versioning",
  "Need help with monitoring and alerting setup",
  "Can you assist with backup and recovery?",
  "I need support for cross-region replication",
  "Having trouble with API rate limiting",
];

const CONTEXTUAL_MESSAGES: Record<string, string[]> = {
  landing: [
    "Hello, I'm looking for cloud AI services",
    "I need to understand your service offerings",
    "What solutions do you provide for ML workloads?",
  ],
  select_category: [
    "I'm interested in compute services",
    "Looking for data processing solutions",
    "Need inference capabilities for my models",
  ],
  select_sku: [
    "What GPU options do you recommend?",
    "Can you suggest the right instance type?",
    "I need guidance on service selection",
  ],
  policy_check: [
    "I need to validate your manifest against our policies",
    "Let me check the compliance requirements",
    "Verifying the policy constraints",
  ],
  manifest_check: [
    "I'm reviewing your KYA manifest",
    "Checking manifest validation status",
    "Need to verify manifest compliance",
  ],
  quote: [
    "Please provide a detailed quote",
    "I need pricing breakdown",
    "Can you send me the quote document?",
  ],
  confirm_order: [
    "I'm ready to proceed with the order",
    "Let's finalize the agreement",
    "I confirm the purchase terms",
  ],
};

// Helper function to get random message from pool
const getRandomMessage = (pool: string[]): string => {
  return pool[Math.floor(Math.random() * pool.length)];
};

// Helper function to get contextual message based on workflow state
const getContextualMessage = (workflowState: string | null): string | null => {
  if (!workflowState) return null;
  const messages = CONTEXTUAL_MESSAGES[workflowState];
  if (!messages) return null;
  return getRandomMessage(messages);
};

export default function AgentControlPanel() {
  const {
    agentMode,
    clientType,
    sessionId,
    isSessionActive,
    isConnected,
    workflowState,
    workflowContext,
    sendMessage,
    setWorkflowState,
    setWorkflowContext,
    setValidationContext,
    addMessage,
    setExchangeStatus,
    promptEditMode,
    setPromptEditMode,
    updatePrompt,
    currentPrompt,
    setPromptParameters,
    currentScenario,
    scenarioParameters,
  } = useDemoStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isAutoSending, setIsAutoSending] = useState<boolean>(false);
  const [autoSendInterval, setAutoSendInterval] = useState<number>(3000); // 3 seconds
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  const [messagesSent, setMessagesSent] = useState<number>(0);
  const [showApiDocs, setShowApiDocs] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptConfig | null>(null);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = async (content: string) => {
    if (!sessionId) {
      console.error('No session ID');
      return;
    }

    // Create message from user to agent
    const message: AgentMessage = {
      message_id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message_type: MessageType.AGENT_MESSAGE,
      sender: 'user',
      recipient: 'procurement_agent',
      content,
    };

    try {
      // Add user message to store
      addMessage(message);
      
      // Use REST API to send message
      const response = await demoApi.sendAgentMessage(sessionId, message);
      
      // Handle new exchange response format from backend
      // Backend returns: { exchange_status, visible_reason, incoming_message?, procurement_message?, recipient_message? }
      if (response) {
        const typedResponse = response as {
          exchange_status?: 'success' | 'degraded' | 'failed';
          visible_reason?: string;
          incoming_message?: AgentMessage;
          procurement_message?: AgentMessage;
          recipient_message?: AgentMessage;
        };
        
        // Update exchange status if provided
        if (typedResponse.exchange_status) {
          setExchangeStatus(typedResponse.exchange_status, typedResponse.visible_reason);
        }
        
        // Add incoming message (echo of user message) if present
        if (typedResponse.incoming_message) {
          addMessage(typedResponse.incoming_message);
        }
        
        // Add procurement agent message
        if (typedResponse.procurement_message) {
          addMessage(typedResponse.procurement_message);
        }
        
        // Add recipient agent message
        if (typedResponse.recipient_message) {
          addMessage(typedResponse.recipient_message);
        }
      }
      
      setLastSentTime(Date.now());
      setMessagesSent((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Auto-send message functionality with variety
  useEffect(() => {
    if (isAutoSending && isSessionActive && isConnected) {
      autoSendTimerRef.current = setInterval(() => {
        // Use contextual message if available, otherwise random from all pools
        const contextualMsg = getContextualMessage(workflowState);
        let messageToSend: string;
        
        if (contextualMsg) {
          messageToSend = contextualMsg;
        } else {
          // Combine all message pools for variety
          const allMessages = [
            ...PROCUREMENT_MESSAGES,
            ...QUOTE_MESSAGES,
            ...NEGOTIATION_MESSAGES,
            ...SUPPORT_MESSAGES,
          ];
          messageToSend = getRandomMessage(allMessages);
        }
        
        handleSendMessage(messageToSend);
      }, autoSendInterval);
    } else {
      if (autoSendTimerRef.current) {
        clearInterval(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    }

    return () => {
      if (autoSendTimerRef.current) {
        clearInterval(autoSendTimerRef.current);
      }
    };
  }, [isAutoSending, autoSendInterval, isSessionActive, isConnected, workflowState]);

  const toggleAutoSend = () => {
    setIsAutoSending((prev) => !prev);
    if (!isAutoSending) {
      setMessagesSent(0);
    }
  };

  const handleValidateManifest = async () => {
    if (!sessionId) {
      console.error('No session ID');
      return;
    }

    try {
      // Simulate manifest validation
      const manifestData = {
        id: `manifest-${Date.now()}`,
        name: 'Demo Manifest',
        version: '1.0.0',
        provider: 'demo_provider',
        services: ['gpu_inference', 'data_pipeline'],
      };

      const result = await demoApi.validateManifest({
        message_id: `validation-${Date.now()}`,
        timestamp: new Date().toISOString(),
        message_type: MessageType.VALIDATION_REQUEST,
        manifest_data: manifestData,
        validation_type: 'manifest',
      });

      setValidationContext(result as any);
    } catch (error) {
      console.error('Failed to validate manifest:', error);
    }
  };

  const handleTriggerWorkflow = async () => {
    if (!sessionId) {
      console.error('No session ID');
      return;
    }

    try {
      // Trigger workflow transition
      // Valid states: landing, select_category, select_sku, policy_check,
      // manifest_check, quote, confirm_order, error, complete
      // Workflow starts at 'landing' and can transition to 'select_category'
      const workflowId = `workflow-${sessionId}`;
      const step = await demoApi.workflowTransition(workflowId, 'select_category');
      
      setWorkflowState(step.step_name);
      setWorkflowContext(step.result as any || {});
    } catch (error: any) {
      console.error('Failed to trigger workflow:', error);
      const errorMessage = error?.detail || error?.message || 'Failed to trigger workflow';
      addMessage({
        message_id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        message_type: MessageType.AGENT_MESSAGE,
        sender: 'system',
        recipient: 'user',
        content: `Workflow error: ${errorMessage}`,
      });
    }
  };

  const handleCategorySelect = async (category: string) => {
    if (!sessionId) {
      console.error('No session ID');
      return;
    }

    setSelectedCategory(category);

    try {
      const workflowId = `workflow-${sessionId}`;
      const step = await demoApi.workflowTransition(workflowId, 'select_sku');
      
      setWorkflowState(step.step_name);
      setWorkflowContext(step.result as any || {});
    } catch (error: any) {
      console.error('Failed to select category:', error);
      const errorMessage = error?.detail || error?.message || 'Failed to select category';
      addMessage({
        message_id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        message_type: MessageType.AGENT_MESSAGE,
        sender: 'system',
        recipient: 'user',
        content: `Category selection error: ${errorMessage}`,
      });
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1v-2.25c0-1.2-.9 2.25-2.25s2 .9 2.25V17c0 1.2-.9 2.25-2.25S10.8 14.75 9.75 17z"
          />
        </svg>
        Agent Control Panel
      </h2>

      {/* Agent Mode Indicator */}
      <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Current Mode</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              agentMode === AgentMode.LLM
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {agentMode === AgentMode.LLM ? 'Real LLM' : 'Simulated'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {agentMode === AgentMode.LLM
            ? 'Using real LLM for agent reasoning (requires API key)'
            : 'Using deterministic simulation for demo purposes'}
        </p>
      </div>

      {/* Workflow State */}
      {workflowState && (
        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
          <span className="text-sm font-medium text-slate-300">Workflow State</span>
          <div className="mt-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-mono">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {workflowState}
            </span>
          </div>
        </div>
      )}

      {/* Auto-Send Controls */}
      <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoSend}
              disabled={!isSessionActive || !isConnected}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAutoSending ? 'bg-cyan-500' : 'bg-slate-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAutoSending ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-slate-300">Auto-Send Messages</span>
          </div>
          {isAutoSending && (
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Active ({messagesSent} sent)</span>
            </div>
          )}
        </div>
        {isAutoSending && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Interval (ms):</label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={autoSendInterval}
              onChange={(e) => setAutoSendInterval(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-300 font-mono w-12">{autoSendInterval}ms</span>
          </div>
        )}
      </div>

      {/* Quick Action Message Buttons */}
      <div className="mb-4">
        <span className="text-sm font-medium text-slate-300 mb-2 block">Quick Actions</span>
        <div className="grid grid-cols-2 gap-2">
          {MESSAGE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSendMessage(template.content)}
              disabled={!isSessionActive || !isConnected}
              className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Message Input */}
      <div className="mb-4">
        <span className="text-sm font-medium text-slate-300 mb-2 block">Custom Message</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Type a custom message..."
            disabled={!isSessionActive || !isConnected}
            className="flex-1 bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onKeyPress={(e) => e.key === 'Enter' && customMessage && handleSendMessage(customMessage)}
          />
          <button
            onClick={() => customMessage && handleSendMessage(customMessage)}
            disabled={!isSessionActive || !isConnected || !customMessage}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
          >
            Send
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={handleValidateManifest}
          disabled={!isSessionActive}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4 6 2v10m-6 0v-4m0 0h6m-6 0h6"
            />
          </svg>
          Validate Manifest
        </button>
        <button
          onClick={handleTriggerWorkflow}
          disabled={!isSessionActive}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9 11h-7z"
            />
          </svg>
          Start Workflow
        </button>
      </div>

      {/* Category Selection */}
      {workflowState === 'select_category' &&
        workflowContext.available_categories &&
        Array.isArray(workflowContext.available_categories as unknown[]) && (
          <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <span className="text-sm font-medium text-slate-300">Select Category</span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(workflowContext.available_categories as string[]).map((category: string) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  disabled={!isSessionActive}
                  className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm"
                >
                  {category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Workflow Context */}
      {Object.keys(workflowContext as Record<string, unknown>).length > 0 && (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
          <span className="text-sm font-medium text-slate-300">Workflow Context</span>
          <div className="mt-2 space-y-2">
            {Object.entries(workflowContext).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-slate-400">{key}</span>
                <span className="text-slate-200 font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSessionActive && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400 text-center">
            Start a session to enable agent controls
          </p>
        </div>
      )}

      {isSessionActive && !isConnected && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400 text-center">
            Connecting to backend... Please wait.
          </p>
        </div>
      )}

      {/* API Documentation Toggle */}
      {isSessionActive && (
        <div className="mt-4">
          <button
            onClick={() => setShowApiDocs(!showApiDocs)}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {showApiDocs ? 'Hide API Documentation' : 'View API Documentation'}
          </button>
        </div>
      )}

      {/* Recipient API Documentation View */}
      {(showApiDocs || clientType === ClientType.AGENT_RECEIVER) && (
        <div className="mt-4">
          <RecipientApiView />
        </div>
      )}

      {/* Scenario Selection Section */}
      <div className="mt-4">
        <ScenarioSelector
          onScenarioApply={async (scenarioType, params) => {
            // Apply scenario to backend
            if (sessionId) {
              try {
                await demoApi.setScenario(sessionId, scenarioType, params);
              } catch (error) {
                console.error('Failed to apply scenario:', error);
              }
            }
          }}
        />
      </div>

      {/* Prompt Editing Section */}
      <div className="mt-4">
        <button
          onClick={() => setPromptEditMode(!promptEditMode)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          {promptEditMode ? 'Close Prompt Editor' : 'Edit Prompts'}
        </button>
      </div>

      {/* Prompt Editor Panel */}
      {promptEditMode && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Prompt Selector and Editor */}
          <div className="space-y-4">
            <PromptSelector onEditPrompt={(prompt) => setEditingPrompt(prompt)} />
            
            {editingPrompt && (
              <>
                <PromptEditor
                  prompt={editingPrompt}
                  onSave={async (prompt) => {
                    await updatePrompt(prompt);
                    setEditingPrompt(null);
                  }}
                  onCancel={() => setEditingPrompt(null)}
                />
                <ParameterEditor
                  prompt={editingPrompt}
                  onParametersChange={setPromptParameters}
                />
              </>
            )}
          </div>

          {/* Right Column - Preview */}
          <div>
            <PromptPreview prompt={currentPrompt} />
          </div>
        </div>
      )}
    </div>
  );
}

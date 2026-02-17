/**
 * PromptSelector - Component for selecting agent prompts.
 */
import { useEffect } from 'react';
import { useDemoStore, AgentType, PromptConfig } from '../../store/demoStore';

interface PromptSelectorProps {
  onEditPrompt: (prompt: PromptConfig) => void;
}

export default function PromptSelector({ onEditPrompt }: PromptSelectorProps) {
  const {
    prompts,
    selectedAgentType,
    setSelectedAgentType,
    currentPrompt,
    selectPrompt,
    loadPrompts,
  } = useDemoStore();

  // Load prompts when agent type changes
  useEffect(() => {
    loadPrompts(selectedAgentType);
  }, [selectedAgentType, loadPrompts]);

  const agentPrompts = prompts[selectedAgentType];

  const handleAgentTypeChange = (agentType: AgentType) => {
    setSelectedAgentType(agentType);
  };

  const handlePromptSelect = (prompt: PromptConfig) => {
    selectPrompt(prompt);
  };

  const getAgentTypeLabel = (agentType: AgentType): string => {
    switch (agentType) {
      case 'procurement':
        return 'Procurement Agent';
      case 'recipient':
        return 'Recipient Agent';
      default:
        return agentType;
    }
  };

  const getAgentTypeColor = (agentType: AgentType): string => {
    switch (agentType) {
      case 'procurement':
        return 'from-blue-500 to-cyan-600';
      case 'recipient':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">Select Prompt</h3>

      {/* Agent Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Agent Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['procurement', 'recipient'] as AgentType[]).map((agentType) => (
            <button
              key={agentType}
              onClick={() => handleAgentTypeChange(agentType)}
              className={`relative overflow-hidden rounded-lg p-4 transition-all duration-200 ${
                selectedAgentType === agentType
                  ? `bg-gradient-to-r ${getAgentTypeColor(agentType)} text-white shadow-lg`
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedAgentType === agentType ? 'bg-white/20' : 'bg-slate-600'
                }`}>
                  {agentType === 'procurement' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">
                    {getAgentTypeLabel(agentType)}
                  </div>
                  <div className="text-xs opacity-75">
                    {agentPrompts?.length || 0} prompts available
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt List */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Available Prompts
        </label>
        {agentPrompts && agentPrompts.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {agentPrompts.map((prompt) => (
              <div
                key={prompt.name}
                onClick={() => handlePromptSelect(prompt)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentPrompt?.name === prompt.name
                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                    : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white text-sm">
                        {prompt.name}
                      </h4>
                      <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs">
                        v{prompt.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {prompt.description}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPrompt(prompt);
                    }}
                    className="ml-3 p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Edit prompt"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>

                {/* Parameters Preview */}
                {Object.keys(prompt.parameters || {}).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.keys(prompt.parameters).map((param) => (
                      <span
                        key={param}
                        className="px-2 py-0.5 bg-slate-600/50 text-slate-300 rounded text-xs font-mono"
                      >
                        {`{${param}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-700/30 rounded-lg border border-dashed border-slate-600">
            <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-slate-400">
              No prompts available for {getAgentTypeLabel(selectedAgentType)}
            </p>
          </div>
        )}
      </div>

      {/* Selected Prompt Preview */}
      {currentPrompt && (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">
              Selected Prompt
            </span>
            <button
              onClick={() => onEditPrompt(currentPrompt)}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-white">{currentPrompt.name}</h4>
            <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs">
              v{currentPrompt.version}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {currentPrompt.description}
          </p>
          <div className="p-3 bg-slate-800 rounded-lg max-h-32 overflow-y-auto">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words">
              {currentPrompt.systemPrompt.slice(0, 200)}
              {currentPrompt.systemPrompt.length > 200 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

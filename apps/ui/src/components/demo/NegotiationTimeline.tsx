/**
 * Negotiation Timeline - Shows negotiation history between agents.
 */
import { useState } from 'react';
import { useDemoStore } from '../../store/demoStore';
import type { AgentMessage, ExchangeStatus } from '../../types/demoTypes';

export default function NegotiationTimeline() {
  const { messages, exchangeStatus, visibleReason } = useDemoStore();
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);

  // Filter messages that are part of negotiation
  const negotiationMessages = messages.filter(
    (msg) =>
      msg.sender === 'procurement_agent' || msg.sender === 'recipient_agent'
  );

  const getTimelineColor = (sender: string) => {
    switch (sender) {
      case 'procurement_agent':
        return 'border-cyan-500 bg-cyan-500/10';
      case 'recipient_agent':
        return 'border-purple-500 bg-purple-500/10';
      default:
        return 'border-slate-500 bg-slate-500/10';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper to render provenance badge
  const renderProvenanceBadge = (message: AgentMessage) => {
    if (!message.generation_provenance) return null;
    
    const { source, provider, model, fallback_reason } = message.generation_provenance;
    const isLLM = source === 'llm';
    const isSimulated = source === 'simulated';
    
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {/* Source Badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          isLLM
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
        }`}>
          {isLLM ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.663 17h4.673M12 20v-2M4 7l9-6 6-6 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
              </svg>
              AI Generated
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Simulated
            </>
          )}
        </span>

        {/* Provider/Model Badge (if AI) */}
        {isLLM && provider && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {provider}
            {model && `• ${model}`}
          </span>
        )}

        {/* Fallback Reason (if simulated with reason) */}
        {isSimulated && fallback_reason && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {fallback_reason}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l-6 6-6 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
        </svg>
        Negotiation History
        {selectedMessage && (
          <button
            onClick={() => setSelectedMessage(null)}
            className="ml-auto text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear Selection
          </button>
        )}
      </h2>

      {negotiationMessages.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">
          No negotiation messages yet. Start a session to begin negotiation.
        </p>
      ) : (
        <>
          {/* Exchange Status Banner (if degraded/failed) */}
          {(exchangeStatus === 'degraded' || exchangeStatus === 'failed') && (
            <div className={`mb-4 p-3 rounded-lg border ${
              exchangeStatus === 'failed'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {exchangeStatus === 'failed' ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  ) : (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  )}
                </svg>
                <span className="font-semibold">
                  Exchange Status: {exchangeStatus.toUpperCase()}
                </span>
                {visibleReason && (
                  <span className="text-sm opacity-90">- {visibleReason}</span>
                )}
              </div>
            </div>
          )}

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-600" />

            {/* Timeline Items - with max height and scrolling */}
            <div className="ml-12 space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {negotiationMessages.map((msg, index) => (
                <div key={msg.message_id} className="relative">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-[-6px] w-3 h-3 rounded-full ${
                      msg.sender === 'procurement_agent'
                        ? 'bg-cyan-500'
                        : 'bg-purple-500'
                    }`}
                    style={{ top: `${index * 80}px` }}
                  />

                  {/* Message Card */}
                  <div
                    className={`ml-8 p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                      msg.sender === 'procurement_agent'
                        ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20'
                        : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
                    } ${selectedMessage?.message_id === msg.message_id ? 'ring-2 ring-yellow-400' : ''}`}
                    onClick={() => setSelectedMessage(selectedMessage?.message_id === msg.message_id ? null : msg)}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            msg.sender === 'procurement_agent'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {msg.sender === 'procurement_agent' ? 'Buyer' : 'Vendor'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      {(msg.prompt_used || msg.input_context || msg.generation_provenance) && (
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9.663 17h4.673M12 20v-2M4 7l9-6 6-6 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
                        </svg>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="text-slate-200 text-sm break-words">
                      {msg.content}
                    </div>

                    {/* Provenance Badge */}
                    {renderProvenanceBadge(msg)}

                    {/* Validation Context */}
                    {msg.validation_context && (
                      <div className="mt-3 p-2 bg-slate-700/50 rounded text-xs">
                        <div className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4 6 2 2 4-4 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
                          </svg>
                          <span className="text-slate-400">Validated:</span>
                          <span
                            className={`font-semibold ${
                              msg.validation_context.validation_status === 'valid'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {msg.validation_context.validation_status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Thinking Process */}
                    {msg.thinking_process && (
                      <div className="mt-3 p-2 bg-slate-700/50 rounded text-xs text-slate-400 italic">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9.663 17h4.673M12 20v-2M4 7l9-6 6-6 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
                          </svg>
                          <span>Thinking:</span>
                        </div>
                        {msg.thinking_process}
                      </div>
                    )}
                  </div>

                  {/* Debug Details Panel (expands below message) */}
                  {selectedMessage?.message_id === msg.message_id && (msg.prompt_used || msg.input_context || msg.generation_provenance) && (
                    <div className="ml-8 mt-2 p-4 bg-slate-900/80 border border-yellow-500/30 rounded-lg shadow-lg">
                      <div className="flex items-center gap-2 mb-3 border-b border-yellow-500/20 pb-2">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9.663 17h4.673M12 20v-2M4 7l9-6 6-6 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
                        </svg>
                        <span className="text-yellow-400 font-semibold text-sm">Debug Details</span>
                      </div>
                      
                      {/* Prompt Used */}
                      {msg.prompt_used && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-400 mb-1">Prompt/Template Used:</div>
                          <div className="bg-slate-800/50 p-3 rounded text-xs font-mono text-slate-300 whitespace-pre-wrap break-words border border-slate-700">
                            {msg.prompt_used}
                          </div>
                        </div>
                      )}

                      {/* Input Context */}
                      {msg.input_context && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-400 mb-1">Input Context:</div>
                          <div className="bg-slate-800/50 p-3 rounded text-xs font-mono text-slate-300 overflow-x-auto border border-slate-700">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(msg.input_context, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Generation Provenance */}
                      {msg.generation_provenance && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Generation Provenance:</div>
                          <div className="bg-slate-800/50 p-3 rounded text-xs font-mono text-slate-300 overflow-x-auto border border-slate-700">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(msg.generation_provenance, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Summary Stats */}
      {negotiationMessages.length > 0 && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-200">
                {negotiationMessages.length}
              </div>
              <div className="text-xs text-slate-400">Total Turns</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">
                {negotiationMessages.filter((m) => m.sender === 'procurement_agent').length}
              </div>
              <div className="text-xs text-slate-400">Buyer Messages</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {negotiationMessages.filter((m) => m.sender === 'recipient_agent').length}
              </div>
              <div className="text-xs text-slate-400">Vendor Messages</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

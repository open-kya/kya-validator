/**
 * Terminal Pane - Displays agent communication logs with syntax highlighting.
 */
import { useEffect, useRef } from 'react';
import { useDemoStore } from '../../store/demoStore';
import { AgentMessage } from '../../types/demoTypes';

export default function TerminalPane() {
  const { messages } = useDemoStore();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-96">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 17l6-6-6 6 6M4 7l6 6-6-6M4 17l6-6-6 6 6" />
          </svg>
          <span className="text-sm font-mono text-slate-300">Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2"
      >
        {messages.length === 0 ? (
          <div className="text-slate-500 text-center py-8">
            <p className="mb-2">No messages yet</p>
            <p className="text-xs">Start a session to begin agent communication</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.message_id}
              className={`border-l-2 pl-3 py-2 ${
                msg.sender === 'procurement_agent'
                  ? 'border-cyan-500 bg-cyan-500/5'
                  : 'border-purple-500 bg-purple-500/5'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold ${
                    msg.sender === 'procurement_agent'
                      ? 'text-cyan-400'
                      : 'text-purple-400'
                  }`}
                >
                  {msg.sender}
                </span>
                <span className="text-xs text-slate-500">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>

              {/* Message Content */}
              <div className="text-slate-200 break-words">
                {msg.content}
              </div>

              {/* Validation Context */}
              {msg.validation_context && (
                <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4 6 2 2 4-4 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
                    </svg>
                    <span className="text-slate-400">Validation Status:</span>
                    <span
                      className={`font-semibold ${
                        msg.validation_context.validation_status === 'valid'
                          ? 'text-green-400'
                          : msg.validation_context.validation_status === 'invalid'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {msg.validation_context.validation_status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-slate-500">
                    <div>
                      <span className="block text-xs">MCP</span>
                      <span
                        className={`text-xs font-semibold ${
                          msg.validation_context.mcp_validated
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {msg.validation_context.mcp_validated ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs">TEE</span>
                      <span
                        className={`text-xs font-semibold ${
                          msg.validation_context.tee_validated
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {msg.validation_context.tee_validated ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs">Blockchain</span>
                      <span
                        className={`text-xs font-semibold ${
                          msg.validation_context.blockchain_validated
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {msg.validation_context.blockchain_validated ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking Process */}
              {msg.thinking_process && (
                <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-400 italic">
                  <div className="flex items-center gap-1 mb-1">
                    <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.663 17h4.673M12 20v-2M4 7l9-6 6-6 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
                    </svg>
                    <span>Agent Thinking:</span>
                  </div>
                  {msg.thinking_process}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>{messages.length} messages</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Connected
          </span>
        </div>
      </div>
    </div>
  );
}

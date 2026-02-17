/**
 * Agent Thinking - Visualizes agent reasoning and decision process.
 */
import { useDemoStore } from '../../store/demoStore';

export default function AgentThinking() {
  const { thinkingHistory } = useDemoStore();

  const getThinkingIcon = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (confidence >= 0.5) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
  };

  if (thinkingHistory.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Agent Thinking</h3>
        <p className="text-xs text-gray-500">No thinking history available yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Agent Thinking</h3>
      <div className="space-y-3">
        {thinkingHistory.map((entry, index) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-gray-800 rounded">
            <div className="mt-0.5 text-gray-400">
              {getThinkingIcon(entry.confidence)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">{entry.agent_id}</span>
                <span className="text-xs text-gray-500">{entry.timestamp}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{entry.reasoning}</p>
              {entry.next_actions && entry.next_actions.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500">Next actions:</span>
                  <ul className="list-disc list-inside text-xs text-gray-400 ml-1">
                    {entry.next_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-1">
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${entry.confidence * 100}%`,
                      backgroundColor: entry.confidence >= 0.8 ? '#10b981' : entry.confidence >= 0.5 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">{(entry.confidence * 100).toFixed(0)}% confidence</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

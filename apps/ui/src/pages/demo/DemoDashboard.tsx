/**
 * Main Demo Dashboard - Agent-based procurement workflow visualization.
 */
import { useState, useEffect } from 'react';
import { useDemoStore } from '../../store/demoStore';
import { AgentMode, ClientType, SessionStart } from '../../types/demoTypes';
import { demoApi } from '../../api/demoApi';
import AgentControlPanel from '../../components/demo/AgentControlPanel';
import TerminalPane from '../../components/demo/TerminalPane';
import PolicyValidationStatus from '../../components/demo/PolicyValidationStatus';
import NegotiationTimeline from '../../components/demo/NegotiationTimeline';
import AgentThinking from '../../components/demo/AgentThinking';

export default function DemoDashboard() {
  const {
    sessionId,
    agentMode,
    procurementMode,
    recipientMode,
    clientType,
    isSessionActive,
    isConnected,
    isConnecting,
    connectionError,
    exchangeStatus,
    visibleReason,
    setSessionId,
    setAgentMode,
    setProcurementMode,
    setRecipientMode,
    setClientType,
    setIsSessionActive,
    connectWebSocket,
    disconnectWebSocket,
    reset,
  } = useDemoStore();

  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'flow' | 'negotiation'>('dashboard');
  
  // Check dark mode from document class (set by App.tsx)
  const darkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    return () => {
      reset();
    };
  }, []);

  const handleStartSession = async () => {
    const newSessionId = `session-${Date.now()}`;
    
    // Set session ID
    setSessionId(newSessionId);
    
    // Prepare session start data with dual-role mode support
    const sessionStart: SessionStart = {
      message_id: `${newSessionId}-start`,
      timestamp: new Date().toISOString(),
      message_type: 'session_start' as any,
      session_id: newSessionId,
      // Include both legacy and new role-specific modes for compatibility
      agent_mode: agentMode,
      procurement_mode: procurementMode,
      recipient_mode: recipientMode,
      client_type: clientType,
      scenario_config: {
        scenario_id: 'default',
      },
    };

    try {
      // Call API to start session
      await demoApi.startSession(sessionStart);
      
      // Set session as active immediately for better UX
      setIsSessionActive(true);
      
      // Try to connect to WebSocket (non-blocking)
      connectWebSocket(newSessionId).catch((error) => {
        console.warn('WebSocket connection failed, continuing without it:', error);
        // Don't block session start if WebSocket fails
      });
      
      console.log('Session started:', newSessionId);
    } catch (error) {
      console.error('Failed to start session:', error);
      // Set session active anyway for demo purposes
      setIsSessionActive(true);
    }
  };

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        const sessionEnd = {
          message_id: `${sessionId}-end`,
          timestamp: new Date().toISOString(),
          message_type: 'session_end' as any,
          session_id: sessionId,
          reason: 'user_ended',
        };
        
        await demoApi.endSession(sessionId, sessionEnd);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
    
    // Disconnect WebSocket
    disconnectWebSocket();
    setIsSessionActive(false);
    console.log('Session ended');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white'
        : 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-sm transition-colors duration-300 ${
        darkMode
          ? 'border-slate-700 bg-slate-800/50'
          : 'border-slate-200 bg-white/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className={`text-2xl font-bold bg-clip-text text-transparent ${
                darkMode
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600'
              }`}>
                KYA Validator Demo
              </h1>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Agent-Based Procurement</span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  isConnected
                    ? darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                    : darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${isConnecting ? 'animate-pulse' : ''} ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span>{isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {connectionError && (
                <div className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{connectionError}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Session Controls */}
        <div className={`mb-6 rounded-xl p-6 border transition-colors duration-300 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white/50 border-slate-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Session Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Procurement Agent Mode */}
            <div>
              <label htmlFor="procurement-mode-select" className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Procurement Agent Mode
              </label>
              <select
                id="procurement-mode-select"
                value={procurementMode}
                onChange={(e) => setProcurementMode(e.target.value as AgentMode)}
                disabled={isSessionActive}
                className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 transition-colors duration-200 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                <option value={AgentMode.LLM}>Real LLM (Requires API Key)</option>
                <option value={AgentMode.SIMULATED}>Simulated (Demo Mode)</option>
              </select>
            </div>

            {/* Recipient Agent Mode */}
            <div>
              <label htmlFor="recipient-mode-select" className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Recipient Agent Mode
              </label>
              <select
                id="recipient-mode-select"
                value={recipientMode}
                onChange={(e) => setRecipientMode(e.target.value as AgentMode)}
                disabled={isSessionActive}
                className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 transition-colors duration-200 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                <option value={AgentMode.LLM}>Real LLM (Requires API Key)</option>
                <option value={AgentMode.SIMULATED}>Simulated (Demo Mode)</option>
              </select>
            </div>

            {/* Client Type */}
            <div>
              <label htmlFor="client-type-select" className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Client Type
              </label>
              <select
                id="client-type-select"
                value={clientType}
                onChange={(e) => setClientType(e.target.value as ClientType)}
                disabled={isSessionActive}
                className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 transition-colors duration-200 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                <option value={ClientType.FLOW_STOREFRONT}>
                  Type A: Flow Storefront
                </option>
                <option value={ClientType.AGENT_RECEIVER}>
                  Type B: Agent Receiver
                </option>
                <option value={ClientType.DOC_STOREFRONT}>
                  Type C: Documentation Storefront
                </option>
              </select>
            </div>

            {/* Action Button */}
            <div className="flex items-end">
              {!isSessionActive ? (
                <button
                  onClick={handleStartSession}
                  disabled={isConnecting}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  {isConnecting ? 'Starting...' : 'Start Session'}
                </button>
              ) : (
                <button
                  onClick={handleEndSession}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/20"
                >
                  End Session
                </button>
              )}
            </div>
          </div>

          {/* Exchange Status Indicator */}
          {(exchangeStatus || visibleReason) && (
            <div className={`mt-4 p-3 rounded-lg border ${
              exchangeStatus === 'failed'
                ? darkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
                : exchangeStatus === 'degraded'
                ? darkMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                : darkMode ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {exchangeStatus === 'failed' ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  ) : exchangeStatus === 'degraded' ? (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  ) : (
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  )}
                </svg>
                <span className="font-semibold">
                  Exchange Status: {exchangeStatus?.toUpperCase()}
                </span>
                {visibleReason && (
                  <span className="text-sm opacity-90">- {visibleReason}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedTab === 'dashboard'
                ? 'bg-cyan-500 text-white'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setSelectedTab('flow')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedTab === 'flow'
                ? 'bg-cyan-500 text-white'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Workflow Flow
          </button>
          <button
            onClick={() => setSelectedTab('negotiation')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedTab === 'negotiation'
                ? 'bg-cyan-500 text-white'
                : darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Negotiation
          </button>
        </div>

        {/* Dashboard Content */}
        {selectedTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <AgentControlPanel />
            </div>
            <div className="lg:col-span-1">
              <TerminalPane />
            </div>
            <div className="lg:col-span-1">
              <PolicyValidationStatus />
            </div>
          </div>
        )}

        {selectedTab === 'flow' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Workflow Visualization</h2>
            <p className="text-slate-400">
              Workflow visualization will be displayed here using Cytoscape.js.
              This will show the flow-based storefront state machine.
            </p>
          </div>
        )}

        {selectedTab === 'negotiation' && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Negotiation History</h2>
            <NegotiationTimeline />
          </div>
        )}

        {/* Agent Thinking Panel */}
        {isSessionActive && <AgentThinking />}
      </main>
    </div>
  );
}

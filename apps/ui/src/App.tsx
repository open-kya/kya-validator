import { useState, useEffect } from 'react';
import { Shield, FileCode, Settings, Play, Upload, Plus, Moon, Sun } from 'lucide-react';
import PolicyEditor from './components/PolicyEditor';
import TestPanel from './components/TestPanel';
import DemoDashboard from './pages/demo/DemoDashboard';
import { useEditorStore } from './store';
import { policyPresets } from './presets';
import { PolicyPreset } from './types';
import { Shield as ShieldIcon, Clock, DollarSign, Building, FileCode as FileCodeIcon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'test' | 'demo'>('demo');
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isCustomPolicyOpen, setIsCustomPolicyOpen] = useState(false);
  const [customPolicyJson, setCustomPolicyJson] = useState('');
  const [customPolicyError, setCustomPolicyError] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const { loadPreset, importPolicy } = useEditorStore();

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const presetInfo: Record<string, { icon: React.ReactNode; color: string; description: string }> = {
    basic: {
      icon: <FileCodeIcon className="w-6 h-6" />,
      color: 'blue',
      description: 'Essential validation rules for standard use cases',
    },
    strict: {
      icon: <ShieldIcon className="w-6 h-6" />,
      color: 'red',
      description: 'Enhanced security with TEE verification',
    },
    financial: {
      icon: <DollarSign className="w-6 h-6" />,
      color: 'green',
      description: 'Includes blockchain solvency checks',
    },
    enterprise: {
      icon: <Building className="w-6 h-6" />,
      color: 'purple',
      description: 'Comprehensive validation with audit trails',
    },
    development: {
      icon: <Clock className="w-6 h-6" />,
      color: 'orange',
      description: 'Minimal checks for rapid testing',
    },
  };

  const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      hover: 'hover:bg-blue-100 hover:border-blue-300',
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
      hover: 'hover:bg-red-100 hover:border-red-300',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
      hover: 'hover:bg-green-100 hover:border-green-300',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      hover: 'hover:bg-purple-100 hover:border-purple-300',
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      hover: 'hover:bg-orange-100 hover:border-orange-300',
    },
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      {/* Header */}
      <header className={`border-b shadow-sm sticky top-0 z-50 transition-colors duration-300 ${
        darkMode
          ? 'bg-slate-800/80 border-slate-700'
          : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-indigo-600' : 'bg-indigo-600'
            }`}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>KYA Policy Editor</h1>
              <p className={`text-sm ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>Manifest Validation Policy Builder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-all duration-200 ${
                darkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {/* Load Preset button */}
            <button
              data-testid="load-preset-button"
              onClick={() => setIsPresetOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all animate-pulse"
            >
              <Settings className="w-4 h-4" />
              <span>Load Preset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className={`border-b shadow-sm transition-colors duration-300 ${
        darkMode
          ? 'bg-slate-800/80 border-slate-700'
          : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'border-indigo-600 text-indigo-600'
                  : darkMode
                    ? 'border-transparent text-slate-400 hover:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Policy Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'test'
                  ? 'border-indigo-600 text-indigo-600'
                  : darkMode
                    ? 'border-transparent text-slate-400 hover:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Test Validation</span>
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'demo'
                  ? 'border-indigo-600 text-indigo-600'
                  : darkMode
                    ? 'border-transparent text-slate-400 hover:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Live Demo</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'editor' && <PolicyEditor />}
        {activeTab === 'test' && <TestPanel />}
        {activeTab === 'demo' && <DemoDashboard />}
      </main>

      {/* Preset Modal */}
      {isPresetOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Select a Preset Policy</h2>
              <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Choose a pre-configured validation policy to get started quickly
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                {policyPresets.map((presetPreset: PolicyPreset) => {
                  const info = presetInfo[presetPreset.id];
                  const colors = colorClasses[info.color];
                  
                  return (
                    <button
                      key={presetPreset.id}
                      onClick={() => {
                        loadPreset(presetPreset.policy);
                        setIsPresetOpen(false);
                      }}
                      className={`text-left p-5 rounded-lg border-2 transition-all cursor-pointer ${
                        darkMode
                          ? `${colors.bg.replace('bg-', 'bg-')} border-opacity-50 ${colors.hover}`
                          : `${colors.bg} ${colors.border} ${colors.hover}`
                      }`}
                      style={darkMode ? {
                        backgroundColor: `${info.color === 'blue' ? '#1e3a5f' : info.color === 'red' ? '#450a0a' : info.color === 'green' ? '#052e16' : info.color === 'purple' ? '#2e1065' : '#431807'}`,
                        borderColor: `${info.color === 'blue' ? '#3b82f6' : info.color === 'red' ? '#ef4444' : info.color === 'green' ? '#22c55e' : info.color === 'purple' ? '#a855f7' : '#f97316'}`
                      } : undefined}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${info.color === 'blue' ? 'bg-blue-500' : info.color === 'red' ? 'bg-red-500' : info.color === 'green' ? 'bg-green-500' : info.color === 'purple' ? 'bg-purple-500' : 'bg-orange-500'}`}>
                          <div className="text-white">
                            {info.icon}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {presetPreset.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              darkMode ? colors.text : `${colors.text} ${info.color === 'blue' ? 'bg-blue-100' : info.color === 'red' ? 'bg-red-100' : info.color === 'green' ? 'bg-green-100' : info.color === 'purple' ? 'bg-purple-100' : 'bg-orange-100'}`
                            }`}>
                              {presetPreset.policy.rules.length} rules
                            </span>
                          </div>
                          
                          <p className={`text-sm mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {info.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-1">
                            {presetPreset.policy.rules.slice(0, 3).map((rule: { id: string; type: string }) => (
                              <span
                                key={rule.id}
                                className={`px-2 py-1 rounded text-xs ${
                                  darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-white/60 text-slate-600'
                                }`}
                              >
                                {rule.type}
                              </span>
                            ))}
                            {presetPreset.policy.rules.length > 3 && (
                              <span className={`px-2 py-1 rounded text-xs ${
                                darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-white/60 text-slate-600'
                              }`}>
                                +{presetPreset.policy.rules.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="border-t border-slate-200 pt-6">
                <button
                  onClick={() => {
                    setIsPresetOpen(false);
                    setIsCustomPolicyOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  <Upload className="w-4 h-4" />
                  <span>Paste Custom Policy</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setIsPresetOpen(false)}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Policy Import Modal */}
      {isCustomPolicyOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Paste Custom Policy</h2>
              <p className="text-slate-600 mt-1">
                Paste your policy JSON below to import it into the editor
              </p>
            </div>
            
            <div className="p-6">
              <textarea
                value={customPolicyJson}
                onChange={(e) => {
                  setCustomPolicyJson(e.target.value);
                  setCustomPolicyError('');
                }}
                rows={12}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                placeholder='{"name": "My Custom Policy", "version": "1.0", "description": "A custom validation policy", "rules": []}'
              />
              {customPolicyError && (
                <p className="mt-2 text-sm text-red-600">{customPolicyError}</p>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCustomPolicyOpen(false);
                  setCustomPolicyJson('');
                  setCustomPolicyError('');
                }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  try {
                    setCustomPolicyError('');
                    importPolicy(customPolicyJson);
                    setIsCustomPolicyOpen(false);
                    setCustomPolicyJson('');
                  } catch (err) {
                    setCustomPolicyError(err instanceof Error ? err.message : 'Failed to import policy');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Import Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

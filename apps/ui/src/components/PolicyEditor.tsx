import React from 'react';
import { Plus, Download, Upload, Trash2, CheckCircle, XCircle, GripVertical } from 'lucide-react';
import { useEditorStore } from '../store';
import { PolicyRule, RuleType } from '../types';

// Dark mode hook
function useDarkMode() {
  return typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
}

function PolicyEditor() {
  const darkMode = useDarkMode();
  
  const {
    currentPolicy,
    updatePolicy,
    addRule,
    removeRule,
    updateRule,
    toggleRule,
    exportPolicy,
    importPolicy,
  } = useEditorStore();
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importJson, setImportJson] = React.useState('');
  const [error, setError] = React.useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentPolicy) {
      updatePolicy({
        ...currentPolicy,
        name: e.target.value,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (currentPolicy) {
      updatePolicy({
        ...currentPolicy,
        description: e.target.value,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentPolicy) {
      updatePolicy({
        ...currentPolicy,
        version: e.target.value,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleExport = () => {
    if (currentPolicy) {
      const json = exportPolicy(currentPolicy);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentPolicy.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    try {
      setError('');
      importPolicy(importJson);
      setIsImportOpen(false);
      setImportJson('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import policy');
    }
  };

  const getRuleTypeLabel = (type: RuleType): string => {
    const labels: Record<RuleType, string> = {
      schema: 'Schema Validation',
      ttl: 'Time-to-Live',
      crypto: 'Cryptographic Verification',
      tee: 'TEE Evidence',
      solvency: 'Solvency Check',
      region: 'Geographic Region',
      transaction_value: 'Transaction Value',
      time_window: 'Time Window',
      custom: 'Custom Rule',
    };
    return labels[type] || type;
  };

  const getRuleTypeIcon = (type: RuleType): string => {
    const icons: Record<RuleType, string> = {
      schema: '📋',
      ttl: '⏱️',
      crypto: '🔐',
      tee: '🛡️',
      solvency: '💰',
      region: '🌍',
      transaction_value: '💸',
      time_window: '📅',
      custom: '⚙️',
    };
    return icons[type] || '📄';
  };

  if (!currentPolicy) {
    return (
      <div className={`rounded-xl shadow-sm border p-12 text-center transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-md mx-auto">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            darkMode ? 'bg-slate-700' : 'bg-slate-100'
          }`}>
            <Plus className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No Policy Loaded</h2>
          <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Get started by loading a preset or pasting your own policy
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                const presetButton = document.querySelector('[data-testid="load-preset-button"]') as HTMLButtonElement;
                if (presetButton) presetButton.click();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Browse Presets</span>
            </button>
            
            <button
              onClick={() => setIsImportOpen(true)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg hover:transition-colors font-medium ${
                darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Paste Custom Policy</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Policy Info Card */}
      <div className={`rounded-xl shadow-sm border transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Policy Details</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                title="Export Policy"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:transition-colors font-medium ${
                  darkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Import Policy"
              >
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="policy-name" className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Policy Name
            </label>
            <input
              id="policy-name"
              type="text"
              value={currentPolicy.name}
              onChange={handleNameChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              placeholder="My Validation Policy"
            />
          </div>

          <div>
            <label htmlFor="policy-version" className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Version
            </label>
            <input
              id="policy-version"
              type="text"
              value={currentPolicy.version}
              onChange={handleVersionChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              placeholder="1.0.0"
            />
          </div>

          <div>
            <label htmlFor="policy-description" className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Description
            </label>
            <textarea
              id="policy-description"
              value={currentPolicy.description}
              onChange={handleDescriptionChange}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              placeholder="Describe what this policy validates..."
            />
          </div>
        </div>
      </div>

      {/* Validation Rules Card */}
      <div className={`rounded-xl shadow-sm border transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Validation Rules</h2>
              <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentPolicy.rules.length} rule{currentPolicy.rules.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <button
              onClick={() => {
                const newRule: PolicyRule = {
                  id: Date.now().toString(),
                  type: 'schema',
                  name: 'New Validation Rule',
                  description: '',
                  enabled: true,
                  parameters: {},
                  order: currentPolicy.rules.length,
                };
                addRule(newRule);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rule</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {currentPolicy.rules.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                darkMode ? 'bg-slate-700' : 'bg-slate-100'
              }`}>
                <Plus className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
              </div>
              <p className={`mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No validation rules added yet</p>
              <button
                onClick={() => {
                  const newRule: PolicyRule = {
                    id: Date.now().toString(),
                    type: 'schema',
                    name: 'New Validation Rule',
                    description: '',
                    enabled: true,
                    parameters: {},
                    order: currentPolicy.rules.length,
                  };
                  addRule(newRule);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Rule</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentPolicy.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    rule.enabled
                      ? darkMode
                        ? 'border-indigo-800 bg-indigo-900/30 hover:border-indigo-700'
                        : 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-300'
                      : darkMode
                        ? 'border-slate-700 bg-slate-800/50 opacity-60'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 cursor-move">
                      <GripVertical className={`w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>

                    <div className="flex-shrink-0 text-2xl">
                      {getRuleTypeIcon(rule.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                          className={`text-sm font-semibold bg-transparent border-none focus:ring-0 p-0 flex-1 ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          }`}
                        />
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          darkMode ? 'text-slate-400 bg-slate-700' : 'text-slate-500 bg-slate-200'
                        }`}>
                          {getRuleTypeLabel(rule.type)}
                        </span>
                      </div>
                      <select
                        value={rule.type}
                        onChange={(e) => updateRule(rule.id, { type: e.target.value as RuleType })}
                        className={`text-xs bg-transparent border-none focus:ring-0 p-0 cursor-pointer ${
                          darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <option value="schema">Schema Validation</option>
                        <option value="ttl">Time-to-Live</option>
                        <option value="crypto">Cryptographic Verification</option>
                        <option value="tee">TEE Evidence</option>
                        <option value="solvency">Solvency Check</option>
                        <option value="region">Geographic Region</option>
                        <option value="transaction_value">Transaction Value</option>
                        <option value="time_window">Time Window</option>
                        <option value="custom">Custom Rule</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.enabled
                            ? darkMode
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                            : darkMode
                              ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                      >
                        {rule.enabled ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => removeRule(rule.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode
                            ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title="Remove Rule"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-2xl w-full transition-colors ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Import Policy</h2>
            </div>
            <div className="p-6">
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={10}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm transition-colors ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                    : 'border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                placeholder='{"name": "My Policy", "version": "1.0", "description": "...", "rules": []}'
              />
              {error && (
                <p className={`mt-2 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
              )}
            </div>
            <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={() => setIsImportOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'text-slate-300 bg-slate-700 hover:bg-slate-600'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
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

export default PolicyEditor;

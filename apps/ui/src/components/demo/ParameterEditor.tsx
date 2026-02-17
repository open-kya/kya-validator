/**
 * ParameterEditor - Component for editing prompt parameters.
 */
import { useState, useEffect } from 'react';
import { useDemoStore, PromptConfig, PromptParameter } from '../../store/demoStore';

export interface ParameterEditorProps {
  prompt: PromptConfig;
  onParametersChange: (parameters: Record<string, unknown>) => void;
}

export default function ParameterEditor({ prompt, onParametersChange }: ParameterEditorProps) {
  const { promptParameters } = useDemoStore();
  const [parameters, setParameters] = useState<Record<string, unknown>>(promptParameters);
  const [newParameter, setNewParameter] = useState<PromptParameter>({
    name: '',
    type: 'string',
    defaultValue: '',
    description: '',
    enumValues: [],
  });

  // Update local state when prompt changes
  useEffect(() => {
    setParameters(promptParameters);
  }, [promptParameters]);

  // Infer parameter type from value
  const inferType = (value: unknown): 'string' | 'number' | 'boolean' | 'enum' => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'enum';
    return 'string';
  };

  // Get parameter type badge color
  const getTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'string':
        return 'bg-blue-500/20 text-blue-400';
      case 'number':
        return 'bg-green-500/20 text-green-400';
      case 'boolean':
        return 'bg-purple-500/20 text-purple-400';
      case 'enum':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Handle parameter value change
  const handleParameterChange = (name: string, value: unknown) => {
    const newParams = { ...parameters, [name]: value };
    setParameters(newParams);
    onParametersChange(newParams);
  };

  // Add new parameter
  const handleAddParameter = () => {
    if (!newParameter.name.trim()) {
      return;
    }

    const value = convertValue(newParameter.defaultValue, newParameter.type);
    const newParams = { ...parameters, [newParameter.name]: value };
    setParameters(newParams);
    onParametersChange(newParams);

    // Reset form
    setNewParameter({
      name: '',
      type: 'string',
      defaultValue: '',
      description: '',
      enumValues: [],
    });
  };

  // Remove parameter
  const handleRemoveParameter = (name: string) => {
    const newParams = { ...parameters };
    delete newParams[name];
    setParameters(newParams);
    onParametersChange(newParams);
  };

  // Convert value based on type
  const convertValue = (value: unknown, type: string): unknown => {
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      case 'boolean':
        return value === true || value === 'true' || value === '1';
      case 'enum':
        return Array.isArray(value) ? value : [String(value)];
      default:
        return String(value);
    }
  };

  // Render input based on type
  const renderParameterInput = (name: string, value: unknown, type: string) => {
    const inferredType = inferType(value);

    switch (inferredType) {
      case 'boolean':
        return (
          <select
            value={String(value)}
            onChange={(e) => handleParameterChange(name, e.target.value === 'true')}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={String(value)}
            onChange={(e) => handleParameterChange(name, parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        );

      case 'enum':
        const enumValues = Array.isArray(value) ? value : [];
        return (
          <select
            value={String(enumValues[0] || '')}
            onChange={(e) => handleParameterChange(name, e.target.value)}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {enumValues.map((val) => (
              <option key={String(val)} value={String(val)}>
                {String(val)}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => handleParameterChange(name, e.target.value)}
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
          />
        );
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Parameters</h3>
        <span className="text-sm text-slate-400">
          {Object.keys(parameters).length} parameters
        </span>
      </div>

      {/* Existing Parameters */}
      {Object.keys(parameters).length > 0 ? (
        <div className="space-y-3 mb-6">
          {Object.entries(parameters).map(([name, value]) => {
            const type = inferType(value);
            return (
              <div
                key={name}
                className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-cyan-400">{`{${name}}`}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeColor(type)}`}
                    >
                      {type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveParameter(name)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove parameter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">
                      Value
                    </label>
                    {renderParameterInput(name, value, type)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-6 p-8 text-center bg-slate-700/30 rounded-lg border border-dashed border-slate-600">
          <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <p className="text-sm text-slate-400">
            No parameters defined. Add parameters below.
          </p>
        </div>
      )}

      {/* Add New Parameter Form */}
      <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Add Parameter</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Parameter Name
            </label>
            <input
              type="text"
              value={newParameter.name}
              onChange={(e) =>
                setNewParameter({ ...newParameter, name: e.target.value })
              }
              placeholder="e.g., urgency_level"
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={newParameter.type}
              onChange={(e) =>
                setNewParameter({
                  ...newParameter,
                  type: e.target.value as 'string' | 'number' | 'boolean' | 'enum',
                })
              }
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="enum">Enum</option>
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">Default Value</label>
          <input
            type="text"
            value={String(newParameter.defaultValue)}
            onChange={(e) =>
              setNewParameter({ ...newParameter, defaultValue: e.target.value })
            }
            placeholder="e.g., critical"
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
          <input
            type="text"
            value={newParameter.description}
            onChange={(e) =>
              setNewParameter({ ...newParameter, description: e.target.value })
            }
            placeholder="Brief description of this parameter"
            className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <button
          onClick={handleAddParameter}
          disabled={!newParameter.name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Parameter
        </button>
      </div>
    </div>
  );
}

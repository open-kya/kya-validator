/**
 * ScenarioSelector - Component for selecting and configuring negotiation scenarios.
 */
import { useState, useEffect } from 'react';
import { useDemoStore } from '../../store/demoStore';

// Scenario types
export type ScenarioType = 'desperate_buyer' | 'price_negotiation' | 'custom';

export interface ScenarioConfig {
  type: ScenarioType;
  name: string;
  description: string;
  parameters: ScenarioParameter[];
}

export interface ScenarioParameter {
  name: string;
  type: 'string' | 'number' | 'enum';
  defaultValue: unknown;
  description?: string;
  enumValues?: string[];
}

// Pre-defined scenarios
const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  desperate_buyer: {
    type: 'desperate_buyer',
    name: 'Desperate JIT Buyer',
    description: 'A desperate buyer willing to pay list price for immediate delivery. Focus on availability and speed.',
    parameters: [
      {
        name: 'urgency_level',
        type: 'enum',
        defaultValue: 'critical',
        description: 'Level of urgency for procurement',
        enumValues: ['low', 'medium', 'high', 'critical'],
      },
      {
        name: 'price_sensitivity',
        type: 'enum',
        defaultValue: 'flexible',
        description: 'Price negotiation stance',
        enumValues: ['flexible', 'moderate', 'strict'],
      },
      {
        name: 'negotiation_strategy',
        type: 'enum',
        defaultValue: 'accommodating',
        description: 'How to handle pricing negotiations',
        enumValues: ['accommodating', 'firm', 'competitive'],
      },
    ],
  },
  price_negotiation: {
    type: 'price_negotiation',
    name: 'Price Negotiation',
    description: 'JIT procurement with configurable price negotiation parameters.',
    parameters: [
      {
        name: 'expected_price',
        type: 'number',
        defaultValue: 2000,
        description: 'Your target price (lower than storefront)',
      },
      {
        name: 'competition',
        type: 'enum',
        defaultValue: 'moderate',
        description: 'Market competition level',
        enumValues: ['none', 'low', 'medium', 'high'],
      },
      {
        name: 'desperation',
        type: 'enum',
        defaultValue: 'medium',
        description: 'Time pressure level',
        enumValues: ['none', 'low', 'medium', 'high'],
      },
    ],
  },
  custom: {
    type: 'custom',
    name: 'Custom Scenario',
    description: 'Configure your own custom negotiation scenario parameters.',
    parameters: [
      {
        name: 'custom_parameters',
        type: 'string',
        defaultValue: '',
        description: 'Custom scenario configuration (JSON)',
      },
    ],
  },
};

interface ScenarioSelectorProps {
  onScenarioApply?: (scenario: ScenarioType, parameters: Record<string, unknown>) => void;
}

export default function ScenarioSelector({ onScenarioApply }: ScenarioSelectorProps) {
  const { currentScenario, scenarioParameters, setScenario, setScenarioParameters } = useDemoStore();
  const [selectedScenarioType, setSelectedScenarioType] = useState<ScenarioType>('desperate_buyer');
  const [localParameters, setLocalParameters] = useState<Record<string, unknown>>({});

  // Initialize local parameters when scenario changes
  useEffect(() => {
    const scenario = SCENARIOS[selectedScenarioType];
    const defaultParams: Record<string, unknown> = {};
    scenario.parameters.forEach((param) => {
      defaultParams[param.name] = param.defaultValue;
    });
    setLocalParameters(defaultParams);
  }, [selectedScenarioType]);

  // Sync with store when current scenario changes
  useEffect(() => {
    if (currentScenario) {
      setSelectedScenarioType(currentScenario);
      setLocalParameters(scenarioParameters);
    }
  }, [currentScenario, scenarioParameters]);

  const handleScenarioChange = (type: ScenarioType) => {
    setSelectedScenarioType(type);
    const scenario = SCENARIOS[type];
    const defaultParams: Record<string, unknown> = {};
    scenario.parameters.forEach((param) => {
      defaultParams[param.name] = param.defaultValue;
    });
    setLocalParameters(defaultParams);
  };

  const handleParameterChange = (paramName: string, value: unknown) => {
    setLocalParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleApplyScenario = () => {
    setScenario(selectedScenarioType);
    setScenarioParameters(localParameters);
    
    if (onScenarioApply) {
      onScenarioApply(selectedScenarioType, localParameters);
    }
  };

  const selectedScenario = SCENARIOS[selectedScenarioType];

  return (
    <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Negotiation Scenario
        </label>
        <select
          value={selectedScenarioType}
          onChange={(e) => handleScenarioChange(e.target.value as ScenarioType)}
          className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {Object.entries(SCENARIOS).map(([type, config]) => (
            <option key={type} value={type}>
              {config.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario Description */}
      <div className="bg-slate-600/50 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-cyan-400 mb-1">
          {selectedScenario.name}
        </h4>
        <p className="text-xs text-slate-300">{selectedScenario.description}</p>
      </div>

      {/* Scenario Parameters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Scenario Parameters</h4>
        {selectedScenario.parameters.map((param) => (
          <div key={param.name}>
            <label className="block text-xs text-slate-400 mb-1">
              {param.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              {param.description && ` - ${param.description}`}
            </label>
            {param.type === 'enum' && param.enumValues ? (
              <select
                value={localParameters[param.name] as string}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {param.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : param.type === 'number' ? (
              <input
                type="number"
                value={localParameters[param.name] as number}
                onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
                className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            ) : (
              <input
                type="text"
                value={localParameters[param.name] as string}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            )}
          </div>
        ))}
      </div>

      {/* Apply Scenario Button */}
      <button
        onClick={handleApplyScenario}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Apply Scenario
      </button>
    </div>
  );
}

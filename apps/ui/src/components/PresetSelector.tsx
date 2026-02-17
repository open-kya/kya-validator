import React from 'react';
import { useEditorStore } from '../store';
import { policyPresets } from '../presets';
import { PolicyPreset } from '../types';
import { Shield, Clock, DollarSign, Building, FileCode } from 'lucide-react';

interface PresetSelectorProps {
  onClose: () => void;
}

function PresetSelector({ onClose }: PresetSelectorProps) {
  const { loadPreset } = useEditorStore();

  const presetInfo: Record<string, { icon: React.ReactNode; color: string; description: string }> = {
    basic: {
      icon: <FileCode className="w-6 h-6" />,
      color: 'blue',
      description: 'Essential validation rules for standard use cases',
    },
    strict: {
      icon: <Shield className="w-6 h-6" />,
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
    <div className="p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {policyPresets.map((presetPreset: PolicyPreset) => {
          const info = presetInfo[presetPreset.id];
          const colors = colorClasses[info.color];
          
          return (
            <button
              key={presetPreset.id}
              onClick={() => {
                loadPreset(presetPreset.policy);
                onClose();
              }}
              className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${colors.bg} ${colors.border} ${colors.hover}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${info.color === 'blue' ? 'bg-blue-500' : info.color === 'red' ? 'bg-red-500' : info.color === 'green' ? 'bg-green-500' : info.color === 'purple' ? 'bg-purple-500' : 'bg-orange-500'}`}>
                  <div className="text-white">
                    {info.icon}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {presetPreset.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.text} ${info.color === 'blue' ? 'bg-blue-100' : info.color === 'red' ? 'bg-red-100' : info.color === 'green' ? 'bg-green-100' : info.color === 'purple' ? 'bg-purple-100' : 'bg-orange-100'}`}>
                      {presetPreset.policy.rules.length} rules
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-3">
                    {info.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {presetPreset.policy.rules.slice(0, 3).map((rule: { id: string; type: string }) => (
                      <span
                        key={rule.id}
                        className="px-2 py-1 bg-white/60 rounded text-xs text-slate-600"
                      >
                        {rule.type}
                      </span>
                    ))}
                    {presetPreset.policy.rules.length > 3 && (
                      <span className="px-2 py-1 bg-white/60 rounded text-xs text-slate-600">
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
    </div>
  );
}

export default PresetSelector;

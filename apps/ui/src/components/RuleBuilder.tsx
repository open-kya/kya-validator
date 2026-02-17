import React from 'react';
import { PolicyRule } from '../types';

interface RuleBuilderProps {
  rule: PolicyRule | null;
  open: boolean;
  onClose: () => void;
  onSave: (rule: PolicyRule) => void;
}

function RuleBuilder({ rule, open, onClose, onSave }: RuleBuilderProps) {
  const [localRule, setLocalRule] = React.useState<PolicyRule>(
    rule || {
      id: '',
      type: 'schema',
      name: '',
      description: '',
      enabled: true,
      parameters: {},
      order: 0,
    }
  );

  React.useEffect(() => {
    if (rule) {
      setLocalRule(rule);
    }
  }, [rule]);

  const handleSave = () => {
    onSave(localRule);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {rule ? 'Edit Rule' : 'Add Rule'}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="rule-name" className="block text-sm font-medium text-slate-700 mb-1">
              Rule Name
            </label>
            <input
              id="rule-name"
              type="text"
              value={localRule.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalRule({ ...localRule, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="rule-description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="rule-description"
              value={localRule.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalRule({ ...localRule, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">
              Parameter editors would go here based on rule type ({localRule.type})
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default RuleBuilder;

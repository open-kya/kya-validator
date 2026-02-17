/**
 * Policy Validation Status - Shows validation results for manifests and policies.
 */
import { useDemoStore } from '../../store/demoStore';
import { ValidationStatus } from '../../types/demoTypes';

export default function PolicyValidationStatus() {
  const { validationContext } = useDemoStore();

  const getStatusColor = (status: ValidationStatus) => {
    switch (status) {
      case ValidationStatus.VALID:
        return 'text-green-400 bg-green-500/20';
      case ValidationStatus.INVALID:
        return 'text-red-400 bg-red-500/20';
      case ValidationStatus.ERROR:
        return 'text-red-400 bg-red-500/20';
      case ValidationStatus.PENDING:
      default:
        return 'text-yellow-400 bg-yellow-500/20';
    }
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case ValidationStatus.VALID:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7l-7 7 7-7 7-7l-7-7 7M5 13l4 4L19 7l-7 7 7-7 7-7 7" />
          </svg>
        );
      case ValidationStatus.INVALID:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12M18 6l-6 6M6 6l12 12" />
          </svg>
        );
      case ValidationStatus.ERROR:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m-6 9v2m6 16v-2m0 0h6m-6 0h6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 0h6m-6 0h6m0 0v-4m0 0h6m-6 0h6" />
          </svg>
        );
    }
  };

  if (!validationContext) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4 6 2 2 4-4 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
          </svg>
          Policy Validation Status
        </h2>
        <p className="text-slate-400 text-sm text-center py-8">
          No validation data available. Start a session to see validation results.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4 6 2 2 4-4 6m6 2v10m-6 0v-4m0 0h6m-6 0h6" />
        </svg>
        Policy Validation Status
      </h2>

      {/* Overall Status */}
      <div className={`mb-6 p-4 rounded-lg ${getStatusColor(validationContext.validation_status)}`}>
        <div className="flex items-center gap-3">
          {getStatusIcon(validationContext.validation_status)}
          <span className="text-lg font-semibold">
            {validationContext.validation_status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Validation Details */}
      <div className="space-y-4">
        {/* Manifest ID */}
        {validationContext.manifest_id && (
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <span className="text-sm text-slate-400">Manifest ID</span>
            <span className="ml-2 text-sm font-mono text-slate-200">
              {validationContext.manifest_id}
            </span>
          </div>
        )}

        {/* Policy ID */}
        {validationContext.policy_id && (
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <span className="text-sm text-slate-400">Policy ID</span>
            <span className="ml-2 text-sm font-mono text-slate-200">
              {validationContext.policy_id}
            </span>
          </div>
        )}

        {/* MCP Validation */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">MCP Validation</span>
            <span
              className={`text-sm font-semibold ${
                validationContext.mcp_validated ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {validationContext.mcp_validated ? 'Valid' : 'Invalid'}
            </span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                validationContext.mcp_validated ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${validationContext.mcp_validated ? 100 : 0}%` }}
            />
          </div>
        </div>

        {/* TEE Validation */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">TEE Validation</span>
            <span
              className={`text-sm font-semibold ${
                validationContext.tee_validated ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {validationContext.tee_validated ? 'Valid' : 'Invalid'}
            </span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                validationContext.tee_validated ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${validationContext.tee_validated ? 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Blockchain Validation */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Blockchain Validation</span>
            <span
              className={`text-sm font-semibold ${
                validationContext.blockchain_validated ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {validationContext.blockchain_validated ? 'Valid' : 'Invalid'}
            </span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                validationContext.blockchain_validated ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${validationContext.blockchain_validated ? 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Validation Errors */}
        {validationContext.validation_errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h3 className="text-sm font-semibold text-red-400 mb-2">
              Validation Errors ({validationContext.validation_errors.length})
            </h3>
            <ul className="space-y-2">
              {validationContext.validation_errors.map((error, index) => (
                <li key={index} className="text-sm">
                  <span className="font-mono text-red-300">{error.code}</span>
                  <span className="text-slate-300">: {error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

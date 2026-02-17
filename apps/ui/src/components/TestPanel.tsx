import { useState } from 'react';
import { Play, X, Loader2, CheckCircle, XCircle, CheckSquare, XSquare, AlertTriangle } from 'lucide-react';
import { useEditorStore } from '../store';
import { Manifest, ValidationReport } from '../types';
import ReactJson from 'react-json-view';
import { validateManifest, ValidationResult } from '../utils/validator';
import { manifestPresets, getManifestsByCategory, ManifestTemplate } from '../presets/manifestPresets';

// Dark mode hook
function useDarkMode() {
  return typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
}

function TestPanel() {
  const darkMode = useDarkMode();
  const {
    currentPolicy,
    testManifest,
    setTestManifest,
    testResults,
    clearTestResults,
    isTesting,
    setTesting,
    addTestResult,
  } = useEditorStore();
  const [manifestJson, setManifestJson] = useState('');
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ManifestTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'valid' | 'invalid' | 'edge-case'>('all');

  const handleLoadManifest = () => {
    try {
      setError('');
      const manifest = JSON.parse(manifestJson) as Manifest;
      setTestManifest(manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid manifest JSON');
    }
  };

  const handleLoadTemplate = (template: ManifestTemplate) => {
    try {
      setError('');
      const manifest = JSON.parse(template.json) as Manifest;
      setTestManifest(manifest);
      setManifestJson(template.json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    }
  };

  const handleClearManifest = () => {
    setManifestJson('');
    setTestManifest(null);
    setSelectedTemplate(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'valid':
        return <CheckSquare className="w-6 h-6 text-green-600" />;
      case 'invalid':
        return <XSquare className="w-6 h-6 text-red-600" />;
      case 'edge-case':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      default:
        return null;
    }
  };

  const filteredPresets = selectedCategory === 'all' 
    ? manifestPresets 
    : getManifestsByCategory(selectedCategory);

  const handleRunTest = async () => {
    if (!currentPolicy || !testManifest) {
      setError('Please load a policy and manifest first');
      return;
    }

    setTesting(true);
    setError('');

    try {
      const startTime = Date.now();
      
      // Extract validation config from policy rules
      const ttlRule = currentPolicy.rules.find(r => r.type === 'ttl');
      
      const validationConfig = {
        allowIssuanceDateInFuture: false,
        allowExpirationDateInPast: false,
        allowedKyaVersions: ['1.0'],
        maxAge: ttlRule?.parameters?.maxAge,
      };
      
      // Run validation with policy
      const validationResult: ValidationResult = await validateManifest(
        testManifest,
        currentPolicy,
        validationConfig
      );
      
      const duration = Date.now() - startTime;
      
      // Convert error strings to ValidationError objects
      const toValidationErrors = (errors: string[]) =>
        errors.map(err => ({ message: err, severity: 'error' as const }));
      
      // Use categorized errors from the validator
      const report: ValidationReport = {
        valid: validationResult.valid,
        schemaErrors: toValidationErrors(validationResult.policyErrors.schemaErrors),
        ttlErrors: toValidationErrors(validationResult.policyErrors.ttlErrors),
        cryptoErrors: toValidationErrors(validationResult.policyErrors.cryptoErrors),
        inspectorErrors: toValidationErrors(validationResult.policyErrors.otherErrors),
        policyErrors: [
          ...toValidationErrors(validationResult.policyErrors.teeErrors),
          ...toValidationErrors(validationResult.policyErrors.solvencyErrors),
          ...toValidationErrors(validationResult.policyErrors.regionErrors),
          ...toValidationErrors(validationResult.policyErrors.transactionValueErrors),
        ],
        totalErrors: validationResult.errors.length,
      };

      const result = {
        policyId: currentPolicy.id,
        manifest: testManifest,
        report,
        timestamp: new Date().toISOString(),
        duration,
      };

      addTestResult(result);
      setTesting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {testManifest === null && (
        <div className={`border rounded-xl p-6 shadow-sm transition-colors ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="mb-4">
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              📝 Load a Manifest Template
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Choose a manifest to test. Manifests are decoupled from policy presets - use any manifest with any policy.
            </p>
          </div>
          
          <div className="flex gap-2 mb-4">
            {[
              { value: 'all', label: 'All' },
              { value: 'valid', label: 'Valid' },
              { value: 'invalid', label: 'Invalid' },
              { value: 'edge-case', label: 'Edge Cases' },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-indigo-600 text-white'
                    : darkMode
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredPresets.map((template) => (
              <button
                key={template.id}
                onClick={() => handleLoadTemplate(template)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 hover:border-indigo-600 hover:bg-indigo-900/20'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    template.category === 'valid' ? darkMode ? 'bg-green-900/50' : 'bg-green-50' :
                    template.category === 'invalid' ? darkMode ? 'bg-red-900/50' : 'bg-red-50' :
                    darkMode ? 'bg-orange-900/50' : 'bg-orange-50'
                  }`}>
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{template.name}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        template.category === 'valid' ? darkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700' :
                        template.category === 'invalid' ? darkMode ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-700' :
                        darkMode ? 'bg-orange-900 text-orange-400' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{template.description}</div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  darkMode ? 'text-indigo-400 bg-indigo-900/50' : 'text-indigo-600 bg-indigo-50'
                }`}>
                  Click to load
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manifest Input Card */}
      {testManifest === null && (
        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'
        }`}>
          <div className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Or paste your manifest JSON below
          </div>
        </div>
      )}

      {testManifest !== null && (
        <div className={`border rounded-xl p-4 mb-6 transition-colors ${
          darkMode ? 'bg-indigo-900/30 border-indigo-800' : 'bg-indigo-50 border-indigo-200'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <span className={`text-sm ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Template loaded:</span>
              <span className={`text-sm font-medium ml-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>{selectedTemplate?.name}</span>
            </div>
            <button
              onClick={handleClearManifest}
              className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                darkMode
                  ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/50'
                  : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100'
              }`}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Manifest Input */}
      <div className={`rounded-xl shadow-sm border transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Test Manifest</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            {testManifest === null && (
              <>
                <label htmlFor="manifest-input" className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Manifest JSON
                </label>
                <div className={`text-xs mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  Supports KYA v1.0 manifest format with all required fields
                </div>
              </>
            )}
            <textarea
              id="manifest-input"
              value={manifestJson}
              onChange={(e) => setManifestJson(e.target.value)}
              rows={10}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm transition-colors ${
                darkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
              placeholder='{"kyaVersion": "1.0", "agentId": "did:key:z6Mk...", "proof": []}'
            />
            {error && (
              <p className={`mt-2 text-sm flex items-center gap-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                <XCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLoadManifest}
              disabled={!manifestJson}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Play className="w-4 h-4" />
              <span>{testManifest ? 'Update' : 'Load'} Manifest</span>
            </button>
            <button
              onClick={handleClearManifest}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className={`border rounded-xl p-6 transition-colors ${
        darkMode ? 'bg-indigo-900/30 border-indigo-800' : 'bg-indigo-50 border-indigo-200'
      }`}>
        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>Validation Status</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className={`text-sm ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Current Policy:</span>
            <p className={`font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>
              {currentPolicy?.name || <span className={darkMode ? 'text-indigo-500' : 'text-indigo-400'}>None loaded</span>}
            </p>
          </div>
          <div>
            <span className={`text-sm ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Loaded Manifest:</span>
            <p className={`font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>
              {testManifest ? 'Yes' : <span className={darkMode ? 'text-indigo-500' : 'text-indigo-400'}>None</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Run Test Card */}
      <div className={`rounded-xl shadow-sm border transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6">
          <button
            onClick={handleRunTest}
            disabled={!currentPolicy || !testManifest || isTesting}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running Validation...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Run Validation Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className={`rounded-xl shadow-sm border transition-colors ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Test Results</h2>
              <button
                onClick={clearTestResults}
                className={`text-sm font-medium transition-colors ${
                  darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clear Results
              </button>
            </div>
          </div>

          <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
            {testResults.map((result, index) => (
              <div key={index} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Test #{testResults.length - index}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <div>
                      <span className={`text-xs block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Duration</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{result.duration}ms</span>
                    </div>
                    <div>
                      <span className={`text-xs block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Status</span>
                      <div className="flex items-center gap-1 font-medium">
                        {result.report.valid ? (
                          <>
                            <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                            <span className={darkMode ? 'text-green-400' : 'text-green-600'}>Valid</span>
                          </>
                        ) : (
                          <>
                            <XCircle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                            <span className={darkMode ? 'text-red-400' : 'text-red-600'}>Invalid</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Errors</span>
                      <span className={`font-medium ${result.report.totalErrors > 0 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-green-400' : 'text-green-600')}`}>
                        {result.report.totalErrors}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Validation Report</h4>
                  <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <ReactJson
                      src={result.report}
                      theme={darkMode ? 'ocean' : 'rjv-default'}
                      collapsed={2}
                      displayObjectSize={false}
                      enableClipboard={false}
                      style={darkMode ? { backgroundColor: 'transparent' } : {}}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TestPanel;

/**
 * PromptPreview - Component for previewing prompts with rendered variables.
 */
import { useState, useEffect } from 'react';
import { useDemoStore, PromptConfig } from '../../store/demoStore';

interface PromptPreviewProps {
  prompt: PromptConfig | null;
}

// Pattern to match variables like {variable_name}
const VARIABLE_PATTERN = /\{([^}]+)\}/g;

export default function PromptPreview({ prompt }: PromptPreviewProps) {
  const { promptParameters, promptPreviewMode, setPromptPreviewMode } = useDemoStore();
  const [copied, setCopied] = useState(false);
  const [renderedText, setRenderedText] = useState<string>('');

  // Render prompt with parameters
  const renderPrompt = (template: string, params: Record<string, unknown>): string => {
    return template.replace(VARIABLE_PATTERN, (match, variable) => {
      const value = params[variable];
      if (value === undefined || value === null) {
        return match; // Keep original if parameter not found
      }
      return String(value);
    });
  };

  // Update rendered text when prompt or parameters change
  useEffect(() => {
    if (prompt) {
      if (promptPreviewMode === 'rendered') {
        setRenderedText(renderPrompt(prompt.systemPrompt, promptParameters));
      } else {
        setRenderedText(prompt.systemPrompt);
      }
    }
  }, [prompt, promptParameters, promptPreviewMode]);

  // Highlight variables in text
  const highlightVariables = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let match;

    VARIABLE_PATTERN.lastIndex = 0; // Reset regex

    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Check if variable has a value
      const variable = match[1];
      const hasValue = variable in promptParameters;
      const value = promptParameters[variable];

      // Add highlighted variable
      parts.push(
        <span
          key={`var-${match.index}`}
          className={`px-1 rounded font-mono ${
            hasValue
              ? 'bg-green-500/30 text-green-300'
              : 'bg-yellow-500/30 text-yellow-300'
          }`}
          title={hasValue ? String(value) : 'No value set'}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : [<span key="empty">{text}</span>];
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(renderedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!prompt) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <p className="text-sm text-slate-400">No prompt selected</p>
          </div>
        </div>
      </div>
    );
  }

  const variables = Array.from(prompt.systemPrompt.matchAll(VARIABLE_PATTERN)).map(
    (match) => match[1]
  );
  const hasVariables = variables.length > 0;
  const allVariablesSet = variables.every(
    (variable) => variable in promptParameters
  );

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Prompt Preview</h3>
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setPromptPreviewMode('template')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                promptPreviewMode === 'template'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Template
            </button>
            <button
              onClick={() => setPromptPreviewMode('rendered')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                promptPreviewMode === 'rendered'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Rendered
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Prompt Info */}
      <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{prompt.name}</h4>
            <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs">
              v{prompt.version}
            </span>
          </div>
          <span className="text-xs text-slate-400">{prompt.agentType}</span>
        </div>
        <p className="text-sm text-slate-400">{prompt.description}</p>
      </div>

      {/* Variables Status */}
      {hasVariables && (
        <div className={`mb-4 p-3 rounded-lg ${
          allVariablesSet
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-yellow-500/10 border border-yellow-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {allVariablesSet ? (
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={`text-sm font-medium ${
              allVariablesSet ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {allVariablesSet ? 'All variables set' : 'Some variables missing'}
            </span>
          </div>
          {promptPreviewMode === 'template' && (
            <div className="text-xs text-slate-400">
              {allVariablesSet
                ? 'All template variables have corresponding parameter values.'
                : 'Some template variables are missing parameter values.'}
            </div>
          )}
        </div>
      )}

      {/* Prompt Content */}
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {promptPreviewMode === 'template' ? 'Template View' : 'Rendered View'}
          </span>
          {promptPreviewMode === 'rendered' && !allVariablesSet && (
            <span className="text-xs text-yellow-400">
              Some variables may not be rendered
            </span>
          )}
        </div>
        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words font-mono">
          {promptPreviewMode === 'template'
            ? highlightVariables(prompt.systemPrompt)
            : renderedText}
        </div>
      </div>

      {/* Legend */}
      {promptPreviewMode === 'template' && hasVariables && (
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
          <span className="text-xs font-medium text-slate-300 mb-2 block">
            Variable Legend
          </span>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-500/30 text-green-300 rounded font-mono">
                {`{variable}`}
              </span>
              <span className="text-slate-400">Has value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-500/30 text-yellow-300 rounded font-mono">
                {`{variable}`}
              </span>
              <span className="text-slate-400">No value</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

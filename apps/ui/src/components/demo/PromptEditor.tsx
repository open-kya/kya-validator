/**
 * PromptEditor - Component for editing agent prompts.
 */
import { useState, useEffect, useRef } from 'react';
import { useDemoStore, PromptConfig } from '../../store/demoStore';

interface PromptEditorProps {
  prompt: PromptConfig;
  onSave: (prompt: PromptConfig) => Promise<void>;
  onCancel: () => void;
}

// Pattern to match variables like {variable_name}
const VARIABLE_PATTERN = /\{([^}]+)\}/g;

export default function PromptEditor({ prompt, onSave, onCancel }: PromptEditorProps) {
  const { promptParameters } = useDemoStore();
  const [editedPrompt, setEditedPrompt] = useState<PromptConfig>(prompt);
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedText, setHighlightedText] = useState<JSX.Element[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract variables from the prompt
  const extractVariables = (text: string): string[] => {
    const variables = new Set<string>();
    let match;
    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  // Validate prompt
  const validatePrompt = (promptText: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const variables = extractVariables(promptText);

    // Check if all variables have corresponding parameters
    variables.forEach((variable) => {
      if (!(variable in promptParameters)) {
        errors.push(`Missing parameter for variable: {${variable}}`);
      }
    });

    // Check if prompt is not empty
    if (!promptText.trim()) {
      errors.push('Prompt cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Highlight variables in text
  const highlightVariables = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let match;

    VARIABLE_PATTERN.lastIndex = 0; // Reset regex

    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add highlighted variable
      parts.push(
        <span
          key={`var-${match.index}`}
          className="bg-cyan-500/30 text-cyan-300 px-1 rounded font-mono"
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

  // Handle text area changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPromptText = e.target.value;
    setEditedPrompt({ ...editedPrompt, systemPrompt: newPromptText });
    
    // Validate and update highlighting
    const validation = validatePrompt(newPromptText);
    setIsValid(validation.isValid);
    setValidationErrors(validation.errors);
    setHighlightedText(highlightVariables(newPromptText));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedPrompt.systemPrompt]);

  // Initialize highlighting on mount
  useEffect(() => {
    setHighlightedText(highlightVariables(editedPrompt.systemPrompt));
    const validation = validatePrompt(editedPrompt.systemPrompt);
    setIsValid(validation.isValid);
    setValidationErrors(validation.errors);
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!isValid) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedPrompt);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const variables = extractVariables(editedPrompt.systemPrompt);

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Edit Prompt</h3>
        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Invalid
            </span>
          )}
        </div>
      </div>

      {/* Prompt Metadata */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Prompt Name
          </label>
          <input
            type="text"
            value={editedPrompt.name}
            onChange={(e) =>
              setEditedPrompt({ ...editedPrompt, name: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Version
          </label>
          <input
            type="text"
            value={editedPrompt.version}
            onChange={(e) =>
              setEditedPrompt({ ...editedPrompt, version: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Description
        </label>
        <input
          type="text"
          value={editedPrompt.description}
          onChange={(e) =>
            setEditedPrompt({ ...editedPrompt, description: e.target.value })
          }
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Variables Found */}
      {variables.length > 0 && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
          <span className="text-sm font-medium text-slate-300 mb-2 block">
            Variables Found
          </span>
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
              <span
                key={variable}
                className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs font-mono"
              >
                {`{${variable}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {!isValid && validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-sm font-medium text-red-400 mb-2 block">
            Validation Errors
          </span>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-xs text-red-300">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* System Prompt Editor */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          System Prompt
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={editedPrompt.systemPrompt}
            onChange={handleTextChange}
            className="w-full min-h-[300px] bg-slate-700/80 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none font-mono"
            placeholder="Enter your system prompt here. Use {variable_name} for variables..."
            spellCheck={false}
          />
          {/* Highlight overlay - displayed below textarea */}
          <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none px-4 py-3 min-h-[300px] text-sm leading-relaxed font-mono whitespace-pre-wrap break-words overflow-hidden">
            {highlightedText}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Variables are highlighted in cyan. Ensure all variables have corresponding parameters.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
}

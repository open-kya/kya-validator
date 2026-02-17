import { create } from 'zustand';
import { Policy, PolicyRule, Manifest, TestResult } from './types';

interface EditorStore {
  // State
  policies: Policy[];
  currentPolicy: Policy | null;
  testManifest: Manifest | null;
  testResults: TestResult[];
  isTesting: boolean;
  
  // Actions
  setCurrentPolicy: (policy: Policy | null) => void;
  updatePolicy: (policy: Policy) => void;
  addRule: (rule: PolicyRule) => void;
  removeRule: (ruleId: string) => void;
  updateRule: (ruleId: string, rule: Partial<PolicyRule>) => void;
  reorderRules: (rules: PolicyRule[]) => void;
  toggleRule: (ruleId: string) => void;
  
  // Test actions
  setTestManifest: (manifest: Manifest | null) => void;
  addTestResult: (result: TestResult) => void;
  clearTestResults: () => void;
  setTesting: (isTesting: boolean) => void;
  
  // Preset actions
  loadPreset: (preset: Policy) => void;
  exportPolicy: (policy: Policy) => string;
  importPolicy: (json: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  // Initial state
  policies: [],
  currentPolicy: null,
  testManifest: null,
  testResults: [],
  isTesting: false,
  
  // Policy actions
  setCurrentPolicy: (policy) => set({ currentPolicy: policy }),
  
  updatePolicy: (policy) => set({ currentPolicy: policy }),
  
  addRule: (rule) => set((state) => ({
    currentPolicy: state.currentPolicy
      ? {
          ...state.currentPolicy,
          rules: [...state.currentPolicy.rules, rule],
          updatedAt: new Date().toISOString(),
        }
      : null,
  })),
  
  removeRule: (ruleId) => set((state) => ({
    currentPolicy: state.currentPolicy
      ? {
          ...state.currentPolicy,
          rules: state.currentPolicy.rules.filter((r) => r.id !== ruleId),
          updatedAt: new Date().toISOString(),
        }
      : null,
  })),
  
  updateRule: (ruleId, updates) => set((state) => ({
    currentPolicy: state.currentPolicy
      ? {
          ...state.currentPolicy,
          rules: state.currentPolicy.rules.map((r) =>
            r.id === ruleId ? { ...r, ...updates } : r
          ),
          updatedAt: new Date().toISOString(),
        }
      : null,
  })),
  
  reorderRules: (rules) => set((state) => ({
    currentPolicy: state.currentPolicy
      ? {
          ...state.currentPolicy,
          rules: rules.map((r, index) => ({ ...r, order: index })),
          updatedAt: new Date().toISOString(),
        }
      : null,
  })),
  
  toggleRule: (ruleId) => set((state) => ({
    currentPolicy: state.currentPolicy
      ? {
          ...state.currentPolicy,
          rules: state.currentPolicy.rules.map((r) =>
            r.id === ruleId ? { ...r, enabled: !r.enabled } : r
          ),
          updatedAt: new Date().toISOString(),
        }
      : null,
  })),
  
  // Test actions
  setTestManifest: (manifest) => set({ testManifest: manifest }),
  
  addTestResult: (result) => set((state) => ({
    testResults: [result, ...state.testResults],
  })),
  
  clearTestResults: () => set({ testResults: [] }),
  
  setTesting: (isTesting) => set({ isTesting }),
  
  // Preset actions
  loadPreset: (preset) => set({
    currentPolicy: {
      ...preset,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  
  exportPolicy: (policy) => {
    return JSON.stringify(policy, null, 2);
  },
  
  importPolicy: (json) => {
    try {
      const policy = JSON.parse(json) as Policy;
      set({
        currentPolicy: {
          ...policy,
          id: Date.now().toString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to import policy:', error);
      throw new Error('Invalid policy JSON');
    }
  },
}));

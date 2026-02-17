import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentThinking from '../../../src/components/demo/AgentThinking';
import { useDemoStore } from '../../../src/store/demoStore';
import {
  mockAgentThinking,
  mockAgentThinkingLowConfidence,
  mockThinkingHistory,
} from '../../fixtures/demoFixtures';

describe('AgentThinking', () => {
  beforeEach(() => {
    useDemoStore.getState().reset();
  });

  describe('Empty State', () => {
    it('should show empty state when no thinking history', () => {
      render(<AgentThinking />);
      expect(screen.getByText('Agent Thinking')).toBeInTheDocument();
      expect(screen.getByText('No thinking history available yet.')).toBeInTheDocument();
    });
  });

  describe('Thinking Entry Rendering', () => {
    beforeEach(() => {
      useDemoStore.getState().addThinking(mockAgentThinking);
    });

    it('should render thinking heading', () => {
      render(<AgentThinking />);
      expect(screen.getByText('Agent Thinking')).toBeInTheDocument();
    });

    it('should render agent ID', () => {
      render(<AgentThinking />);
      expect(screen.getByText(mockAgentThinking.agent_id)).toBeInTheDocument();
    });

    it('should render reasoning', () => {
      render(<AgentThinking />);
      expect(screen.getByText(mockAgentThinking.reasoning)).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      render(<AgentThinking />);
      expect(screen.getByText(mockAgentThinking.timestamp)).toBeInTheDocument();
    });

    it('should render confidence percentage', () => {
      render(<AgentThinking />);
      const expectedPercentage = `${(mockAgentThinking.confidence * 100).toFixed(0)}% confidence`;
      expect(screen.getByText(expectedPercentage)).toBeInTheDocument();
    });
  });

  describe('Confidence Indicators', () => {
    const getIconPath = (_container: HTMLElement, confidence: number): string | null => {
      const confidenceLabel = `${(confidence * 100).toFixed(0)}% confidence`;
      const labelNode = screen.getByText(confidenceLabel);
      const detailsPanel = labelNode.closest('.flex-1');
      const entry = detailsPanel?.parentElement;
      return entry?.querySelector('svg path')?.getAttribute('d') ?? null;
    };

    it('should show checkmark icon for high confidence (>= 0.8)', () => {
      useDemoStore.getState().addThinking(mockAgentThinking);
      const { container } = render(<AgentThinking />);
      const d = getIconPath(container, mockAgentThinking.confidence);
      expect(d).toContain('M9 12l2 2 4-4');
    });

    it('should show clock icon for medium confidence (>= 0.5)', () => {
      const mediumConfidenceThinking = { ...mockAgentThinking, confidence: 0.6 };
      useDemoStore.getState().addThinking(mediumConfidenceThinking);
      const { container } = render(<AgentThinking />);
      const d = getIconPath(container, mediumConfidenceThinking.confidence);
      expect(d).toContain('M12 8v4l3 3');
    });

    it('should show warning icon for low confidence (< 0.5)', () => {
      const lowConfidenceThinking = { ...mockAgentThinking, confidence: 0.3 };
      useDemoStore.getState().addThinking(lowConfidenceThinking);
      const { container } = render(<AgentThinking />);
      const d = getIconPath(container, lowConfidenceThinking.confidence);
      expect(d).toContain('M12 9v2m0 4h.01');
    });
  });

  describe('Confidence Progress Bar', () => {
    const getProgressBar = (_container: HTMLElement, confidence: number): HTMLElement => {
      const confidenceLabel = `${(confidence * 100).toFixed(0)}% confidence`;
      const labelNode = screen.getByText(confidenceLabel);
      const progressSection = labelNode.closest('.mt-1');
      const progressTrack = progressSection?.firstElementChild as HTMLElement | null;
      const progressBar = progressTrack?.firstElementChild as HTMLElement | null;
      expect(progressBar).toBeTruthy();
      return progressBar as HTMLElement;
    };

    it('should show green progress bar for high confidence (>= 0.8)', () => {
      useDemoStore.getState().addThinking(mockAgentThinking);
      const { container } = render(<AgentThinking />);
      const progressBar = getProgressBar(container, mockAgentThinking.confidence);
      expect(progressBar?.style.backgroundColor).toBe('rgb(16, 185, 129)');
      expect(progressBar?.style.width).toBe('85%');
    });

    it('should show yellow progress bar for medium confidence (>= 0.5)', () => {
      const mediumConfidenceThinking = { ...mockAgentThinking, confidence: 0.6 };
      useDemoStore.getState().addThinking(mediumConfidenceThinking);
      const { container } = render(<AgentThinking />);
      const progressBar = getProgressBar(container, mediumConfidenceThinking.confidence);
      expect(progressBar?.style.backgroundColor).toBe('rgb(245, 158, 11)');
      expect(progressBar?.style.width).toBe('60%');
    });

    it('should show red progress bar for low confidence (< 0.5)', () => {
      const lowConfidenceThinking = { ...mockAgentThinking, confidence: 0.3 };
      useDemoStore.getState().addThinking(lowConfidenceThinking);
      const { container } = render(<AgentThinking />);
      const progressBar = getProgressBar(container, lowConfidenceThinking.confidence);
      expect(progressBar?.style.backgroundColor).toBe('rgb(239, 68, 68)');
      expect(progressBar?.style.width).toBe('30%');
    });
  });

  describe('Next Actions', () => {
    it('should render next actions when present', () => {
      useDemoStore.getState().addThinking(mockAgentThinking);
      render(<AgentThinking />);
      expect(screen.getByText('Next actions:')).toBeInTheDocument();
    });

    it('should render each next action as list item', () => {
      useDemoStore.getState().addThinking(mockAgentThinking);
      render(<AgentThinking />);
      mockAgentThinking.next_actions.forEach(action => {
        expect(screen.getByText(action)).toBeInTheDocument();
      });
    });

    it('should not show next actions section when empty', () => {
      const thinkingWithoutActions = { ...mockAgentThinking, next_actions: [] };
      useDemoStore.getState().addThinking(thinkingWithoutActions);
      render(<AgentThinking />);
      expect(screen.queryByText('Next actions:')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Thinking Entries', () => {
    beforeEach(() => {
      mockThinkingHistory.forEach(thinking => useDemoStore.getState().addThinking(thinking));
    });

    it('should render all thinking entries', () => {
      render(<AgentThinking />);
      mockThinkingHistory.forEach(thinking => {
        expect(screen.getByText(thinking.reasoning)).toBeInTheDocument();
      });
    });

    it('should render agent ID for each entry', () => {
      render(<AgentThinking />);
      mockThinkingHistory.forEach(thinking => {
        expect(screen.getAllByText(thinking.agent_id)).toHaveLength(2);
      });
    });
  });
});

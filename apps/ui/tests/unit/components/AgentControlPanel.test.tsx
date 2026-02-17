import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentControlPanel from '../../../src/components/demo/AgentControlPanel';
import { useDemoStore } from '../../../src/store/demoStore';
import { AgentMode, ClientType } from '../../../src/types/demoTypes';

describe('AgentControlPanel', () => {
  beforeEach(() => {
    useDemoStore.getState().reset();
    useDemoStore.setState({
      agentMode: AgentMode.SIMULATED,
      clientType: ClientType.FLOW_STOREFRONT,
      sessionId: null,
      isSessionActive: false,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
    });
  });

  describe('Rendering', () => {
    it('should render the panel heading', () => {
      render(<AgentControlPanel />);
      expect(screen.getByText('Agent Control Panel')).toBeInTheDocument();
    });

    it('should render agent mode indicator', () => {
      render(<AgentControlPanel />);
      expect(screen.getByText('Current Mode')).toBeInTheDocument();
    });

    it('should render send message button', () => {
      render(<AgentControlPanel />);
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    });

    it('should render validate manifest button', () => {
      render(<AgentControlPanel />);
      expect(screen.getByRole('button', { name: 'Validate Manifest' })).toBeInTheDocument();
    });
  });

  describe('Agent Mode Indicator', () => {
    it('should show Simulated mode by default', () => {
      render(<AgentControlPanel />);
      expect(screen.getByText('Simulated')).toBeInTheDocument();
    });

    it('should show LLM mode when set', () => {
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      render(<AgentControlPanel />);
      expect(screen.getByText('Real LLM')).toBeInTheDocument();
      expect(screen.getByText('Using real LLM for agent reasoning (requires API key)')).toBeInTheDocument();
    });

    it('should have correct styling for Simulated mode', () => {
      render(<AgentControlPanel />);
      const modeBadge = screen.getByText('Simulated');
      expect(modeBadge?.className).toContain('bg-blue-500/20');
      expect(modeBadge?.className).toContain('text-blue-400');
    });

    it('should have correct styling for LLM mode', () => {
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      render(<AgentControlPanel />);
      const modeBadge = screen.getByText('Real LLM');
      expect(modeBadge?.className).toContain('bg-purple-500/20');
      expect(modeBadge?.className).toContain('text-purple-400');
    });
  });

  describe('Workflow State Display', () => {
    it('should not show workflow state when not set', () => {
      render(<AgentControlPanel />);
      expect(screen.queryByText('Workflow State')).not.toBeInTheDocument();
    });

    it('should show workflow state when set', () => {
      useDemoStore.getState().setWorkflowState('negotiation');
      render(<AgentControlPanel />);
      expect(screen.getByText('Workflow State')).toBeInTheDocument();
      expect(screen.getByText('negotiation')).toBeInTheDocument();
    });

    it('should show workflow context when set', () => {
      useDemoStore.getState().setWorkflowContext({ vendor_id: 'vendor-001', total: 10000 });
      render(<AgentControlPanel />);
      expect(screen.getByText('Workflow Context')).toBeInTheDocument();
      expect(screen.getByText('vendor_id')).toBeInTheDocument();
      expect(screen.getByText('10000')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should disable send message button when session is inactive', () => {
      render(<AgentControlPanel />);
      const button = screen.getByRole('button', { name: 'Send' });
      expect(button).toBeDisabled();
    });

    it('should enable send message button when session is active, connected, and message is provided', async () => {
      const user = userEvent.setup();
      useDemoStore.setState({
        sessionId: 'session-123',
        isSessionActive: true,
        isConnected: true,
      });
      render(<AgentControlPanel />);
      const input = screen.getByPlaceholderText('Type a custom message...');
      await user.type(input, 'hello');
      const button = screen.getByRole('button', { name: 'Send' });
      expect(button).not.toBeDisabled();
    });

    it('should disable validate manifest button when session is inactive', () => {
      render(<AgentControlPanel />);
      const button = screen.getByRole('button', { name: 'Validate Manifest' });
      expect(button).toBeDisabled();
    });

    it('should enable validate manifest button when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<AgentControlPanel />);
      const button = screen.getByRole('button', { name: 'Validate Manifest' });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Inactive Session Message', () => {
    it('should show inactive message when session is not active', () => {
      render(<AgentControlPanel />);
      expect(screen.getByText('Start a session to enable agent controls')).toBeInTheDocument();
    });

    it('should not show inactive message when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<AgentControlPanel />);
      expect(screen.queryByText('Start a session to enable agent controls')).not.toBeInTheDocument();
    });
  });
});

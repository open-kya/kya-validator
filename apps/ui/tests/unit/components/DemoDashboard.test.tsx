import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DemoDashboard from '../../../src/pages/demo/DemoDashboard';
import { useDemoStore } from '../../../src/store/demoStore';
import { AgentMode, ClientType, ExchangeStatus } from '../../../src/types/demoTypes';

const ensureSessionStarted = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  const startButton = screen.getByRole('button', { name: 'Start Session' });
  await user.click(startButton);
  await screen.findByRole('button', { name: 'End Session' });
};

describe('DemoDashboard', () => {
  beforeEach(() => {
    // Reset store before each test
    useDemoStore.getState().reset();
  });

  describe('Rendering', () => {
    it('should render the dashboard heading', () => {
      render(<DemoDashboard />);
      expect(screen.getByText('KYA Validator Demo')).toBeInTheDocument();
      expect(screen.getByText('Agent-Based Procurement')).toBeInTheDocument();
    });

    it('should render session configuration section', () => {
      render(<DemoDashboard />);
      expect(screen.getByText('Session Configuration')).toBeInTheDocument();
    });

    it('should render procurement agent mode selector', () => {
      render(<DemoDashboard />);
      expect(screen.getByLabelText('Procurement Agent Mode')).toBeInTheDocument();
    });

    it('should render recipient agent mode selector', () => {
      render(<DemoDashboard />);
      expect(screen.getByLabelText('Recipient Agent Mode')).toBeInTheDocument();
    });

    it('should render client type selector', () => {
      render(<DemoDashboard />);
      expect(screen.getByLabelText('Client Type')).toBeInTheDocument();
    });

    it('should render start session button initially', () => {
      render(<DemoDashboard />);
      expect(screen.getByRole('button', { name: 'Start Session' })).toBeInTheDocument();
    });

    it('should render tab navigation', () => {
      render(<DemoDashboard />);
      expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Workflow Flow' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Negotiation' })).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('should show disconnected status initially', () => {
      render(<DemoDashboard />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show connected status when connected', () => {
      useDemoStore.getState().setIsConnected(true);
      render(<DemoDashboard />);
      expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
    });

    it('should show connecting status when connecting', () => {
      useDemoStore.getState().setIsConnecting(true);
      render(<DemoDashboard />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should show connection error when present', () => {
      const errorMessage = 'Connection failed';
      useDemoStore.getState().setConnectionError(errorMessage);
      render(<DemoDashboard />);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('Session Controls', () => {
    it('should enable procurement mode selector when session is inactive', () => {
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Procurement Agent Mode');
      expect(selector).not.toBeDisabled();
    });

    it('should disable procurement mode selector when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Procurement Agent Mode');
      expect(selector).toBeDisabled();
    });

    it('should enable recipient mode selector when session is inactive', () => {
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Recipient Agent Mode');
      expect(selector).not.toBeDisabled();
    });

    it('should disable recipient mode selector when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Recipient Agent Mode');
      expect(selector).toBeDisabled();
    });

    it('should enable client type selector when session is inactive', () => {
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Client Type');
      expect(selector).not.toBeDisabled();
    });

    it('should disable client type selector when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Client Type');
      expect(selector).toBeDisabled();
    });

    it('should show start session button when session is inactive', () => {
      render(<DemoDashboard />);
      expect(screen.getByRole('button', { name: 'Start Session' })).toBeInTheDocument();
    });

    it('should show end session button when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<DemoDashboard />);
      expect(screen.getByRole('button', { name: 'End Session' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Start Session' })).not.toBeInTheDocument();
    });
  });

  describe('Dual-Role Mode Selection', () => {
    it('should have LLM mode as default for both procurement and recipient', () => {
      render(<DemoDashboard />);
      const procurementSelector = screen.getByLabelText('Procurement Agent Mode') as HTMLSelectElement;
      const recipientSelector = screen.getByLabelText('Recipient Agent Mode') as HTMLSelectElement;
      expect(procurementSelector.value).toBe(AgentMode.LLM);
      expect(recipientSelector.value).toBe(AgentMode.LLM);
    });

    it('should change procurement mode independently', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Procurement Agent Mode');
      await user.selectOptions(selector, AgentMode.LLM);
      expect(useDemoStore.getState().procurementMode).toBe(AgentMode.LLM);
      // Legacy agentMode should also update for compatibility
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });

    it('should change recipient mode independently', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Recipient Agent Mode');
      await user.selectOptions(selector, AgentMode.LLM);
      expect(useDemoStore.getState().recipientMode).toBe(AgentMode.LLM);
      // Legacy agentMode should also update for compatibility
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });

    it('should allow different modes for procurement and recipient', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      const procurementSelector = screen.getByLabelText('Procurement Agent Mode');
      const recipientSelector = screen.getByLabelText('Recipient Agent Mode');
      await user.selectOptions(procurementSelector, AgentMode.LLM);
      await user.selectOptions(recipientSelector, AgentMode.SIMULATED);
      expect(useDemoStore.getState().procurementMode).toBe(AgentMode.LLM);
      expect(useDemoStore.getState().recipientMode).toBe(AgentMode.SIMULATED);
      // Legacy agentMode should follow procurement mode
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });
  });

  describe('Client Type Selection', () => {
    it('should have flow_storefront as default', () => {
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Client Type') as HTMLSelectElement;
      expect(selector.value).toBe(ClientType.FLOW_STOREFRONT);
    });

    it('should change client type when selected', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      const selector = screen.getByLabelText('Client Type');
      await user.selectOptions(selector, ClientType.AGENT_RECEIVER);
      expect(useDemoStore.getState().clientType).toBe(ClientType.AGENT_RECEIVER);
    });
  });

  describe('Start Session', () => {
    it('should set session active when start button is clicked', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      await ensureSessionStarted(user);
      expect(screen.getByRole('button', { name: 'End Session' })).toBeInTheDocument();
    });

    it('should include dual-role modes in session start payload', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      
      // Set different modes
      const procurementSelector = screen.getByLabelText('Procurement Agent Mode');
      const recipientSelector = screen.getByLabelText('Recipient Agent Mode');
      await user.selectOptions(procurementSelector, AgentMode.LLM);
      await user.selectOptions(recipientSelector, AgentMode.SIMULATED);
      
      const fetchSpy = vi.spyOn(global, 'fetch');
      await ensureSessionStarted(user);
      
      // Verify the session start payload includes both role-specific modes
      const fetchCalls = fetchSpy.mock.calls;
      const startSessionCall = fetchCalls.find((call: any) =>
        call[0].includes('/session/start')
      );
      const body = JSON.parse(startSessionCall[1]?.body);
      expect(body.procurement_mode).toBe(AgentMode.LLM);
      expect(body.recipient_mode).toBe(AgentMode.SIMULATED);
      expect(body.agent_mode).toBeUndefined(); // Legacy field should be removed
    });

    it('should use legacy agent_mode mapping when only legacy mode is set', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      
      // Default modes are all SIMULATED
      const fetchSpy = vi.spyOn(global, 'fetch');
      await ensureSessionStarted(user);
      
      const fetchCalls = fetchSpy.mock.calls;
      const startSessionCall = fetchCalls.find((call: any) =>
        call[0].includes('/session/start')
      );
      const body = JSON.parse(startSessionCall[1]?.body);
      // Verify session started with default modes
      expect(body.procurement_mode || body.agent_mode).toBeDefined();
    });
  });

  describe('End Session', () => {
    it('should set session inactive when end button is clicked', async () => {
      const user = userEvent.setup();
      useDemoStore.getState().setIsSessionActive(true);
      render(<DemoDashboard />);
      const endButton = screen.getByRole('button', { name: 'End Session' });
      await user.click(endButton);
      expect(useDemoStore.getState().isSessionActive).toBe(false);
    });
  });

  describe('Tab Navigation', () => {
    it('should show dashboard tab content by default', () => {
      render(<DemoDashboard />);
      const dashboardTab = screen.getByRole('button', { name: 'Dashboard' });
      expect(dashboardTab.className).toContain('bg-cyan-500');
    });

    it('should switch to workflow flow tab when clicked', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      const flowTab = screen.getByRole('button', { name: 'Workflow Flow' });
      await user.click(flowTab);
      expect(screen.getByText('Workflow Visualization')).toBeInTheDocument();
    });

    it('should switch to negotiation tab when clicked', async () => {
      const user = userEvent.setup();
      render(<DemoDashboard />);
      const negotiationTab = screen.getByRole('button', { name: 'Negotiation' });
      await user.click(negotiationTab);
      expect(screen.getAllByText('Negotiation History').length).toBeGreaterThan(0);
    });
  });

  // Exchange status is displayed in NegotiationTimeline component, not Dashboard
  // Those tests are in NegotiationTimeline.test.tsx

  describe('Agent Thinking Panel', () => {
    it('should not show agent thinking panel when session is inactive', () => {
      render(<DemoDashboard />);
      expect(screen.queryByText('Agent Thinking')).not.toBeInTheDocument();
    });

    it('should show agent thinking panel when session is active', () => {
      useDemoStore.getState().setIsSessionActive(true);
      render(<DemoDashboard />);
      expect(screen.getByText('Agent Thinking')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should reset store on unmount', () => {
      const { unmount } = render(<DemoDashboard />);
      useDemoStore.getState().setSessionId('session-123');
      useDemoStore.getState().setIsSessionActive(true);
      unmount();
      expect(useDemoStore.getState().sessionId).toBeNull();
      expect(useDemoStore.getState().isSessionActive).toBe(false);
    });
  });
});

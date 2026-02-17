import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import TerminalPane from '../../../src/components/demo/TerminalPane';
import { useDemoStore } from '../../../src/store/demoStore';
import { mockAgentMessage, mockAgentMessages } from '../../fixtures/demoFixtures';

const getMessageCard = (content: string): HTMLElement | null => {
  const contentNode = screen.getByText(content);
  return contentNode.closest('.border-l-2');
};

describe('TerminalPane', () => {
  beforeEach(() => {
    useDemoStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render terminal header', () => {
      render(<TerminalPane />);
      expect(screen.getByText('Terminal')).toBeInTheDocument();
    });

    it('should render terminal window controls', () => {
      const { container } = render(<TerminalPane />);
      const redDot = container.querySelector('.bg-red-500');
      const yellowDot = container.querySelector('.bg-yellow-500');
      const greenDot = container.querySelector('.bg-green-500');
      expect(redDot).toBeInTheDocument();
      expect(yellowDot).toBeInTheDocument();
      expect(greenDot).toBeInTheDocument();
    });

    it('should render terminal footer', () => {
      render(<TerminalPane />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no messages', () => {
      render(<TerminalPane />);
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Start a session to begin agent communication')).toBeInTheDocument();
    });

    it('should show 0 messages count in footer', () => {
      render(<TerminalPane />);
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('should render a single message', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      expect(screen.getByText(mockAgentMessage.content)).toBeInTheDocument();
      expect(screen.getByText(mockAgentMessage.sender)).toBeInTheDocument();
    });

    it('should render multiple messages', () => {
      mockAgentMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
      render(<TerminalPane />);
      expect(screen.getByText(mockAgentMessages[0].content)).toBeInTheDocument();
      expect(screen.getByText(mockAgentMessages[1].content)).toBeInTheDocument();
      expect(screen.getByText(mockAgentMessages[2].content)).toBeInTheDocument();
    });

    it('should show message count in footer', () => {
      mockAgentMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
      render(<TerminalPane />);
      expect(screen.getByText(`${mockAgentMessages.length} messages`)).toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    it('should apply cyan styling for procurement_agent messages', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      const message = getMessageCard(mockAgentMessage.content);
      expect(message?.className).toContain('border-cyan-500');
      expect(message?.className).toContain('bg-cyan-500/5');
    });

    it('should apply purple styling for recipient_agent messages', () => {
      const recipientMessage = { ...mockAgentMessage, sender: 'recipient_agent' };
      useDemoStore.getState().addMessage(recipientMessage);
      render(<TerminalPane />);
      const message = getMessageCard(recipientMessage.content);
      expect(message?.className).toContain('border-purple-500');
      expect(message?.className).toContain('bg-purple-500/5');
    });

    it('should show cyan color for procurement_agent sender', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      const sender = screen.getByText(mockAgentMessage.sender);
      expect(sender?.className).toContain('text-cyan-400');
    });

    it('should show purple color for recipient_agent sender', () => {
      const recipientMessage = { ...mockAgentMessage, sender: 'recipient_agent' };
      useDemoStore.getState().addMessage(recipientMessage);
      render(<TerminalPane />);
      const sender = screen.getByText(recipientMessage.sender);
      expect(sender?.className).toContain('text-purple-400');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should display formatted timestamp for message', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      const date = new Date(mockAgentMessage.timestamp);
      const expectedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      expect(screen.getByText(expectedTime)).toBeInTheDocument();
    });
  });

  describe('Validation Context Display', () => {
    it('should show validation context when present', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      expect(screen.getByText('Validation Status:')).toBeInTheDocument();
    });

    it('should show VALID status in green', () => {
      const validMessage = { ...mockAgentMessage, validation_context: { ...mockAgentMessage.validation_context!, validation_status: 'valid' as any } };
      useDemoStore.getState().addMessage(validMessage);
      render(<TerminalPane />);
      const validStatus = screen.getByText('VALID');
      expect(validStatus?.className).toContain('text-green-400');
    });

    it('should show INVALID status in red', () => {
      const invalidMessage = { ...mockAgentMessage, validation_context: { ...mockAgentMessage.validation_context!, validation_status: 'invalid' as any } };
      useDemoStore.getState().addMessage(invalidMessage);
      render(<TerminalPane />);
      const invalidStatus = screen.getByText('INVALID');
      expect(invalidStatus?.className).toContain('text-red-400');
    });

    it('should show MCP validation status', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      expect(screen.getByText('MCP')).toBeInTheDocument();
      expect(screen.getAllByText('Valid').length).toBeGreaterThan(0);
    });

    it('should show TEE validation status', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      expect(screen.getByText('TEE')).toBeInTheDocument();
    });

    it('should show Blockchain validation status', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      render(<TerminalPane />);
      expect(screen.getByText('Blockchain')).toBeInTheDocument();
    });

    it('should show red text for invalid MCP validation', () => {
      const invalidMessage = { ...mockAgentMessage, validation_context: { ...mockAgentMessage.validation_context!, mcp_validated: false } };
      useDemoStore.getState().addMessage(invalidMessage);
      const { container } = render(<TerminalPane />);
      const mcpStatuses = container.querySelectorAll('.text-red-400');
      expect(mcpStatuses.length).toBeGreaterThan(0);
    });
  });

  describe('Thinking Process Display', () => {
    it('should show thinking process when present', () => {
      const thinkingMessage = { ...mockAgentMessage, thinking_process: 'Analyzing request...' };
      useDemoStore.getState().addMessage(thinkingMessage);
      render(<TerminalPane />);
      expect(screen.getByText('Agent Thinking:')).toBeInTheDocument();
      expect(screen.getByText('Analyzing request...')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('should scroll to bottom when new message is added', () => {
      render(<TerminalPane />);

      const terminalContent = document.querySelector('.flex-1.overflow-y-auto') as HTMLDivElement;
      expect(terminalContent).toBeTruthy();

      Object.defineProperty(terminalContent, 'scrollHeight', {
        value: 100,
        configurable: true,
      });

      act(() => {
        useDemoStore.getState().addMessage(mockAgentMessage);
      });

      expect(terminalContent.scrollTop).toBe(100);
    });
  });
});

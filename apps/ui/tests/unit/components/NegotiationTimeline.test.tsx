import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NegotiationTimeline from '../../../src/components/demo/NegotiationTimeline';
import { useDemoStore } from '../../../src/store/demoStore';
import { mockAgentMessages, mockAgentMessageSimulated } from '../../fixtures/demoFixtures';
import type { AgentMessage } from '../../../src/types/demoTypes';

describe('NegotiationTimeline', () => {
  beforeEach(() => {
    useDemoStore.getState().reset();
  });

  describe('Rendering', () => {
    it('should render timeline heading', () => {
      render(<NegotiationTimeline />);
      expect(screen.getByText('Negotiation History')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no messages', () => {
      render(<NegotiationTimeline />);
      expect(screen.getByText('No negotiation messages yet. Start a session to begin negotiation.')).toBeInTheDocument();
    });

    it('should not show timeline line when empty', () => {
      const { container } = render(<NegotiationTimeline />);
      const timelineLine = container.querySelector('.absolute.left-6');
      expect(timelineLine).not.toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    beforeEach(() => {
      mockAgentMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
    });

    it('should render all negotiation messages', () => {
      render(<NegotiationTimeline />);
      mockAgentMessages.forEach(msg => {
        expect(screen.getByText(msg.content)).toBeInTheDocument();
      });
    });

    it('should show Buyer label for procurement_agent', () => {
      render(<NegotiationTimeline />);
      expect(screen.getByText('Buyer Messages')).toBeInTheDocument();
    });

    it('should show Vendor label for recipient_agent', () => {
      render(<NegotiationTimeline />);
      expect(screen.getByText('Vendor')).toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    beforeEach(() => {
      mockAgentMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
    });

    it('should apply cyan styling for procurement_agent messages', () => {
      render(<NegotiationTimeline />);
      const buyerMessages = screen.getAllByText('Buyer');
      buyerMessages.forEach(msg => {
        expect(msg?.className).toContain('bg-cyan-500/20');
        expect(msg?.className).toContain('text-cyan-400');
      });
    });

    it('should apply purple styling for recipient_agent messages', () => {
      render(<NegotiationTimeline />);
      const vendorMessages = screen.getAllByText('Vendor');
      vendorMessages.forEach(msg => {
        expect(msg?.className).toContain('bg-purple-500/20');
        expect(msg?.className).toContain('text-purple-400');
      });
    });

    it('should show cyan dot for procurement_agent messages', () => {
      const { container } = render(<NegotiationTimeline />);
      const cyanDots = container.querySelectorAll('.bg-cyan-500');
      expect(cyanDots.length).toBeGreaterThan(0);
    });

    it('should show purple dot for recipient_agent messages', () => {
      const { container } = render(<NegotiationTimeline />);
      const purpleDots = container.querySelectorAll('.bg-purple-500');
      expect(purpleDots.length).toBeGreaterThan(0);
    });
  });

  describe('Timestamp Formatting', () => {
    it('should display formatted timestamp for messages', () => {
      useDemoStore.getState().addMessage(mockAgentMessages[0]);
      render(<NegotiationTimeline />);
      const date = new Date(mockAgentMessages[0].timestamp);
      const expectedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(screen.getByText(expectedTime)).toBeInTheDocument();
    });
  });

  describe('Validation Context in Timeline', () => {
    it('should show validation context when present', () => {
      useDemoStore.getState().addMessage(mockAgentMessages[0]);
      render(<NegotiationTimeline />);
      expect(screen.getByText('Validated:')).toBeInTheDocument();
    });

    it('should show VALID status in green', () => {
      const validMessage = { ...mockAgentMessages[0], validation_context: { ...mockAgentMessages[0].validation_context!, validation_status: 'valid' as any } };
      useDemoStore.getState().addMessage(validMessage);
      render(<NegotiationTimeline />);
      const validStatus = screen.getAllByText('VALID').find(el => el.parentElement?.textContent?.includes('Validated:'));
      expect(validStatus?.className).toContain('text-green-400');
    });

    it('should show INVALID status in red', () => {
      const invalidMessage = { ...mockAgentMessages[0], validation_context: { ...mockAgentMessages[0].validation_context!, validation_status: 'invalid' as any } };
      useDemoStore.getState().addMessage(invalidMessage);
      render(<NegotiationTimeline />);
      const invalidStatus = screen.getAllByText('INVALID').find(el => el.parentElement?.textContent?.includes('Validated:'));
      expect(invalidStatus?.className).toContain('text-red-400');
    });
  });

  describe('Thinking Process in Timeline', () => {
    it('should show thinking process when present', () => {
      const thinkingMessage = { ...mockAgentMessages[0], thinking_process: 'Analyzing offer...' };
      useDemoStore.getState().addMessage(thinkingMessage);
      render(<NegotiationTimeline />);
      expect(screen.getByText('Thinking:')).toBeInTheDocument();
      expect(screen.getByText('Analyzing offer...')).toBeInTheDocument();
    });
  });

  describe('Generation Provenance', () => {
    it('should show AI Generated badge for LLM-sourced messages', () => {
      const llmMessage = { ...mockAgentMessages[0], generation_provenance: { source: 'llm', provider: 'openai', model: 'gpt-4' } };
      useDemoStore.getState().addMessage(llmMessage);
      render(<NegotiationTimeline />);
      expect(screen.getByText('AI Generated')).toBeInTheDocument();
      expect(screen.getByText(/openai/)).toBeInTheDocument();
    });

    it('should show Simulated badge for simulated messages', () => {
      useDemoStore.getState().addMessage(mockAgentMessageSimulated);
      render(<NegotiationTimeline />);
      expect(screen.getByText('Simulated')).toBeInTheDocument();
    });

    it('should not show provider/model for simulated messages', () => {
      useDemoStore.getState().addMessage(mockAgentMessageSimulated);
      render(<NegotiationTimeline />);
      expect(screen.queryByText(/openai|gpt-4/)).not.toBeInTheDocument();
    });

    it('should show provenance badge in message card', () => {
      const llmMessage = { ...mockAgentMessages[0], generation_provenance: { source: 'llm', provider: 'glm', model: 'glm-4' } };
      useDemoStore.getState().addMessage(llmMessage);
      render(<NegotiationTimeline />);
      const badge = screen.getByText('AI Generated');
      expect(badge.className).toContain('bg-green-500/20');
      expect(badge.className).toContain('text-green-400');
    });

    it('should show simulated badge with fallback reason', () => {
      const simulatedWithReason = { ...mockAgentMessageSimulated, generation_provenance: { source: 'simulated', fallback_reason: 'API timeout' } };
      useDemoStore.getState().addMessage(simulatedWithReason);
      render(<NegotiationTimeline />);
      expect(screen.getByText('Simulated')).toBeInTheDocument();
      expect(screen.getByText('API timeout')).toBeInTheDocument();
    });
  });

  describe('Provenance in Debug Details', () => {
    it('should include generation_provenance in debug details when present', () => {
      const messageWithProvenance = {
        ...mockAgentMessages[0],
        generation_provenance: { source: 'llm', provider: 'openai', model: 'gpt-4' }
      };
      useDemoStore.getState().addMessage(messageWithProvenance);
      render(<NegotiationTimeline />);
      
      const messageCard = screen.getByText(messageWithProvenance.content).closest('div[class*="cursor-pointer"]');
      if (messageCard) {
        fireEvent.click(messageCard);
      }
      
      expect(screen.getByText('Generation Provenance:')).toBeInTheDocument();
      expect(screen.getByText(/"source": "llm"/)).toBeInTheDocument();
    });

    it('should show fallback_reason in debug details for simulated messages', () => {
      const simulatedWithReason = {
        ...mockAgentMessageSimulated,
        generation_provenance: { source: 'simulated', fallback_reason: 'Rate limit exceeded' }
      };
      useDemoStore.getState().addMessage(simulatedWithReason);
      render(<NegotiationTimeline />);
      
      const messageCard = screen.getByText(simulatedWithReason.content).closest('div[class*="cursor-pointer"]');
      if (messageCard) {
        fireEvent.click(messageCard);
      }
      
      expect(screen.getByText('Generation Provenance:')).toBeInTheDocument();
      expect(screen.getByText(/"fallback_reason": "Rate limit exceeded"/)).toBeInTheDocument();
    });
  });

  describe('Summary Stats', () => {
    beforeEach(() => {
      mockAgentMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
    });

    it('should show total turns count', () => {
      render(<NegotiationTimeline />);
      expect(screen.getByText(`${mockAgentMessages.length}`)).toBeInTheDocument();
      expect(screen.getByText('Total Turns')).toBeInTheDocument();
    });

    it('should show buyer messages count', () => {
      render(<NegotiationTimeline />);
      const buyerCount = mockAgentMessages.filter(m => m.sender === 'procurement_agent').length;
      expect(screen.getByText(`${buyerCount}`)).toBeInTheDocument();
      expect(screen.getByText('Buyer Messages')).toBeInTheDocument();
    });

    it('should show vendor messages count', () => {
      render(<NegotiationTimeline />);
      const vendorCount = mockAgentMessages.filter(m => m.sender === 'recipient_agent').length;
      expect(screen.getByText(`${vendorCount}`)).toBeInTheDocument();
      expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
    });
  });

  describe('Scrollable Timeline', () => {
    beforeEach(() => {
      // Add many messages to test scrolling
      const manyMessages: AgentMessage[] = [];
      for (let i = 0; i < 20; i++) {
        manyMessages.push({
          ...mockAgentMessages[0],
          message_id: `msg-${i}`,
          content: `Message ${i}: This is a test message to verify scrolling behavior.`,
          timestamp: new Date(2024, 0, 15, 10, i).toISOString(),
        } as AgentMessage);
      }
      manyMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
    });

    it('should have a maximum height and be scrollable', () => {
      const { container } = render(<NegotiationTimeline />);
      const timelineContainer = container.querySelector('.max-h-\\[500px\\]');
      expect(timelineContainer).toBeInTheDocument();
      expect(timelineContainer?.className).toContain('overflow-y-auto');
    });
  });

  describe('Click-to-Inspect Debug Details', () => {
    beforeEach(() => {
      mockAgentMessages.forEach(msg => useDemoStore.getState().addMessage(msg));
    });

    it('should show debug icon for messages with prompt_used or input_context', () => {
      const { container } = render(<NegotiationTimeline />);
      // Messages with debug metadata should show a debug icon (SVG with yellow color)
      const debugIcons = container.querySelectorAll('.text-yellow-400');
      expect(debugIcons.length).toBeGreaterThan(0);
    });

    it('should expand debug details panel when clicking a message with debug metadata', () => {
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      expect(messageCard).toBeInTheDocument();
      
      if (messageCard) {
        fireEvent.click(messageCard);
      }

      expect(screen.getByText('Debug Details')).toBeInTheDocument();
      expect(screen.getByText('Prompt/Template Used:')).toBeInTheDocument();
      expect(screen.getByText('Input Context:')).toBeInTheDocument();
    });

    it('should display the prompt_used content in debug panel', () => {
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      
      if (messageCard) {
        fireEvent.click(messageCard);
      }

      expect(screen.getByText(mockAgentMessages[0].prompt_used || '')).toBeInTheDocument();
    });

    it('should display JSON-formatted input_context in debug panel', () => {
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      
      if (messageCard) {
        fireEvent.click(messageCard);
      }

      const preElement = screen.getByText((content, element) => {
        return element?.tagName === 'PRE' && content.includes('conversation_context');
      });
      expect(preElement).toBeInTheDocument();
    });

    it('should collapse debug details when clicking the same message again', () => {
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      
      if (messageCard) {
        fireEvent.click(messageCard);
        expect(screen.getByText('Debug Details')).toBeInTheDocument();
        
        fireEvent.click(messageCard);
        expect(screen.queryByText('Debug Details')).not.toBeInTheDocument();
      }
    });

    it('should collapse previous selection when clicking a different message', () => {
      render(<NegotiationTimeline />);
      
      // Click first message
      const firstMessage = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      if (firstMessage) {
        fireEvent.click(firstMessage);
      }
      expect(screen.getByText('Debug Details')).toBeInTheDocument();
      
      // Click second message
      const secondMessage = screen.getByText(mockAgentMessages[1].content).closest('div[class*="cursor-pointer"]');
      if (secondMessage) {
        fireEvent.click(secondMessage);
      }
      
      // First message debug should be gone, second should be visible
      expect(screen.queryByText(mockAgentMessages[0].prompt_used || '')).not.toBeInTheDocument();
      expect(screen.getByText(mockAgentMessages[1].prompt_used || '')).toBeInTheDocument();
    });

    it('should show Clear Selection button when a message is selected', () => {
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      
      if (messageCard) {
        fireEvent.click(messageCard);
      }

      expect(screen.getByText('Clear Selection')).toBeInTheDocument();
    });

    it('should clear selection when clicking Clear Selection button', () => {
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(mockAgentMessages[0].content).closest('div[class*="cursor-pointer"]');
      
      if (messageCard) {
        fireEvent.click(messageCard);
      }
      
      expect(screen.getByText('Debug Details')).toBeInTheDocument();
      
      const clearButton = screen.getByText('Clear Selection');
      fireEvent.click(clearButton);
      
      expect(screen.queryByText('Debug Details')).not.toBeInTheDocument();
    });

    it('should not show debug details for messages without debug metadata', () => {
      const uniqueContent = 'This message has no debug metadata at all.';
      const messageWithoutDebug = {
        ...mockAgentMessages[0],
        message_id: 'msg-no-debug',
        content: uniqueContent,
        prompt_used: undefined,
        input_context: undefined,
        generation_provenance: undefined, // Also clear provenance
      } as AgentMessage;
      useDemoStore.getState().addMessage(messageWithoutDebug);
      
      render(<NegotiationTimeline />);
      const messageCard = screen.getByText(uniqueContent).closest('div[class*="cursor-pointer"]');
      
      if (messageCard) {
        fireEvent.click(messageCard);
      }

      expect(screen.queryByText('Debug Details')).not.toBeInTheDocument();
    });
  });
});

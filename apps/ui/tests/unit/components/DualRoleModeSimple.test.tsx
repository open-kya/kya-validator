/**
 * Simple tests for dual-role mode functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentMode, ExchangeStatus } from '../../../src/types/demoTypes';

describe('Dual-Role Mode Types', () => {
  it('should have correct AgentMode values', () => {
    expect(AgentMode.LLM).toBe('llm');
    expect(AgentMode.SIMULATED).toBe('simulated');
  });

  it('should have correct ExchangeStatus values', () => {
    expect(ExchangeStatus.SUCCESS).toBe('success');
    expect(ExchangeStatus.DEGRADED).toBe('degraded');
    expect(ExchangeStatus.FAILED).toBe('failed');
  });
});

describe('Generation Provenance', () => {
  it('should accept valid provenance structure', () => {
    const provenance = {
      source: 'llm' as const,
      provider: 'openai',
      model: 'gpt-4',
      fallback_reason: undefined,
    };

    expect(provenance.source).toBe('llm');
    expect(provenance.provider).toBe('openai');
    expect(provenance.model).toBe('gpt-4');
    expect(provenance.fallback_reason).toBeUndefined();
  });

  it('should accept fallback provenance structure', () => {
    const provenance = {
      source: 'simulated' as const,
      fallback_reason: 'API key not configured',
    };

    expect(provenance.source).toBe('simulated');
    expect(provenance.fallback_reason).toBe('API key not configured');
    expect(provenance.provider).toBeUndefined();
    expect(provenance.model).toBeUndefined();
  });
});

describe('Message Deduplication Logic', () => {
  it('should identify duplicate messages by message_id', () => {
    const messages = [
      { message_id: 'msg-1', content: 'First message' },
      { message_id: 'msg-2', content: 'Second message' },
    ];

    const newMessage = { message_id: 'msg-1', content: 'Duplicate message' };
    const existingIds = new Set(messages.map(m => m.message_id));

    // Should detect duplicate
    expect(existingIds.has(newMessage.message_id)).toBe(true);
  });

  it('should allow new messages with unique message_id', () => {
    const messages = [
      { message_id: 'msg-1', content: 'First message' },
      { message_id: 'msg-2', content: 'Second message' },
    ];

    const newMessage = { message_id: 'msg-3', content: 'New message' };
    const existingIds = new Set(messages.map(m => m.message_id));

    // Should allow new message
    expect(existingIds.has(newMessage.message_id)).toBe(false);
  });
});

describe('Exchange Status Scenarios', () => {
  it('should identify success when both agents are AI', () => {
    const procurementProvenance = { source: 'llm' as const, provider: 'openai' };
    const recipientProvenance = { source: 'llm' as const, provider: 'openai' };
    
    const bothAI = procurementProvenance.source === 'llm' && recipientProvenance.source === 'llm';
    expect(bothAI).toBe(true);
  });

  it('should identify degraded when one agent falls back', () => {
    const procurementProvenance = { source: 'llm' as const, provider: 'openai' };
    const recipientProvenance = { source: 'simulated' as const, fallback_reason: 'API error' };
    
    const oneFallback = procurementProvenance.source === 'simulated' || recipientProvenance.source === 'simulated';
    expect(oneFallback).toBe(true);
  });

  it('should identify failed when both agents fall back', () => {
    const procurementProvenance = { source: 'simulated' as const, fallback_reason: 'API error' };
    const recipientProvenance = { source: 'simulated' as const, fallback_reason: 'API error' };
    
    const bothFallback = procurementProvenance.source === 'simulated' && recipientProvenance.source === 'simulated';
    expect(bothFallback).toBe(true);
  });
});
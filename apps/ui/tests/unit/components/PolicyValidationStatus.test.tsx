import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PolicyValidationStatus from '../../../src/components/demo/PolicyValidationStatus';
import { useDemoStore } from '../../../src/store/demoStore';
import { ValidationStatus } from '../../../src/types/demoTypes';
import {
  mockValidationContextValid,
  mockValidationContextInvalid,
  mockValidationContextPending,
} from '../../fixtures/demoFixtures';

const withValidationContext = (overrides: Partial<typeof mockValidationContextValid>) => ({
  ...mockValidationContextValid,
  ...overrides,
});

describe('PolicyValidationStatus', () => {
  beforeEach(() => {
    useDemoStore.getState().reset();
  });

  describe('Empty State', () => {
    it('should show empty state when no validation context', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('Policy Validation Status')).toBeInTheDocument();
      expect(screen.getByText('No validation data available. Start a session to see validation results.')).toBeInTheDocument();
    });
  });

  describe('Valid Status', () => {
    beforeEach(() => {
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
    });

    it('should render VALID status', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('VALID')).toBeInTheDocument();
    });

    it('should show green styling for valid status', () => {
      const { container } = render(<PolicyValidationStatus />);
      const statusBadge = container.querySelector('.text-green-400');
      expect(statusBadge).toHaveClass('text-green-400', 'bg-green-500/20');
    });

    it('should show checkmark icon for valid status', () => {
      render(<PolicyValidationStatus />);
      const svg = screen.getByText('VALID').previousElementSibling;
      expect(svg?.querySelector('path')).toBeInTheDocument();
    });

    it('should show manifest ID when present', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('Manifest ID')).toBeInTheDocument();
      expect(screen.getByText(mockValidationContextValid.manifest_id!)).toBeInTheDocument();
    });

    it('should show policy ID when present', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('Policy ID')).toBeInTheDocument();
      expect(screen.getByText(mockValidationContextValid.policy_id!)).toBeInTheDocument();
    });
  });

  describe('Invalid Status', () => {
    beforeEach(() => {
      useDemoStore.getState().setValidationContext(mockValidationContextInvalid);
    });

    it('should render INVALID status', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('INVALID')).toBeInTheDocument();
    });

    it('should show red styling for invalid status', () => {
      const { container } = render(<PolicyValidationStatus />);
      const statusBadge = container.querySelector('.text-red-400');
      expect(statusBadge).toHaveClass('text-red-400', 'bg-red-500/20');
    });

    it('should show validation errors', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('Validation Errors (2)')).toBeInTheDocument();
    });

    it('should display error codes and messages', () => {
      render(<PolicyValidationStatus />);
      mockValidationContextInvalid.validation_errors.forEach(error => {
        expect(screen.getByText(error.code)).toBeInTheDocument();
        const normalized = error.message.replace(/\.$/, '');
        expect(screen.getByText(new RegExp(normalized, 'i'))).toBeInTheDocument();
      });
    });
  });

  describe('Pending Status', () => {
    beforeEach(() => {
      useDemoStore.getState().setValidationContext(mockValidationContextPending);
    });

    it('should render PENDING status', () => {
      render(<PolicyValidationStatus />);
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should show yellow styling for pending status', () => {
      const { container } = render(<PolicyValidationStatus />);
      const statusBadge = container.querySelector('.text-yellow-400');
      expect(statusBadge).toHaveClass('text-yellow-400', 'bg-yellow-500/20');
    });
  });

  describe('MCP Validation', () => {
    it('should show Valid when mcp_validated is true', () => {
      useDemoStore.getState().setValidationContext(withValidationContext({
        validation_status: ValidationStatus.PENDING,
        mcp_validated: true,
      }));
      const { container } = render(<PolicyValidationStatus />);
      const mcpStatus = screen.getByText('MCP Validation').parentElement?.querySelector('.text-green-400');
      expect(mcpStatus?.textContent).toBe('Valid');
      expect(mcpStatus?.className).toContain('text-green-400');
    });

    it('should show Invalid when mcp_validated is false', () => {
      useDemoStore.getState().setValidationContext(withValidationContext({
        validation_status: ValidationStatus.PENDING,
        mcp_validated: false,
      }));
      render(<PolicyValidationStatus />);
      const mcpStatus = screen.getByText('MCP Validation').parentElement?.querySelector('.text-red-400');
      expect(mcpStatus?.textContent).toBe('Invalid');
      expect(mcpStatus?.className).toContain('text-red-400');
    });

    it('should show full green progress bar when validated', () => {
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
      const { container } = render(<PolicyValidationStatus />);
      const progressBar = container.querySelector('.bg-green-500[style*="width"]') as HTMLElement;
      expect(progressBar?.style.width).toBe('100%');
    });

    it('should show empty progress bar when not validated', () => {
      useDemoStore.getState().setValidationContext(mockValidationContextInvalid);
      const { container } = render(<PolicyValidationStatus />);
      const progressBar = container.querySelector('.bg-red-500[style*="width"]') as HTMLElement;
      expect(progressBar?.style.width).toBe('0%');
    });
  });

  describe('TEE Validation', () => {
    it('should show Valid when tee_validated is true', () => {
      useDemoStore.getState().setValidationContext(withValidationContext({
        validation_status: ValidationStatus.PENDING,
        tee_validated: true,
      }));
      render(<PolicyValidationStatus />);
      const teeStatus = screen.getByText('TEE Validation').parentElement?.querySelector('.text-green-400');
      expect(teeStatus?.textContent).toBe('Valid');
      expect(teeStatus?.className).toContain('text-green-400');
    });

    it('should show Invalid when tee_validated is false', () => {
      useDemoStore.getState().setValidationContext(withValidationContext({
        validation_status: ValidationStatus.PENDING,
        tee_validated: false,
      }));
      render(<PolicyValidationStatus />);
      const teeStatus = screen.getByText('TEE Validation').parentElement?.querySelector('.text-red-400');
      expect(teeStatus?.textContent).toBe('Invalid');
      expect(teeStatus?.className).toContain('text-red-400');
    });
  });

  describe('Blockchain Validation', () => {
    it('should show Valid when blockchain_validated is true', () => {
      useDemoStore.getState().setValidationContext(withValidationContext({
        validation_status: ValidationStatus.PENDING,
        blockchain_validated: true,
      }));
      render(<PolicyValidationStatus />);
      const blockchainStatus = screen
        .getByText('Blockchain Validation')
        .parentElement?.querySelector('.text-green-400');
      expect(blockchainStatus?.textContent).toBe('Valid');
      expect(blockchainStatus?.className).toContain('text-green-400');
    });

    it('should show Invalid when blockchain_validated is false', () => {
      useDemoStore.getState().setValidationContext(withValidationContext({
        validation_status: ValidationStatus.PENDING,
        blockchain_validated: false,
      }));
      render(<PolicyValidationStatus />);
      const blockchainStatus = screen
        .getByText('Blockchain Validation')
        .parentElement?.querySelector('.text-red-400');
      expect(blockchainStatus?.textContent).toBe('Invalid');
      expect(blockchainStatus?.className).toContain('text-red-400');
    });
  });
});

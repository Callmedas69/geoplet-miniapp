/**
 * PaymentModal Component (REFACTORED)
 *
 * Shows payment authorization dialog with status updates
 * Used during x402 payment flow
 *
 * REFACTOR IMPROVEMENTS:
 * - Added aria-live for status updates
 * - Added keyboard support (Escape key)
 * - Added role and aria-labelledby
 * - Improved screen reader announcements
 * - Better focus management
 */

'use client';

import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import type { PaymentStatus } from '@/hooks/usePayment';

interface PaymentModalProps {
  isOpen: boolean;
  status: PaymentStatus;
  amount: string;
  error: string | null;
  onCancel?: () => void;
}

export function PaymentModal({ isOpen, status, amount, error, onCancel }: PaymentModalProps) {
  // Reference for focus management
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard events (Escape key)
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && onCancel) {
        const content = getStatusContent();
        if (content.showCancel) {
          onCancel();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel, status]);

  // Focus cancel button when modal opens with error or awaiting signature
  useEffect(() => {
    if (isOpen && (status === 'error' || status === 'awaiting_signature')) {
      // Delay to ensure modal is rendered
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen, status]);
  const getStatusContent = () => {
    switch (status) {
      case 'fetching_terms':
        return {
          icon: <Loader2 className="w-12 h-12 animate-spin text-blue-500" />,
          title: 'Fetching Payment Terms',
          description: 'Getting payment details from server...',
          showCancel: true,
        };

      case 'awaiting_signature':
        return {
          icon: <Wallet className="w-12 h-12 text-purple-500 animate-pulse" />,
          title: 'Authorize Payment',
          description: `Please sign the transaction to authorize ${amount} USDC payment in your wallet.`,
          showCancel: true,
        };

      case 'processing':
        return {
          icon: <Loader2 className="w-12 h-12 animate-spin text-blue-500" />,
          title: 'Processing Payment',
          description: 'Generating payment authorization...',
          showCancel: false,
        };

      case 'verifying':
        return {
          icon: <Loader2 className="w-12 h-12 animate-spin text-blue-500" />,
          title: 'Verifying Payment',
          description: 'Verifying your payment on-chain...',
          showCancel: false,
        };

      case 'success':
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
          title: 'Payment Successful',
          description: 'Your payment has been verified!',
          showCancel: false,
        };

      case 'error':
        return {
          icon: <XCircle className="w-12 h-12 text-red-500" />,
          title: 'Payment Failed',
          description: error || 'An error occurred during payment',
          showCancel: true,
        };

      default:
        return {
          icon: <Loader2 className="w-12 h-12 animate-spin text-blue-500" />,
          title: 'Processing',
          description: 'Please wait...',
          showCancel: false,
        };
    }
  };

  const content = getStatusContent();

  // Get ARIA label based on status
  const getAriaLabel = () => {
    switch (status) {
      case 'fetching_terms':
        return 'Fetching payment terms, please wait';
      case 'awaiting_signature':
        return `Please authorize ${amount} USDC payment in your wallet`;
      case 'processing':
        return 'Processing payment authorization, please wait';
      case 'verifying':
        return 'Verifying payment on blockchain, please wait';
      case 'success':
        return 'Payment successful';
      case 'error':
        return `Payment failed: ${error}`;
      default:
        return 'Payment status modal';
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onCancel}
      aria-labelledby="payment-modal-title"
      aria-describedby="payment-modal-description"
    >
      <DialogContent className="sm:max-w-md" role="alertdialog">
        <DialogHeader>
          <DialogTitle
            id="payment-modal-title"
            className="text-center"
            aria-live="polite"
          >
            {content.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <div
            aria-hidden="true"
            className="flex items-center justify-center"
          >
            {content.icon}
          </div>

          <DialogDescription
            id="payment-modal-description"
            className="text-center text-base"
            aria-live="polite"
            aria-atomic="true"
          >
            {content.description}
          </DialogDescription>

          {status === 'awaiting_signature' && (
            <div
              className="w-full p-4 bg-muted rounded-lg"
              role="region"
              aria-label="Payment details"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Amount:</span>
                <span className="text-lg font-bold" aria-label={`${amount} USDC`}>
                  {amount} USDC
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This will authorize a one-time USDC payment to mint your Geoplet NFT.
              </p>
            </div>
          )}

          {status === 'error' && error && (
            <div
              className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {content.showCancel && onCancel && (
            <Button
              ref={cancelButtonRef}
              variant="outline"
              onClick={onCancel}
              className="w-full"
              aria-label="Cancel payment and close modal"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Hidden live region for screen reader announcements */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {getAriaLabel()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

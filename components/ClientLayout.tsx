"use client";

/**
 * ClientLayout Component
 *
 * Client-side wrapper for layout components that need state management
 * Handles wallet modal state for BottomNav
 */

import { useState } from "react";
import { BottomNav } from "./BottomNav";
import { WalletModal } from "./WalletModal";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);

  return (
    <>
      {children}
      <BottomNav onWalletClick={() => setShowWalletModal(true)} />
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
}

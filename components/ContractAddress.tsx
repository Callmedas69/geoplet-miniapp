"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ContractAddressProps {
  address: string;
  label?: string;
}

export function ContractAddress({ address, label }: ContractAddressProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      toast.success("Copied!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Truncate address for mobile: 0x1234...5678
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <li className="flex items-start gap-2">
      {label && (
        <strong className="text-sm md:text-base flex-shrink-0">{label}:</strong>
      )}
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded font-mono hover:bg-gray-50 transition-colors group min-h-[44px] touch-manipulation"
        aria-label={`Copy ${label || "address"}`}
      >
        {/* Show truncated on mobile, full on desktop */}
        <code className="text-xs md:text-sm">
          <span className="md:hidden">{truncatedAddress}</span>
          <span className="hidden md:inline">{address}</span>
        </code>
        {isCopied ? (
          <Check className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
        ) : (
          <Copy className="w-4 h-4 md:w-5 md:h-5 text-[#5c4a2f]/60 group-hover:text-[#5c4a2f] transition-colors flex-shrink-0" />
        )}
      </button>
    </li>
  );
}

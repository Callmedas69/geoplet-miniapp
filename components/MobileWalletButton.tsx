"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

export function MobileWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button
        onClick={() => disconnect()}
        variant="outline"
        size="sm"
        className="bg-black/10 border-black/20 text-black hover:bg-white/20 text-[10px] sm:text-sm font-mono italic"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      onClick={() => connect({ connector: connectors[0] })}
      size="sm"
      className="bg-black/10 text-black hover:bg-gray-100 text-[10px] sm:text-sm font-semibold"
    >
      Connect
    </Button>
  );
}

"use client";

import { useAccount, useReadContract } from "wagmi";
import { GEOPLET_CONFIG } from "@/lib/contracts";

/**
 * useAdminAuth Hook
 *
 * Verifies if the connected wallet is the contract owner.
 * Used to protect admin routes and functionality.
 *
 * @returns {Object} - { isOwner, isLoading, address, ownerAddress }
 */
export function useAdminAuth() {
  const { address, isConnected } = useAccount();

  // Read owner address from Geoplet contract
  const { data: ownerAddress, isLoading: isLoadingOwner } = useReadContract({
    address: GEOPLET_CONFIG.address as `0x${string}`,
    abi: GEOPLET_CONFIG.abi,
    functionName: "owner",
  });

  const isOwner =
    isConnected &&
    address &&
    ownerAddress &&
    address.toLowerCase() === (ownerAddress as string).toLowerCase();

  return {
    isOwner,
    isLoading: isLoadingOwner,
    address,
    ownerAddress: ownerAddress as string | undefined,
  };
}

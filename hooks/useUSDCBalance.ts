/**
 * useUSDCBalance Hook - Check USDC Balance on Base
 *
 * Checks user's USDC balance to ensure they have enough before payment.
 * Prevents failed transactions and provides better UX.
 */

'use client';

import { useReadContract, useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
const USDC_DECIMALS = 6;
const MINT_PRICE = '1.00';

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

export function useUSDCBalance() {
  const { address } = useAccount();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
  });

  // Format balance for display
  const balanceFormatted = balance ? formatUnits(balance, USDC_DECIMALS) : '0';

  // Check if user has enough USDC
  const requiredAmount = parseUnits(MINT_PRICE, USDC_DECIMALS);
  const hasEnoughUSDC = balance ? balance >= requiredAmount : false;

  return {
    balance: balanceFormatted,
    hasEnoughUSDC,
    isLoading,
    refetch,
    mintPrice: MINT_PRICE,
  };
}

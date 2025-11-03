import { http, createConfig } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';

export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [farcasterMiniApp()],
  transports: {
    [baseSepolia.id]: http(`https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
  },
  ssr: true,
});

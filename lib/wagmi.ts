import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

export const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http('https://mainnet.base.org'), // Base official RPC - eliminates cache mismatch with mobile wallets
  },
  ssr: true,
});

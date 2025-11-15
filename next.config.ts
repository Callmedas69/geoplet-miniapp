import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/alchemyapi/**',
      },
      {
        protocol: 'https',
        hostname: 'nft-cdn.alchemy.com',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.nftstorage.link',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'arweave.net',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.raribleuserdata.com',
      },
      {
        protocol: 'https',
        hostname: 'api.rarible.org',
      },
      {
        protocol: 'https',
        hostname: '**.imagedelivery.net',
      },
    ],
  },
};

export default nextConfig;

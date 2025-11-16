"use client";

import { useEffect, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { toast } from "sonner";
import { ContractAddress } from "@/components/ContractAddress";
import { openExternalUrl } from "@/lib/external-links";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import localFont from "next/font/local";

const spriteGraffiti = localFont({
  src: "../../public/font/SpriteGraffiti-Shadow.otf",
  display: "swap",
});

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();

        if (!inMiniApp) {
          console.log("[SDK] Not in mini app environment");
          toast.info(
            "⚠️ This app is designed for Farcaster. Some features may be limited.",
            { duration: 5000 }
          );
        }

        await sdk.actions.ready();
      } catch (error) {
        console.error("[SDK] Initialization failed:", error);
      }
    };

    initSdk();
  }, []);

  // GSAP animations
  useGSAP(
    () => {
      if (containerRef.current) {
        // Animate heading
        gsap.from("h1", {
          y: -30,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
        });

        // Stagger sections
        gsap.from("section", {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          delay: 0.3,
        });
      }
    },
    { scope: containerRef }
  );

  return (
    <div className="min-h-screen bg-[#f3daa1] p-4 md:p-8">
      <div ref={containerRef} className="max-w-3xl mx-auto">
        <h1
          className={`text-5xl md:text-6xl mb-6 md:mb-8 text-[#5c4a2f] ${spriteGraffiti.className}`}
        >
          About Geoplet
        </h1>

        {/* Philosophy */}
        <section className="mb-6 md:mb-8 bg-white/50 p-4 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#5c4a2f]">
            Algorithmic Identity
          </h2>
          <p className="mb-3 md:mb-4 text-sm md:text-base text-[#5c4a2f]">
            Your Warplet defines you. Your Geoplet reveals you.
          </p>
          <p className="mb-3 md:mb-4 text-sm md:text-base text-[#5c4a2f]">
            One transformation. One geometric truth. One chance to embrace it.
          </p>
          <p className="mb-0 text-sm md:text-base text-[#5c4a2f]">
            We don&apos;t believe in infinite retakes or pixel-perfect curation.
            The first generation is not random—it is the truest geometric
            expression of your Warplet, shaped by algorithmic destiny.
          </p>
        </section>

        {/* Features */}
        <section className="mb-6 md:mb-8 bg-white/50 p-4 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#5c4a2f]">
            Features
          </h2>
          <ul className="list-disc list-inside space-y-2 text-[#5c4a2f] text-sm md:text-base">
            <li>Turn your Warplet into Bauhaus/Suprematist geometric art</li>
            <li>
              <strong>Mint</strong> your piece as an NFT on Base
            </li>
            <li>
              <strong>Farcaster Miniapp</strong> with one-click sharing
            </li>
            <li>
              <strong>1:1 Identity</strong> — FID = Warplet ID = Geoplet ID
            </li>
            <li>
              <strong>Gallery</strong> of all minted Geoplets
            </li>
            <li>
              <strong>Upgradable</strong> collection
            </li>
            <li>
              <strong>X402 Payments</strong> via{" "}
              <button
                onClick={() => openExternalUrl("https://onchain.fi/", "onchain.fi")}
                className="text-[#5c4a2f] underline hover:text-[#3d2f1f] transition-colors"
              >
                onchain.fi
              </button>{" "}
              (x402 aggregator)
            </li>
            <li>
              <strong>Fully Onchain</strong> art & metadata
            </li>
            <li>
              <strong>Rarity Engine</strong> based on geometric complexity
            </li>
          </ul>
        </section>

        {/* Contract Addresses */}
        <section className="mb-6 md:mb-8 bg-white/50 p-4 md:p-6 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#5c4a2f]">
            Contract Addresses (Base Mainnet)
          </h2>
          <ul className="list-none space-y-2 text-[#5c4a2f] text-sm">
            <ContractAddress address="0x999aC3B6571fEfb770EA3A836E82Cc45Cd1e653F" />
          </ul>
        </section>
      </div>
    </div>
  );
}

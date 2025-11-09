import { Badge } from "@/components/ui/badge";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Image from "next/image";

/**
 * BadgeSection Component
 *
 * Displays trust signals and feature badges:
 * - $GEOPLET token
 * - ONCHAIN.FI integration
 * - x402 payment support
 * - Fully on-chain badge
 *
 * Positioned below WarpletDisplay for contextual trust before CTA
 */
export function BadgeSection() {
  const badgeContainerRef = useRef<HTMLDivElement>(null);

  // Badge stagger animation on mount
  useGSAP(
    () => {
      if (badgeContainerRef.current) {
        gsap.from(".badge-item", {
          opacity: 0,
          y: 10,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        });
      }
    },
    { scope: badgeContainerRef }
  );

  return (
    <div className="text-center px-4">
      <div
        ref={badgeContainerRef}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <Badge variant="outline" className="badge-item text-xs font-medium">
          ⚡ $GEOPLET
        </Badge>
        <Badge
          variant="outline"
          className="badge-item text-xs font-medium flex items-center gap-1"
        >
          <Image
            src="/onchain_icon.svg"
            alt="Onchain.fi"
            width={14}
            height={14}
            className="inline-block"
          />
          ONCHAIN.FI
        </Badge>
        <Image
          src="/x402-button-large.webp"
          alt="x402 Payments enabled"
          width={120}
          height={30}
          className="badge-item"
        />
        <Badge
          variant="outline"
          className="badge-item text-xs font-medium border-blue-600 text-blue-700"
        >
          ✨ Fully On-Chain
        </Badge>
      </div>
    </div>
  );
}

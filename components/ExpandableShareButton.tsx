"use client";

/**
 * ExpandableShareButton Component
 *
 * Expandable button that reveals social share options
 * - Closed: Single share icon with infinite pulse animation
 * - Expanded: Reveals Farcaster + X share buttons
 * - GSAP animations for smooth transitions
 */

import { useState, useRef, useEffect } from "react";
import { Share2, Loader2 } from "lucide-react";
import { gsap } from "gsap";

interface ExpandableShareButtonProps {
  onShareFarcaster: () => void | Promise<void>;
  onShareX: () => void;
  disabled?: boolean;
}

export function ExpandableShareButton({
  onShareFarcaster,
  onShareX,
  disabled = false,
}: ExpandableShareButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const shareIconRef = useRef<HTMLButtonElement>(null);
  const farcasterRef = useRef<HTMLButtonElement>(null);
  const xRef = useRef<HTMLButtonElement>(null);

  // Infinite pulse animation for closed state
  useEffect(() => {
    if (!shareIconRef.current || isExpanded) return;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 5 });

    tl.to(shareIconRef.current, {
      scale: 1.15,
      duration: 0.4,
      ease: "power2.inOut",
    }).to(shareIconRef.current, {
      scale: 1,
      duration: 0.4,
      ease: "power2.inOut",
    });

    return () => {
      tl.kill();
    };
  }, [isExpanded]);

  // Expand/collapse animation
  useEffect(() => {
    if (!farcasterRef.current || !xRef.current) return;

    if (isExpanded) {
      // Expand animation - fade and slide in
      const tl = gsap.timeline();

      // First show Farcaster
      tl.fromTo(
        farcasterRef.current,
        { opacity: 0, x: -10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.25,
          ease: "power2.out",
        }
      );

      // Then show X button (positioned after Farcaster)
      tl.fromTo(
        xRef.current,
        { opacity: 0, x: -10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.25,
          ease: "power2.out",
        },
        "-=0.1"
      );
    } else {
      // Collapse animation - fade out
      gsap.to([farcasterRef.current, xRef.current], {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
      });
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const handleToggle = () => {
    if (!disabled && !isSharing) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleFarcasterClick = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);
      await onShareFarcaster();
      setIsExpanded(false);
    } finally {
      setIsSharing(false);
    }
  };

  const handleXClick = () => {
    onShareX();
    setIsExpanded(false);
  };

  return (
    <div
      ref={buttonRef}
      className="flex items-center gap-1"
      style={{ width: "160px" }}
    >
      {/* Main share button */}
      <button
        ref={shareIconRef}
        onClick={handleToggle}
        disabled={disabled || isSharing}
        className="text-xs text-black px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Share options"
      >
        {isSharing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Share2 className="w-5 h-5" />
        )}
      </button>

      {/* Expanded buttons */}
      {isExpanded && (
        <>
          <button
            ref={farcasterRef}
            onClick={handleFarcasterClick}
            disabled={isSharing}
            className="whitespace-nowrap text-xs text-black px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            style={{ opacity: 0 }}
            aria-label="Share to Farcaster"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 1000 1000"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"
                fill="currentColor"
              />
              <path
                d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"
                fill="currentColor"
              />
              <path
                d="M871.111 253.333L842.222 351.111H817.778V746.667C830.051 746.667 840 756.616 840 768.889V795.556H844.444C856.717 795.556 866.667 805.505 866.667 817.778V844.445H617.778V817.778C617.778 805.505 627.727 795.556 640 795.556H644.444V768.889C644.444 756.616 654.394 746.667 666.667 746.667H693.333V253.333H871.111Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <button
            ref={xRef}
            onClick={handleXClick}
            disabled={isSharing}
            className="whitespace-nowrap text-xs text-black px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            style={{ opacity: 0 }}
            aria-label="Share on X"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 1200 1227"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

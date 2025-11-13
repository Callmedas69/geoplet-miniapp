"use client";

/**
 * RotatingText Component
 *
 * Displays rotating messages during long operations
 * - Auto-rotates through messages array
 * - Configurable interval (default: 2 seconds)
 * - Smooth GSAP fade transition between messages
 */

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

interface RotatingTextProps {
  messages: string[];
  interval?: number; // milliseconds between rotations (default: 2000)
  className?: string;
}

export function RotatingText({
  messages,
  interval = 2000,
  className = "",
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (messages.length <= 1) return;

    const rotateInterval = setInterval(() => {
      if (!textRef.current) return;

      // Slide up and fade out
      gsap.to(textRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: () => {
          // Change text
          setCurrentIndex((prev) => (prev + 1) % messages.length);

          // Wait for React render + browser paint, then slide down and fade in
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (!textRef.current) return;

              gsap.fromTo(
                textRef.current,
                { opacity: 0, y: 20 },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.3,
                  ease: "power2.out",
                }
              );
            }, 100);
          });
        },
      });
    }, interval);

    return () => clearInterval(rotateInterval);
  }, [messages, interval]);

  return (
    <div className="overflow-hidden">
      <p ref={textRef} className={`inline-block ${className}`}>
        {messages[currentIndex]}
      </p>
    </div>
  );
}

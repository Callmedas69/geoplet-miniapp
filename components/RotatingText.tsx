"use client";

/**
 * RotatingText Component
 *
 * Displays rotating messages during long operations
 * - Auto-rotates through messages array
 * - Configurable interval (default: 2 seconds)
 * - Smooth fade transition between messages
 */

import { useState, useEffect } from "react";

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
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (messages.length <= 1) return;

    const rotateInterval = setInterval(() => {
      // Fade out
      setIsVisible(false);

      // After fade out, change text and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 300); // Match this with CSS transition duration
    }, interval);

    return () => clearInterval(rotateInterval);
  }, [messages.length, interval]);

  return (
    <p
      className={`transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {messages[currentIndex]}
    </p>
  );
}

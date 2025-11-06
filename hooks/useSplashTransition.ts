"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

/**
 * useSplashTransition Hook
 *
 * Handles smooth GSAP-powered transition from splash screen to main content
 * - Splash fades out (300ms, power2.inOut)
 * - Main content fades in (300ms, power2.inOut)
 * - Total duration: 600ms (UX standard for page transitions)
 *
 * @param isLoading - When false, triggers fade-out/fade-in sequence
 */
export function useSplashTransition(isLoading: boolean) {
  useEffect(() => {
    if (!isLoading) {
      // Create GSAP timeline for smooth transition
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
      });

      // Sequence: Splash fade-out → Main fade-in with stagger
      tl.to("#splash-screen", { opacity: 0, duration: 0.3 })
        .to("#main-content", { opacity: 1, duration: 0.3 }, "-=0.1")
        .from("#top-section", { opacity: 0, y: -10, duration: 0.2 }, "-=0.2")
        .from("#hero-section", { opacity: 0, y: 10, duration: 0.3 }, "-=0.15");

      // Cleanup on unmount
      return () => {
        tl.kill();
      };
    }
  }, [isLoading]);
}

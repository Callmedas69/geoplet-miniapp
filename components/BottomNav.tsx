"use client";

/**
 * BottomNav Component
 *
 * Fixed bottom navigation bar with Home, Gallery, About, and Wallet icons
 * - Modern, minimal design with balanced spacing
 * - Mobile-optimized touch targets (52x52px with 28px icons)
 * - Subtle active state indicator (dot below icon)
 * - Clean visual hierarchy without text labels
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Info, Wallet } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface BottomNavProps {
  onWalletClick?: () => void;
}

export function BottomNav({ onWalletClick }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      isActive: pathname === "/",
      type: "link" as const,
    },
    {
      href: "/gallery",
      icon: LayoutGrid,
      label: "Gallery",
      isActive: pathname === "/gallery",
      type: "link" as const,
    },
    {
      href: "/about",
      icon: Info,
      label: "About",
      isActive: pathname === "/about",
      type: "link" as const,
    },
    {
      icon: Wallet,
      label: "Wallet",
      isActive: false, // Wallet is modal action, not a page
      type: "button" as const,
      onClick: onWalletClick,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 pb-safe z-50"
      aria-label="Main navigation"
    >
      <div className="flex justify-center items-center h-14 gap-16">
        {navItems.map((item, index) => {
          const content = (
            <>
              <item.icon
                className="w-5 h-5"
                strokeWidth={2}
                aria-hidden="true"
              />
              {item.isActive && (
                <div
                  className="w-1 h-1 rounded-full bg-black mt-1.5"
                  aria-hidden="true"
                />
              )}
              <span className="sr-only">{item.label}</span>
            </>
          );

          const className = `
            flex flex-col items-center justify-center
            min-w-[52px] min-h-[52px] px-3
            rounded-xl
            active:scale-95 active:bg-black/5
            transition-all duration-150
            ${item.isActive ? "text-black" : "text-black/40"}
          `;

          if (item.type === "link") {
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={className}
                onClick={() => haptics.tap()}
                aria-label={item.label}
                aria-current={item.isActive ? "page" : undefined}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={`button-${index}`}
              onClick={() => {
                haptics.tap();
                item.onClick?.();
              }}
              className={className}
              aria-label={item.label}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

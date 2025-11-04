"use client";

/**
 * BottomNav Component
 *
 * Fixed bottom navigation bar with Home and Gallery icons
 * - Modern, minimal design with balanced spacing
 * - Mobile-optimized touch targets (52x52px with 28px icons)
 * - Subtle active state indicator (dot below icon)
 * - Clean visual hierarchy without text labels
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      isActive: pathname === "/",
    },
    {
      href: "/gallery",
      icon: LayoutGrid,
      label: "Gallery",
      isActive: pathname === "/gallery",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 pb-safe z-50"
      aria-label="Main navigation"
    >
      <div className="flex justify-center items-center h-14 gap-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center
              min-w-[52px] min-h-[52px] px-3
              rounded-xl
              active:scale-95 active:bg-black/5
              transition-all duration-150
              ${item.isActive ? "text-black" : "text-black/40"}
            `}
            aria-label={item.label}
            aria-current={item.isActive ? "page" : undefined}
          >
            <item.icon
              className="w-5 h-5"
              strokeWidth={item.isActive ? 2 : 2}
              aria-hidden="true"
            />
            {item.isActive && (
              <div
                className="w-1 h-1 rounded-full bg-black mt-1.5"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

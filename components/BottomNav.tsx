"use client";

/**
 * BottomNav Component
 *
 * Fixed bottom navigation bar with Home and Gallery icons
 * - Global navigation (appears on all pages)
 * - Mobile-safe area support
 * - Touch-friendly tap targets (44x44px minimum)
 * - Active state detection via usePathname()
 * - Icons only (🏠 Home, 🖼️ Gallery)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      icon: "🏠",
      label: "Home",
      isActive: pathname === "/",
    },
    {
      href: "/gallery",
      icon: "🖼️",
      label: "Gallery",
      isActive: pathname === "/gallery",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 pb-safe z-50"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center
              min-w-[44px] min-h-[44px] px-4
              transition-colors duration-200
              ${
                item.isActive
                  ? "text-black"
                  : "text-black/40 hover:text-black/70"
              }
            `}
            aria-label={item.label}
            aria-current={item.isActive ? "page" : undefined}
          >
            <span className="text-2xl" aria-hidden="true">
              {item.icon}
            </span>
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

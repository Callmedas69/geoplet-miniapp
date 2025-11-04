/**
 * Footer Component
 *
 * Global footer with credits and links
 * - Appears on all pages via layout
 * - Mobile-safe bottom padding for bottom nav
 */

export function Footer() {
  return (
    <footer className="mt-4 mb-safe text-center text-gray-500 text-[8px] sm:text-sm py-4 italic pb-20">
      <p>
        Powered by $GEOPLET • Build by GeoArt.Studio •{" "}
        <a
          href="https://onchain.fi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-black"
        >
          Onchain.fi x402
        </a>
      </p>
    </footer>
  );
}

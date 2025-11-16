/**
 * Rarity Utility
 *
 * Handles rarity level extraction and color mapping for NFT badges
 */

export type RarityLevel =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary";

/**
 * Get Tailwind color classes for rarity level
 * Uses standard gaming color scheme
 */
export function getRarityColor(rarity: string): string {
  const level = rarity.toLowerCase();

  switch (level) {
    case "legendary":
      return "bg-amber-500 text-white hover:bg-amber-600"; // Gold
    case "epic":
      return "bg-purple-500 text-white hover:bg-purple-600"; // Purple
    case "rare":
      return "bg-blue-500 text-white hover:bg-blue-600"; // Blue
    case "uncommon":
      return "bg-green-500 text-white hover:bg-green-600"; // Green
    case "common":
    default:
      return "bg-gray-500 text-white hover:bg-gray-600"; // Gray
  }
}

/**
 * Extract rarity value from NFT attributes
 * Returns null if no rarity attribute found
 */
export function getRarityFromAttributes(
  attributes?: Array<{ key: string; value: string }>
): string | null {
  if (!attributes || attributes.length === 0) return null;

  const rarityAttr = attributes.find(
    (attr) => attr.key.toLowerCase() === "rarity"
  );

  return rarityAttr?.value || null;
}

import Image from "next/image";

interface WarpletDisplayProps {
  imageUrl: string;
  tokenId: string;
  generatedImage?: string | null;
  isMinted?: boolean;
  alt?: string;
}

export function WarpletDisplay({
  imageUrl,
  tokenId,
  generatedImage,
  isMinted = false,
  alt = "Warplet NFT",
}: WarpletDisplayProps) {
  // Add data URI prefix if generatedImage is raw base64 (KISS: display layer transformation)
  const formattedGenerated =
    generatedImage && !generatedImage.startsWith("data:")
      ? `data:image/webp;base64,${generatedImage}`
      : generatedImage;

  const displayImage = formattedGenerated || imageUrl;

  return (
    <div className="relative aspect-square rounded-lg">
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src={displayImage}
          alt={alt}
          fill
          className="object-contain rounded-lg"
          priority
        />

        {/* Placeholder text if no image */}
        {!displayImage && (
          <span className="text-gray-400 text-xs">your geoplet here</span>
        )}

        {/* Generated/Minted indicator */}
        {generatedImage && (
          <div
            className={`absolute top-2 left-2 px-2 py-1 rounded text-xs text-white font-medium ${
              isMinted ? "bg-purple-600/90" : "bg-green-500/90"
            }`}
          >
            {isMinted ? "Minted" : "Generated"}
          </div>
        )}
      </div>
    </div>
  );
}

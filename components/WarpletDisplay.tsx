import Image from "next/image";

interface WarpletDisplayProps {
  imageUrl: string;
  tokenId: string;
  generatedImage?: string | null;
  alt?: string;
}

export function WarpletDisplay({
  imageUrl,
  tokenId,
  generatedImage,
  alt = "Warplet NFT",
}: WarpletDisplayProps) {
  const displayImage = generatedImage || imageUrl;

  return (
    <div className="relative aspect-square border-2 rounded-lg drop-shadow-lg">
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <Image
          src={displayImage}
          alt={alt}
          fill
          className="object-contain"
          priority
        />

        {/* Placeholder text if no image */}
        {!displayImage && (
          <span className="text-gray-400 text-xs">thumbnail here</span>
        )}

        {/* Generated indicator */}
        {generatedImage && (
          <div className="absolute top-2 left-2 bg-green-500/90 px-2 py-1 rounded text-xs text-white font-medium">
            ✨ Generated
          </div>
        )}
      </div>
    </div>
  );
}

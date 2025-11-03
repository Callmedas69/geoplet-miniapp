export function ProjectDescription() {
  return (
    <div className="flex flex-col justify-center space-y-4 text-sm">
      {/* Main Description */}
      <p className="text-white leading-relaxed">
        When Geometric Art meets Warplet — a fusion of form and frequency.
        <br />
        Powered by $GEOPLET, integrated with onchain.fi (x402 Aggregator).
        <br />
        Produced by GeoArt.Studio — where creativity lives fully on-chain.
      </p>

      {/* Stats */}
      <div className="space-y-1 text-white">
        <p>
          <span className="font-semibold">total geofying :</span>{' '}
          <span className="text-gray-300">[count]</span>
        </p>
        <p>
          <span className="font-semibold">onchain status :</span>{' '}
          <span className="text-green-400">fully onchain</span>
        </p>
      </div>
    </div>
  );
}

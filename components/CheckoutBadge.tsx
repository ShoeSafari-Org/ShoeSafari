import { NETWORK } from "../lib/stellar/config";

export default function CheckoutBadge({ asset }: { asset: string }) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 text-sm"
      aria-label={`Checkout network ${NETWORK}, payment asset ${asset}`}
    >
      <span className="rounded-full bg-gray-900 px-3 py-1 font-semibold text-white">
        Stellar {NETWORK}
      </span>
      <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-800">
        {asset}
      </span>
    </div>
  );
}

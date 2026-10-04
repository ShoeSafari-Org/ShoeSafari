import { FaBolt, FaShieldAlt, FaGlobe, FaWallet, FaReceipt, FaHeadset } from "react-icons/fa";

const features = [
  {
    icon: FaBolt,
    title: "Instant Settlement",
    description: "Payments confirm in 3-5 seconds on Stellar. No waiting days for bank transfers.",
  },
  {
    icon: FaShieldAlt,
    title: "Secure & Trustless",
    description:
      "Smart contracts handle escrow. Your funds are protected until delivery confirmation.",
  },
  {
    icon: FaGlobe,
    title: "Global Access",
    description: "Pay from anywhere in the world with USDC. No currency conversion fees.",
  },
  {
    icon: FaWallet,
    title: "Your Keys, Your Coins",
    description: "Connect your Freighter wallet. We never hold your crypto — you stay in control.",
  },
  {
    icon: FaReceipt,
    title: "On-Chain Receipts",
    description: "Every transaction is recorded on the Stellar ledger. Verify anytime, anywhere.",
  },
  {
    icon: FaHeadset,
    title: "Human Support",
    description: "Real people answer your questions. Crypto payments, traditional service.",
  },
];

export default function Features() {
  return (
    <section className="bg-gray-900 py-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm uppercase tracking-widest text-red-400 font-semibold mb-3">
            Real commerce on Stellar
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            More than $10,000 USDC in product sales
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Customers use Stellar USDC to pay for real footwear orders at ShoeSafari. Fast
            settlement and on-chain records make each payment straightforward to verify.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-red-500/50 transition-colors"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/20 text-red-400 mb-4">
                <feature.icon size={24} />
              </span>
              <h3 className="font-semibold text-white text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

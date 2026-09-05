import { SiStellar } from "react-icons/si";
import Link from "next/link";

const steps = [
  {
    title: "Connect your Stellar wallet",
    text: "Grant ShoeSafari read access via Freighter in one click — no sign-up, no KYC.",
  },
  {
    title: "Choose USDC at checkout",
    text: "Your order total is shown in USDC automatically, at the current rate.",
  },
  {
    title: "Approve the payment",
    text: "Sign a single transaction from your wallet. That's all it takes.",
  },
  {
    title: "Get an on-chain receipt",
    text: "The smart contract moves the exact amount to our merchant wallet and records a payment event on the Stellar ledger.",
  },
];

const Stellar = () => {
  return (
    <section id="stellar" className="bg-gradient-to-r from-red-900 via-red-700 to-red-600 py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
        <div className="md:w-1/2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-5 text-sm font-medium text-white">
            <SiStellar size={16} />
            Crypto checkout, built in
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            The payment rail for open commerce
          </h2>
          <p className="text-white/90 text-lg leading-relaxed mb-8">
            Pay for your order in USDC on Stellar with a familiar checkout and
            your own wallet. ShoeSafari demonstrates the complete integration:
            wallet signing, pre-flight simulation, Soroban escrow, on-chain
            receipts, merchant dispatch, and refunds.
          </p>
          <ul className="space-y-4 text-white/90 mb-8 text-left">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-white flex-shrink-0" />
              <span>
                <strong className="text-white">Fast settlement</strong> —
                payments confirm in seconds, so commerce does not have to wait for
                traditional banking rails.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-white flex-shrink-0" />
              <span>
                <strong className="text-white">Low-cost payments</strong> —
                Stellar keeps transaction costs tiny and predictable.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-white flex-shrink-0" />
              <span>
                <strong className="text-white">Escrow with proof</strong> —
                Soroban holds the payment until dispatch or returns it through an
                on-chain refund.
              </span>
            </li>
          </ul>
          <Link
            href="/shop"
            className="inline-block bg-white text-red-700 font-semibold px-6 py-3 rounded-md hover:bg-white/90"
          >
            Try the testnet checkout
          </Link>
        </div>

        <div className="md:w-1/2 w-full bg-white rounded-xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            How it works
          </h3>
          <ol className="space-y-6">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="h-8 w-8 flex-shrink-0 rounded-full bg-red-700 text-white flex items-center justify-center font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default Stellar;

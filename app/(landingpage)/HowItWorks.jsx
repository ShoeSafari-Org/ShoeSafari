"use client";
import { FaWallet, FaShoppingCart, FaCheck, FaTruck } from "react-icons/fa";

const steps = [
  {
    icon: FaWallet,
    step: "01",
    title: "Connect Your Wallet",
    description:
      "Install Freighter browser extension and connect to ShoeSafari. No account creation needed — your wallet is your identity.",
  },
  {
    icon: FaShoppingCart,
    step: "02",
    title: "Shop & Add to Cart",
    description:
      "Browse our curated collection of quality footwear. Add your favorites to cart just like any online store.",
  },
  {
    icon: FaCheck,
    step: "03",
    title: "Pay with USDC",
    description:
      "At checkout, approve the transaction in Freighter. Payment settles in seconds with a fraction-of-a-cent fee.",
  },
  {
    icon: FaTruck,
    step: "04",
    title: "Track & Receive",
    description:
      "After the Stellar transaction confirms, ShoeSafari can process your order for fulfillment.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm uppercase tracking-widest text-red-700 font-semibold mb-3">
            Getting started
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How to shop with crypto
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Shop real products and pay securely with USDC from your Stellar wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gray-200" />
              )}

              <div className="relative bg-gray-50 rounded-xl p-6 border border-gray-100 hover:border-red-200 hover:shadow-md transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white">
                    <step.icon size={24} />
                  </span>
                  <span className="text-4xl font-bold text-gray-200">{step.step}</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">Don't have a Stellar wallet yet?</p>
          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Get Freighter Wallet
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

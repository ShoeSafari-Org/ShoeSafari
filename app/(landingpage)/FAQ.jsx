"use client";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

const faqs = [
  {
    question: "What is Stellar and USDC?",
    answer: "Stellar is a fast, low-cost blockchain network designed for payments. USDC is a stablecoin pegged to the US dollar — 1 USDC always equals $1. When you pay with USDC on Stellar, you get the speed of crypto with the stability of dollars.",
  },
  {
    question: "Do I need cryptocurrency experience?",
    answer: "Not at all! If you can install a browser extension and click 'approve,' you can pay with Stellar. Our checkout guides you through every step, and the Freighter wallet is designed to be beginner-friendly.",
  },
  {
    question: "How do I get USDC for my wallet?",
    answer: "For the testnet demo, use a Stellar testnet account and testnet USDC from an appropriate faucet or funding flow. Testnet assets have no real-world value.",
  },
  {
    question: "Is my payment secure?",
    answer: "Payments are processed through a Soroban contract that records the order and holds funds in escrow until the merchant dispatches or refunds the order. Always verify the contract and network before signing.",
  },
  {
    question: "What if I want a refund?",
    answer: "The merchant can call the contract refund flow while funds remain escrowed. The current reference implementation does not claim automatic post-delivery returns.",
  },
  {
    question: "Can I still pay with a credit card?",
    answer: "The storefront includes a traditional checkout interface as well as the Stellar option. Card processing is not connected to a live payment processor in this reference implementation.",
  },
  {
    question: "What are the fees for Stellar payments?",
    answer: "Stellar network fees are designed to be very small, but the exact fee depends on the network and transaction. The checkout simulates the transaction and displays an estimated resource fee before signing.",
  },
  {
    question: "Is ShoeSafari open source?",
    answer: "Yes! ShoeSafari is fully open source. Developers can fork our code to add Stellar payments to their own stores. Check out our GitHub repository to see how it's built.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-white py-20 px-4 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm uppercase tracking-widest text-red-700 font-semibold mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-gray-600">
            Honest answers about the ShoeSafari demo and Stellar checkout.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium text-gray-900 pr-4">
                  {faq.question}
                </span>
                <FaChevronDown
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <p className="px-5 pb-5 text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center p-6 bg-gray-50 rounded-xl">
          <p className="text-gray-700 mb-3">
            Still have questions?
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold"
          >
            Contact our team
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";

const values = [
  {
    title: "Quality First",
    description: "Every pair is crafted with premium materials and attention to detail",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Innovation",
    description: "Pioneering crypto payments with Stellar blockchain technology",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Transparency",
    description: "Open source code, transparent pricing, no hidden fees",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: "Community",
    description: "Built by developers, for the Stellar ecosystem and beyond",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function AboutUs() {
  return (
    <section id="aboutus" className="bg-white py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Main Story Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          {/* Left - Image */}
          <div className="relative">
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80"
                alt="ShoeSafari Store"
                width={600}
                height={500}
                className="object-cover w-full h-[500px]"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-red-100 rounded-3xl -z-10" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-gray-900 rounded-2xl -z-10" />
          </div>

          {/* Right - Content */}
          <div>
            <span className="inline-block px-4 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full mb-6">
              Our Story
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              A storefront built to open the door for builders
            </h2>
            <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
              <p>
                ShoeSafari started with a simple question: <em>Why can&apos;t buying shoes be as fast and borderless as sending a text?</em>
              </p>
              <p>
                We set out to build an e-commerce experience that combines premium footwear with the future of payments. Using Stellar&apos;s blockchain, every purchase settles in seconds with fees under a penny.
              </p>
              <p>
                More than a store, ShoeSafari is a working reference implementation.
                Developers and merchants can inspect the checkout, learn from the
                Soroban contract, and adapt the pattern for their own businesses.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 transition-colors"
              >
                Shop Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="https://github.com/ShoeSafari-Hub/ShoeSafari"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
              >
                <FaGithub size={18} />
                View Source
              </a>
            </div>
          </div>
        </div>

        {/* Values Grid */}
        <div className="bg-gray-50 rounded-3xl p-10 md:p-14">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">What We Stand For</h3>
            <p className="text-gray-600 max-w-xl mx-auto">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 text-red-600 rounded-2xl mb-4">
                  {value.icon}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h4>
                <p className="text-gray-500 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Open Source Banner */}
        <div className="mt-16 bg-gray-900 rounded-3xl p-10 md:p-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <FaGithub />
            Open Source Project
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Build the next checkout with us
          </h3>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            ShoeSafari is MIT-licensed and built for contribution. Try the testnet
            flow, open an issue, improve the integration, or adapt it for another
            storefront.
          </p>
          <a
            href="https://github.com/ShoeSafari-Hub/ShoeSafari"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            <FaGithub size={20} />
            Explore on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

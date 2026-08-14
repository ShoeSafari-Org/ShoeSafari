import Image from "next/image";

const products = [
  {
    name: "Aero Runner",
    price: 89,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
  },
  {
    name: "City Stride",
    price: 95,
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80",
  },
  {
    name: "Court Classic",
    price: 75,
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80",
  },
  {
    name: "Cloudknit Ultra",
    price: 110,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80",
  },
  {
    name: "Velocity X",
    price: 135,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80",
  },
  {
    name: "Trailhead Pro",
    price: 120,
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80",
  },
  {
    name: "Urban Flow",
    price: 85,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80",
  },
  {
    name: "Summit Hiker",
    price: 145,
    image: "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=500&q=80",
  },
];

const MarqueeRow = ({ items, direction = "left", speed = 30 }) => {
  const duplicatedItems = [...items, ...items];

  return (
    <div className="relative flex overflow-hidden group">
      <div
        className={`flex gap-6 py-4 ${
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        }`}
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {duplicatedItems.map((product, index) => (
          <div
            key={index}
            className="relative flex-shrink-0 w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 group/card cursor-pointer"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 256px, 288px"
              className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
            {/* Product Info */}
            <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover/card:translate-y-0 transition-transform duration-300">
              <h4 className="text-white font-bold text-lg">{product.name}</h4>
              <p className="text-white/90 font-semibold">${product.price}</p>
            </div>
            {/* Quick View Button */}
            <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>
      {/* Duplicate for seamless loop */}
      <div
        className={`flex gap-6 py-4 ${
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        }`}
        style={{
          animationDuration: `${speed}s`,
        }}
        aria-hidden="true"
      >
        {duplicatedItems.map((product, index) => (
          <div
            key={`dup-${index}`}
            className="relative flex-shrink-0 w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 group/card cursor-pointer"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 256px, 288px"
              className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover/card:translate-y-0 transition-transform duration-300">
              <h4 className="text-white font-bold text-lg">{product.name}</h4>
              <p className="text-white/90 font-semibold">${product.price}</p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Slider = () => {
  const firstHalf = products.slice(0, 4);
  const secondHalf = products.slice(4);

  return (
    <section className="py-20 overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="text-center mb-12 px-6">
        <span className="inline-block px-4 py-1.5 bg-red-600/20 text-red-400 text-sm font-semibold rounded-full mb-4">
          Trending Now
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          What Everyone&apos;s Wearing
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          The hottest styles flying off our shelves — grab yours before they&apos;re gone
        </p>
      </div>

      {/* Marquee Rows */}
      <div className="space-y-6">
        <MarqueeRow items={firstHalf} direction="left" speed={35} />
        <MarqueeRow items={secondHalf} direction="right" speed={40} />
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-12 px-6">
        <a
          href="/shop"
          className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-red-600 hover:text-white transition-colors"
        >
          Explore All Styles
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>

      {/* CSS Animation Keyframes */}
      <style jsx>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-marquee-left {
          animation: marquee-left linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right linear infinite;
        }
      `}</style>
    </section>
  );
};

export default Slider;

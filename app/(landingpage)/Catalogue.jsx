import Image from "next/image";
import Link from "next/link";

const products = [
  {
    id: 1,
    name: "Aero Runner Pro",
    category: "Running",
    price: 89,
    originalPrice: 129,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    tag: "Bestseller",
    description: "Lightweight performance runner with responsive cushioning"
  },
  {
    id: 2,
    name: "City Stride Elite",
    category: "Lifestyle",
    price: 95,
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80",
    description: "All-day comfort meets street-ready style"
  },
  {
    id: 3,
    name: "Trailhead Boot",
    category: "Outdoor",
    price: 120,
    image: "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=800&q=80",
    tag: "New",
    description: "Rugged durability for any terrain"
  },
  {
    id: 4,
    name: "Court Classic",
    category: "Casual",
    price: 75,
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80",
    description: "Timeless design, everyday versatility"
  },
  {
    id: 5,
    name: "Cloudknit Ultra",
    category: "Running",
    price: 110,
    originalPrice: 140,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80",
    tag: "Sale",
    description: "Cloud-like comfort with premium knit upper"
  },
  {
    id: 6,
    name: "Velocity X",
    category: "Performance",
    price: 135,
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
    description: "Maximum speed, zero compromises"
  },
];

const Catalogue = () => {
  return (
    <section className="bg-gray-50 py-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full mb-4">
            Featured Styles
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Picked for Your Rotation
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Staff picks and customer favorites — the shoes everyone&apos;s talking about
          </p>
        </div>

        {/* Product Grid - Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p) => (
            <Link
              key={p.id}
              href="/shop"
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              {/* Image Container */}
              <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 p-8 h-72">
                {/* Tag */}
                {p.tag && (
                  <span className={`absolute top-6 left-6 z-10 text-xs font-bold px-4 py-1.5 rounded-full ${
                    p.tag === "Sale" ? "bg-green-500 text-white" :
                    p.tag === "New" ? "bg-blue-600 text-white" :
                    "bg-red-600 text-white"
                  }`}>
                    {p.tag}
                  </span>
                )}

                {/* Image */}
                <div className="h-full flex items-center justify-center">
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={320}
                    height={320}
                    className="object-contain max-h-full group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6">
                {/* Category */}
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-2">
                  {p.category}
                </p>

                {/* Name & Description */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">
                  {p.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                  {p.description}
                </p>

                {/* Price & CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">${p.price}</span>
                    {p.originalPrice && (
                      <span className="text-base text-gray-400 line-through">${p.originalPrice}</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                    Shop Now
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-14 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-red-700 transition-colors"
          >
            View All Products
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Catalogue;

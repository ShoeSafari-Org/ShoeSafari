import Image from "next/image";
import Link from "next/link";

const products = [
  {
    id: 1,
    name: "Aero Runner Pro",
    price: 89,
    originalPrice: 129,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
    tag: "Bestseller",
    colors: ["#ef4444", "#000000", "#3b82f6"],
    rating: 4.8,
    reviews: 234
  },
  {
    id: 2,
    name: "City Stride Elite",
    price: 95,
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80",
    colors: ["#22c55e", "#f59e0b", "#000000"],
    rating: 4.6,
    reviews: 189
  },
  {
    id: 3,
    name: "Trailhead Boot",
    price: 120,
    image: "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=500&q=80",
    tag: "New",
    colors: ["#78716c", "#000000"],
    rating: 4.9,
    reviews: 56
  },
  {
    id: 4,
    name: "Court Classic",
    price: 75,
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80",
    colors: ["#ffffff", "#000000", "#ef4444"],
    rating: 4.7,
    reviews: 312
  },
  {
    id: 5,
    name: "Cloudknit Ultra",
    price: 110,
    originalPrice: 140,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80",
    tag: "Sale",
    colors: ["#6366f1", "#ec4899", "#000000"],
    rating: 4.8,
    reviews: 278
  },
  {
    id: 6,
    name: "Velocity X",
    price: 135,
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80",
    tag: "Hot",
    colors: ["#000000", "#ef4444"],
    rating: 4.9,
    reviews: 145
  },
];

const StarIcon = () => (
  <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const Catalogue = () => {
  return (
    <section className="bg-white py-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <div>
            <span className="inline-block px-4 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full mb-4">
              Featured Styles
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Picked for Your Rotation
            </h2>
            <p className="text-gray-600 mt-3 text-lg max-w-md">
              Staff picks and customer favorites, updated weekly
            </p>
          </div>
          <Link
            href="/shop"
            className="mt-6 sm:mt-0 inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {products.map((p) => (
            <Link
              key={p.id}
              href="/shop"
              className="group"
            >
              {/* Card */}
              <div className="relative bg-gray-50 rounded-2xl overflow-hidden mb-4">
                {/* Tag */}
                {p.tag && (
                  <span className={`absolute top-3 left-3 z-10 text-xs font-bold px-3 py-1 rounded-full ${
                    p.tag === "Sale" ? "bg-green-500 text-white" :
                    p.tag === "New" ? "bg-blue-500 text-white" :
                    p.tag === "Hot" ? "bg-orange-500 text-white" :
                    "bg-red-600 text-white"
                  }`}>
                    {p.tag}
                  </span>
                )}

                {/* Wishlist Button */}
                <button className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* Image */}
                <div className="aspect-square p-4 flex items-center justify-center">
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={280}
                    height={280}
                    className="object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Quick Add */}
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <button className="w-full bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
                    Quick Add
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                {/* Color Options */}
                <div className="flex gap-1.5">
                  {p.colors.map((color, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-red-700 transition-colors">
                  {p.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  <StarIcon />
                  <span className="text-xs font-medium text-gray-700">{p.rating}</span>
                  <span className="text-xs text-gray-400">({p.reviews})</span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">${p.price}</span>
                  {p.originalPrice && (
                    <span className="text-sm text-gray-400 line-through">${p.originalPrice}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">Pay with crypto and get 5% off your first order</p>
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-full font-semibold">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Accepts USDC on Stellar
          </div>
        </div>
      </div>
    </section>
  );
};

export default Catalogue;

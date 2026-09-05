import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    id: 1,
    name: "Men's Collection",
    description: "Bold styles for the modern man",
    imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80",
    color: "from-slate-900 to-slate-700",
    size: "large",
  },
  {
    id: 2,
    name: "Women's Collection",
    description: "Elegance meets comfort",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80",
    color: "from-rose-900 to-rose-700",
    size: "large",
  },
  {
    id: 3,
    name: "Running",
    description: "Performance footwear",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    color: "from-red-700 to-red-500",
    size: "small",
  },
  {
    id: 4,
    name: "Casual",
    description: "Everyday essentials",
    imageUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80",
    color: "from-amber-700 to-amber-500",
    size: "small",
  },
  {
    id: 5,
    name: "Formal",
    description: "Business ready",
    imageUrl: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80",
    color: "from-gray-900 to-gray-700",
    size: "small",
  },
  {
    id: 6,
    name: "Kids",
    description: "Fun & durable",
    imageUrl: "https://images.unsplash.com/photo-1555274175-75f79b09d5b8?w=600&q=80",
    color: "from-blue-700 to-blue-500",
    size: "small",
  },
];

export default function ShopByCategory() {
  const largeCategories = categories.filter((c) => c.size === "large");
  const smallCategories = categories.filter((c) => c.size === "small");

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <span className="inline-block px-4 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full mb-4">
              Collections
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Shop by Category
            </h2>
            <p className="text-gray-600 mt-3 text-lg max-w-md">
              Find your perfect pair from our curated collections
            </p>
          </div>
          <Link
            href="/shop"
            className="mt-6 md:mt-0 inline-flex items-center gap-2 text-red-700 font-semibold hover:gap-3 transition-all"
          >
            View all products
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Large Cards - First Row */}
          {largeCategories.map((category, index) => (
            <Link
              key={category.id}
              href="/shop"
              className={`group relative overflow-hidden rounded-3xl ${
                index === 0 ? "lg:col-span-2 lg:row-span-2" : "lg:col-span-2"
              } ${index === 0 ? "h-[400px] lg:h-[500px]" : "h-[300px] lg:h-[240px]"}`}
            >
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-60 group-hover:opacity-70 transition-opacity`} />
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                <span className="text-white/80 text-sm font-medium mb-1">
                  Explore the collection
                </span>
                <h3 className="text-white text-2xl md:text-3xl font-bold mb-2">
                  {category.name}
                </h3>
                <p className="text-white/90 text-sm md:text-base mb-4">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <span>Shop Now</span>
                  <svg
                    className="w-5 h-5 group-hover:translate-x-2 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

          {/* Small Cards */}
          {smallCategories.map((category) => (
            <Link
              key={category.id}
              href="/shop"
              className="group relative overflow-hidden rounded-3xl h-[200px] lg:h-[240px]"
            >
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <span className="text-white/80 text-xs font-medium mb-1">
                  Explore the collection
                </span>
                <h3 className="text-white text-xl font-bold mb-1">
                  {category.name}
                </h3>
                <p className="text-white/90 text-sm">
                  {category.description}
                </p>
              </div>
              {/* Hover Arrow */}
              <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}

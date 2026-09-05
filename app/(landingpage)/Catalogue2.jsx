import { FaCheckCircle, FaTag, FaUndoAlt, FaCreditCard } from "react-icons/fa";

const features = [
  {
    icon: FaCheckCircle,
    title: "A familiar storefront",
    text: "Browse products, add items to a cart, and reach a checkout designed to feel familiar to everyday shoppers.",
  },
  {
    icon: FaTag,
    title: "Clear payment flow",
    text: "The checkout shows the cart total before you sign a Stellar transaction with your own wallet.",
  },
  {
    icon: FaUndoAlt,
    title: "Blockchain transparency",
    text: "Successful Stellar payments produce a transaction hash and an on-chain event that can be verified publicly.",
  },
  {
    icon: FaCreditCard,
    title: "Open-source by design",
    text: "The storefront, payment utilities, and Soroban checkout contract are available for developers to inspect and adapt.",
  },
];

const Catalogue2 = () => {
  return (
    <section className="bg-white py-16 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm uppercase tracking-widest text-red-700 font-semibold mb-2">
            Why ShoeSafari
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Great shoes, next-gen payments
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 hover:shadow-md transition-shadow"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-700 text-white mb-4">
                <feature.icon size={22} />
              </span>
              <h3 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Catalogue2;

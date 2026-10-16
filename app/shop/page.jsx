"use client";
import { useEffect, useState } from "react";
import { useCart } from "../../context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { FaShoppingCart } from "react-icons/fa";
import Cart from "../../components/Cart";
import Modal from "../../components/Modal";
import Toast from "../../components/Toast";
import { db } from "../../lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { searchProducts } from "../../lib/productSearch";
import { ProductGridSkeleton } from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { isProductPurchasable, normalizeProduct } from "../../lib/productCatalog";

export default function Products() {
  const {
    itemCount,
    cartItems,
    addToCart,
    removeFromCart,
    totalPrice,
    cartRecoveryMessage,
  } = useCart();
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      window.localStorage.getItem("__shoesafari_e2e") === "1"
    ) {
      setProducts([
        {
          id: "e2e-trail-runner",
          name: "E2E Trail Runner",
          price: 79.99,
          img: "/images/shoe1.png",
        },
      ]);
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        if (!db) {
          throw new Error("Product catalog is not configured.");
        }

        const snapshot = await getDocs(collection(db, "ShoeSafariProducts"));
        setProducts(
          snapshot.docs
            .map((productDoc) => normalizeProduct(productDoc.data(), productDoc.id))
            .filter(Boolean)
        );
      } catch {
        setError("We couldn't load products right now. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const showToast = (message) => {
    setToast({ show: true, message });
  };

  const handleCheckout = (e) => {
    setIsCheckingOut(true);
    e.preventDefault();
    if (cartItems.length > 0) {
      window.location.href = "/checkout";
    } else {
      showToast("There is nothing in your cart");
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);
  const filteredProducts = searchProducts(products, searchTerm);

  return (
    <>
      <div className="w-full max-w-screen-xl mx-auto py-8">
        <Cart itemCount={itemCount} onClick={openModal} />
        <section className="h-[70vh] overflow-auto">
          <span className="text-4xl sm:text-6xl py-4 flex justify-center items-center font-extrabold">
            Welcome to Our Store!
          </span>

          <div className="mx-auto mb-6 flex max-w-xl gap-2 px-4">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <input
              id="product-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products"
              className="min-w-0 flex-1 rounded border border-gray-400 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="rounded border border-gray-400 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700"
              >
                Clear search
              </button>
            )}
          </div>

          {isLoading && (
            <div aria-busy="true">
              <p className="sr-only" role="status">Loading products</p>
              <ProductGridSkeleton count={8} />
            </div>
          )}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!isLoading && !error && products.length === 0 && (
            <p className="text-gray-600 text-center py-8">
              No products are available right now. Please check back soon.
            </p>
          )}

          {!isLoading && !error && products.length > 0 && filteredProducts.length === 0 && (
            <EmptyState
              illustration="search"
              role="status"
              className="mx-auto my-8 max-w-md border-0"
              title="No matching products"
              description={`We couldn't find anything for “${searchTerm.trim()}”. Try a different search, or clear it to see everything.`}
            >
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="rounded bg-red-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
              >
                Clear search
              </button>
            </EmptyState>
          )}

          {!isLoading && !error && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((prod) => (
                <div key={prod.id} className="p-4 border rounded-lg shadow">
                  <Link href={`/shop/${prod.id}`}>
                    <Image
                      src={prod.img}
                      alt={prod.name}
                      width={200}
                      height={200}
                      className="mb-2"
                    />
                    <h1 className="text-xl font-bold">{prod.name}</h1>
                    <h2 className="text-lg">
                      {prod.price === null ? "Price unavailable" : `$${prod.price}`}
                    </h2>
                    <p className="text-sm" aria-label="Product availability">
                      {prod.available === false ? "Unavailable" : "Available"}
                    </p>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Add ${prod.name} to cart`}
                    disabled={!isProductPurchasable(prod)}
                    title={
                      prod.price === null
                        ? "This product cannot be purchased because its price is missing or invalid."
                        : undefined
                    }
                    className="border-red-800 rounded-full px-2 py-2 mt-2 border-2 hover:border-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      showToast(
                        addToCart(prod)
                          ? "Item added to cart"
                          : prod.price === null
                            ? "This product cannot be added because its price is missing or invalid."
                            : "This product is unavailable."
                      );
                    }}
                  >
                    <FaShoppingCart aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
      <Modal show={showModal} onClose={closeModal} ariaLabel="Shopping cart">
        <h2 className="text-2xl mb-4">Cart Items</h2>
        {cartRecoveryMessage && (
          <p role="status" className="mb-3 text-amber-800">
            {cartRecoveryMessage}
          </p>
        )}
        {cartItems.length === 0 ? (
          <EmptyState
            illustration="cart"
            className="border-0"
            title="Your cart is empty"
            description="Looks like you haven't added any shoes yet. Explore the store and find your next favorite pair."
          >
            <button
              type="button"
              onClick={closeModal}
              className="rounded bg-red-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
            >
              Continue shopping
            </button>
          </EmptyState>
        ) : (
          <div>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center mb-2">
                <div className="w-16 h-16 flex-shrink-0">
                  <Image
                    src={item.img} // Ensure this URL is correct
                    width={64}
                    height={64}
                    alt={`${item.name} image`}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="ml-4">{item.name}</span>
                <span className="ml-4">${item.price}</span>
                <span className="ml-4 text-sm" aria-label="Cart item availability">
                  {item.available === false ? "Unavailable" : "Available"}
                </span>
                <button
                  className="ml-4 bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() => removeFromCart(item)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center mt-4 mx-5 sm:mx-10">
          <div>
            {cartItems.length > 0 && <strong>Total:</strong>}
            {totalPrice ? <span className="ml-2 font-bold ">${totalPrice.toFixed(2)}</span> : ""}
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={handleCheckout}
              className="bg-red-500 text-white px-4 py-1 rounded mt-4"
            >
              {isCheckingOut ? "CheckingOut..." : "CheckOut"}
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}

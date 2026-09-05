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

export default function Products() {
  const { itemCount, cartItems, addToCart, removeFromCart, totalPrice } =
    useCart();
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!db) {
          throw new Error("Product catalog is not configured.");
        }

        const snapshot = await getDocs(collection(db, "ShoeSafariProducts"));
        setProducts(
          snapshot.docs.map((productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load products.");
      }
    };

    fetchProducts();
  }, []);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
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

  return (
    <>
      <div className="w-full max-w-screen-xl mx-auto py-8">
        <Cart itemCount={itemCount} onClick={openModal} />
        <section className="h-[70vh] overflow-auto">
          <span className="text-4xl sm:text-6xl py-4 flex justify-center items-center font-extrabold">
            Welcome to Our Store!
          </span>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((prod) => (
              <div key={prod.id} className="p-4 border rounded-lg shadow">
                <Link href={`/shop/${prod.id}`}>
                  <Image
                    src={prod.img} // Ensure this URL is correct
                    alt={prod.name}
                    width={200}
                    height={200}
                    className="mb-2"
                  />
                  <h1 className="text-xl font-bold">{prod.name}</h1>
                  <h2 className="text-lg">${prod.price}</h2>
                </Link>
                <button
                  className="border-red-800 rounded-full px-2 py-2 mt-2 border-2 hover:border-red-600"
                  onClick={() => {
                    addToCart(prod);
                    showToast("Item added to cart");
                  }}
                >
                  <FaShoppingCart />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
      <Modal show={showModal} onClose={closeModal}>
        <h2 className="text-2xl mb-4">Cart Items</h2>
        {cartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <div>
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center mb-2"
              >
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
            {totalPrice ? (
              <span className="ml-2 font-bold ">${totalPrice.toFixed(2)}</span>
            ) : (
              ""
            )}
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

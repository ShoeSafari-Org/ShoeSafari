"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../../context/CartContext";
import Modal from "../../../components/Modal";
import Toast from "../../../components/Toast";
import Cart from "../../../components/Cart";
import { db } from "../../../lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import LoadingSpinner from "../../../components/LoadingSpinner";

const ProductPage = ({ params }) => {
  const { itemCount, cartItems, addToCart, removeFromCart, totalPrice } =
    useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const { id } = params;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "ShoeSafariProducts", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Product not found");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleCheckout = () => {
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
      <div className="container max-w-screen-xl mx-auto py-8 mt-10">
        <Cart itemCount={itemCount} onClick={openModal} />

        {loading && <LoadingSpinner />}
        {error && (
          <div className="flex flex-col items-center justify-center my-32">
            <h1 className="text-2xl font-bold text-red-700">Error: {error}</h1>
          </div>
        )}
        {!loading && !error && product && (
          <>
            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
            <Image
              src={product.img}
              alt={product.name}
              width={400}
              height={400}
            />
            <div className="flex space-x-4 items-center my-4">
              <h2 className="text-4xl">${product.price}</h2>
              <button
                className="flex border border-red-800 rounded-md px-4 py-2 justify-between items-center hover:bg-red-700"
                onClick={() => {
                  addToCart(product);
                  showToast("Item added to cart");
                }}
              >
                <FaShoppingCart /> <span className="px-2">Add to Cart</span>
              </button>
            </div>
          </>
        )}
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
      <Modal show={showModal} onClose={closeModal} ariaLabel="Shopping cart">
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
                    src={item.img}
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
              Checkout
            </button>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ProductPage;

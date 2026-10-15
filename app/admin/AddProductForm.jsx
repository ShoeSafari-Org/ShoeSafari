"use client";
import React, { useState } from "react";
import { db, storage } from "../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Toast from "../../components/Toast";
import {
  SUPPORTED_PRODUCT_IMAGE_TYPES,
  validateProductImage,
} from "../../lib/validation";

const AddProductForm = ({ onProductAdded }) => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "" });
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Ensure a file is selected
      if (!productImage) {
        setImageError("Please select a product image.");
        return;
      }

      const validation = validateProductImage(productImage);
      if (!validation.isValid) {
        setImageError(validation.error);
        return;
      }

      setImageError("");
      setLoading(true);

      // Upload the image to Firebase Storage
      const imageRef = ref(storage, `products/${productImage.name}`);
      const snapshot = await uploadBytes(imageRef, productImage);
      const imageUrl = await getDownloadURL(snapshot.ref);

      // Add product details to Firestore
      await addDoc(collection(db, "ShoeSafariProducts"), {
        name: productName,
        price: parseFloat(productPrice),
        img: imageUrl, // Save image URL to Firestore
      });

      showToast("Product added successfully!");
      setProductName("");
      setProductPrice("");
      setProductImage(null);
      onProductAdded();
    } catch (error) {
      showToast("Error adding product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-red-500">
      <h1 className="text-3xl font-bold mb-6 text-center text-red-500">
        Add New Product
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Name
          </label>
          <input
            type="text"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Price
          </label>
          <input
            type="number"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Image
          </label>
          <input
            type="file"
            accept={SUPPORTED_PRODUCT_IMAGE_TYPES.join(",")}
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-describedby={imageError ? "add-product-image-error" : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setProductImage(file);
              setImageError(
                file ? validateProductImage(file).error || "" : ""
              );
            }}
            required
          />
          {imageError && (
            <p id="add-product-image-error" className="mt-2 text-sm text-red-600" role="alert">
              {imageError}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-600">
            JPEG, PNG, WebP, or GIF. Maximum size: 5 MiB.
          </p>
        </div>
        <button
          type="submit"
          className={`w-full py-3 mt-4 text-white font-bold bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
          disabled={loading}
        >
          {loading ? "Adding Product..." : "Add Product"}
        </button>
      </form>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
    </div>
  );
};

export default AddProductForm;

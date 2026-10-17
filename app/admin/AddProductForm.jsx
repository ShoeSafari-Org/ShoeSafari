"use client";
import React, { useState } from "react";
import { db, storage } from "../../lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createProductImageStoragePath } from "../../lib/productImageStorage";
import Toast from "../../components/Toast";
import TextField from "../../components/ui/TextField";
import Button from "../../components/ui/Button";
import {
  SUPPORTED_PRODUCT_IMAGE_TYPES,
  validateProductImage,
  validatePrice,
} from "../../lib/validation";

const AddProductForm = ({ onProductAdded }) => {
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "" });
  const showToast = (message) => {
    setToast({ show: true, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const priceValidation = validatePrice(productPrice);
      if (!priceValidation.isValid) {
        setPriceError(priceValidation.error);
        return;
      }

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
      const imageRef = ref(storage, createProductImageStoragePath());
      const snapshot = await uploadBytes(imageRef, productImage, {
        customMetadata: { originalFileName: productImage.name },
      });
      const imageUrl = await getDownloadURL(snapshot.ref);

      // Add product details to Firestore
      await addDoc(collection(db, "ShoeSafariProducts"), {
        name: productName,
        category: productCategory.trim(),
        price: Number(priceValidation.sanitized),
        img: imageUrl, // Save image URL to Firestore
        available: true,
      });

      showToast("Product added successfully!");
      setProductName("");
      setProductCategory("");
      setProductPrice("");
      setPriceError("");
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
          <TextField
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold" htmlFor="product-category">
            Category
          </label>
          <input
            id="product-category"
            type="text"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md"
            value={productCategory}
            onChange={(event) => setProductCategory(event.target.value)}
            placeholder="e.g. Running"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Price
          </label>
          <TextField
            type="number"
            step="0.01"
            min="0"
            max="1000000"
            value={productPrice}
            onChange={(e) => {
              setProductPrice(e.target.value);
              setPriceError("");
            }}
            aria-invalid={Boolean(priceError)}
            aria-describedby={priceError ? "add-product-price-error" : undefined}
            required
          />
          {priceError && (
            <p id="add-product-price-error" className="mt-2 text-sm text-red-600" role="alert">
              {priceError}
            </p>
          )}
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Image
          </label>
          <TextField
            type="file"
            accept={SUPPORTED_PRODUCT_IMAGE_TYPES.join(",")}
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
        <Button
          type="submit"
          className={`w-full py-3 mt-4 text-white font-bold bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
          disabled={loading}
        >
          {loading ? "Adding Product..." : "Add Product"}
        </Button>
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

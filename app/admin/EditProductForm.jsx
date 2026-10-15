"use client";
import React, { useState, useEffect } from "react";
import { db, storage } from "../../lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  SUPPORTED_PRODUCT_IMAGE_TYPES,
  validateProductImage,
  validatePrice,
} from "../../lib/validation";

const EditProductForm = ({ productId, onProductUpdated }) => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [productImage, setProductImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "ShoeSafariProducts", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const productData = docSnap.data();
          setProductName(productData.name);
          setProductPrice(productData.price);
          setAvailable(productData.available !== false);
          setExistingImageUrl(productData.img);
        } else {
          setErrorMessage("Product not found");
        }
      } catch (error) {
        setErrorMessage("Error fetching product: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const priceValidation = validatePrice(productPrice);
    if (!priceValidation.isValid) {
      setPriceError(priceValidation.error);
      return;
    }

    if (productImage) {
      const validation = validateProductImage(productImage);
      if (!validation.isValid) {
        setImageError(validation.error);
        return;
      }
    }

    setImageError("");
    setPriceError("");
    setLoading(true);

    try {
      let imageUrl = existingImageUrl;

      if (productImage) {
        const imageRef = ref(storage, `products/${productImage.name}`);
        const snapshot = await uploadBytes(imageRef, productImage);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const docRef = doc(db, "ShoeSafariProducts", productId);
      await updateDoc(docRef, {
        name: productName,
        price: Number(priceValidation.sanitized),
        img: imageUrl,
        available,
      });

      setSuccessMessage("Product updated successfully!");
      onProductUpdated();
    } catch (error) {
      setErrorMessage("Error updating product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-red-500">
      <h1 className="text-3xl font-bold mb-6 text-center text-red-500">
        Edit Product
      </h1>
      <form onSubmit={handleSubmit}>
        {successMessage && (
          <div className="mb-4 p-4 text-white bg-green-500 rounded-md">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 text-white bg-red-500 rounded-md">
            {errorMessage}
          </div>
        )}
        <div className="mb-6">
          <label className="flex items-center gap-3 text-gray-700 text-lg font-semibold">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
            />
            Available for purchase
          </label>
        </div>
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
            step="0.01"
            min="0"
            max="1000000"
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            value={productPrice}
            onChange={(e) => {
              setProductPrice(e.target.value);
              setPriceError("");
            }}
            aria-invalid={Boolean(priceError)}
            aria-describedby={priceError ? "edit-product-price-error" : undefined}
            required
          />
          {priceError && (
            <p id="edit-product-price-error" className="mt-2 text-sm text-red-600" role="alert">
              {priceError}
            </p>
          )}
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold">
            Product Image
          </label>
          <input
            type="file"
            accept={SUPPORTED_PRODUCT_IMAGE_TYPES.join(",")}
            className="w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-describedby={imageError ? "edit-product-image-error" : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setProductImage(file);
              setImageError(
                file ? validateProductImage(file).error || "" : ""
              );
            }}
          />
          {imageError && (
            <p id="edit-product-image-error" className="mt-2 text-sm text-red-600" role="alert">
              {imageError}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-600">
            JPEG, PNG, WebP, or GIF. Maximum size: 5 MiB.
          </p>
          {existingImageUrl && (
            <img
              src={existingImageUrl}
              alt="Existing product"
              className="mt-4 max-w-full h-auto rounded-md"
            />
          )}
        </div>
        <button
          type="submit"
          className={`w-full py-3 mt-4 text-white font-bold bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
          disabled={loading}
        >
          {loading ? "Updating Product..." : "Update Product"}
        </button>
      </form>
    </div>
  );
};

export default EditProductForm;

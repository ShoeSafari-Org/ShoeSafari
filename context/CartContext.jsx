"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { restoreCart } from "../lib/cartStorage";
import { isProductAvailable } from "../lib/productAvailability";
import { isProductPurchasable } from "../lib/productCatalog";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const getCartSummary = (items) => ({
  itemCount: items.length,
  totalPrice: items.reduce((total, item) => total + Number(item.price), 0),
});

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [cartRecoveryMessage, setCartRecoveryMessage] = useState("");
  const cartItemsRef = useRef([]);

  const updateCartState = useCallback((items) => {
    const purchasableItems = items.filter(
      (item) => isProductAvailable(item) && isProductPurchasable(item),
    );
    const summary = getCartSummary(purchasableItems);
    cartItemsRef.current = purchasableItems;
    setCartItems(purchasableItems);
    setItemCount(summary.itemCount);
    setTotalPrice(summary.totalPrice);
    return purchasableItems;
  }, []);

  const persistCart = (items) => {
    const summary = getCartSummary(items);
    const previous = ["cartItems", "itemCount", "totalPrice"].map((key) => [
      key,
      localStorage.getItem(key),
    ]);
    try {
      localStorage.setItem("cartItems", JSON.stringify(items));
      localStorage.setItem("itemCount", String(summary.itemCount));
      localStorage.setItem("totalPrice", String(summary.totalPrice));
    } catch (error) {
      previous.forEach(([key, value]) => {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      });
      throw error;
    }
  };

  const restoreLatestCart = useCallback(() => {
    const restored = restoreCart(window.localStorage);
    const items = updateCartState(restored.items);
    if (restored.recovered || items.length !== restored.items.length) {
      setCartRecoveryMessage(
        "Invalid or unavailable saved cart items were removed. Your remaining cart is ready.",
      );
    }
  }, [updateCartState]);

  useEffect(() => {
    restoreLatestCart();

    const handleStorage = (event) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== "cartItems") return;

      // Read current storage so a delayed event cannot replace a newer cart.
      restoreLatestCart();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [restoreLatestCart]);

  const addToCart = (product) => {
    if (!isProductAvailable(product) || !isProductPurchasable(product)) return false;
    const previousItems = cartItemsRef.current;
    const updatedItems = [...previousItems, product];
    updateCartState(updatedItems);
    try {
      persistCart(updatedItems);
    } catch {
      updateCartState(previousItems);
      setCartRecoveryMessage("Your cart could not be saved. Please try again.");
      return false;
    }
    return true;
  };

  const removeFromCart = (product) => {
    const index = cartItemsRef.current.findIndex((item) => item.id === product.id);
    if (index === -1) return;

    const updatedItems = [...cartItemsRef.current];
    updatedItems.splice(index, 1);
    const previousItems = cartItemsRef.current;
    updateCartState(updatedItems);
    try {
      persistCart(updatedItems);
    } catch {
      updateCartState(previousItems);
      setCartRecoveryMessage("Your cart could not be saved. Please try again.");
    }
  };

  const clearCart = () => {
    updateCartState([]);
    localStorage.removeItem("cartItems");
    localStorage.removeItem("itemCount");
    localStorage.removeItem("totalPrice");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        totalPrice,
        cartRecoveryMessage,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

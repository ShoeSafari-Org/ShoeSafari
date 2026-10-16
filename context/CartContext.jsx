"use client"
import { createContext, useContext, useEffect, useState } from "react";
import { restoreCart } from "../lib/cartStorage";
import { isProductAvailable } from "../lib/productAvailability";
import { isProductPurchasable } from "../lib/productCatalog";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [cartRecoveryMessage, setCartRecoveryMessage] = useState("");

  useEffect(() => {
    const restored = restoreCart(window.localStorage);
    const items = restored.items.filter(isProductAvailable);
    const itemCount = items.length;
    const totalPrice = items.reduce((total, item) => total + (Number(item.price) || 0), 0);
    setCartItems(items);
    setItemCount(itemCount);
    setTotalPrice(totalPrice);
    if (items.length !== restored.items.length) {
      window.localStorage.setItem("cartItems", JSON.stringify(items));
      window.localStorage.setItem("itemCount", String(itemCount));
      window.localStorage.setItem("totalPrice", String(totalPrice));
    }
    if (restored.recovered || items.length !== restored.items.length) {
      setCartRecoveryMessage("Invalid saved cart data was removed. Your remaining cart is ready.");
    }
  }, []);

  const addToCart = (product) => {
    if (!isProductAvailable(product) || !isProductPurchasable(product)) return false;
    setCartItems((prevCartItems) => {
      const updatedCartItems = [...prevCartItems, product];
      localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
      return updatedCartItems;
    });
    setItemCount((prevItemCount) => {
      const newItemCount = prevItemCount + 1;
      localStorage.setItem("itemCount", newItemCount.toString());
      return newItemCount;
    });
    setTotalPrice((prevTotalPrice) => {
      const newTotalPrice = prevTotalPrice + product.price;
      localStorage.setItem("totalPrice", newTotalPrice.toString());
      return newTotalPrice;
    });
    return true;
  };

  const removeFromCart = (product) => {
    setCartItems((prevCartItems) => {
      const index = prevCartItems.findIndex((item) => item.id === product.id);
      if (index === -1) return prevCartItems; // If item not found, return previous cart items

      const updatedCartItems = [...prevCartItems];
      updatedCartItems.splice(index, 1); // Remove the item from the array
      localStorage.setItem("cartItems", JSON.stringify(updatedCartItems));
      return updatedCartItems;
    });

    setItemCount((prevItemCount) => {
      const newItemCount = prevItemCount - 1;
      localStorage.setItem("itemCount", newItemCount.toString());
      return newItemCount;
    });

    setTotalPrice((prevTotalPrice) => {
      const removedItem = cartItems.find((item) => item.id === product.id);
      if (!removedItem) return prevTotalPrice; // If item not found, return previous total price
      const newTotalPrice = prevTotalPrice - removedItem.price;
      localStorage.setItem("totalPrice", newTotalPrice.toString());
      return newTotalPrice;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setItemCount(0);
    setTotalPrice(0);
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

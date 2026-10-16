export interface CartStorageItem extends Record<string, unknown> {
  id: string;
  name: string;
  img: string;
  price: number;
}

export interface RestoredCart {
  items: CartStorageItem[];
  itemCount: number;
  totalPrice: number;
  recovered: boolean;
}

const CART_STORAGE_KEYS = ["cartItems", "itemCount", "totalPrice"] as const;

function normalizeCartItem(value: unknown): CartStorageItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const item = value as Record<string, unknown>;
  const price = typeof item.price === "number" ? item.price : Number(item.price);
  if (
    typeof item.id !== "string" ||
    item.id.trim() === "" ||
    typeof item.name !== "string" ||
    typeof item.img !== "string" ||
    item.img.trim() === "" ||
    (typeof item.price !== "number" &&
      (typeof item.price !== "string" || item.price.trim() === "")) ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null;
  }

  return { ...item, price } as CartStorageItem;
}

function clearCartKeys(storage: Pick<Storage, "removeItem">): void {
  for (const key of CART_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }
}

export function restoreCart(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): RestoredCart {
  try {
    const rawItems = storage.getItem("cartItems");
    const parsed: unknown = rawItems === null ? [] : JSON.parse(rawItems);
    if (!Array.isArray(parsed)) throw new Error("Saved cart must be an array.");

    const items = parsed
      .map(normalizeCartItem)
      .filter((item): item is CartStorageItem => item !== null);
    const recovered = items.length !== parsed.length;
    const itemCount = items.length;
    const totalPrice = items.reduce((total, item) => total + item.price, 0);

    storage.setItem("cartItems", JSON.stringify(items));
    storage.setItem("itemCount", String(itemCount));
    storage.setItem("totalPrice", String(totalPrice));

    return { items, itemCount, totalPrice, recovered };
  } catch {
    clearCartKeys(storage);
    return { items: [], itemCount: 0, totalPrice: 0, recovered: true };
  }
}

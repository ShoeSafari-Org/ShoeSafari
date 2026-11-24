import { FaShoppingCart } from "react-icons/fa";

/**
 * Floating cart button that opens the cart dialog.
 *
 * `aria-expanded` and `aria-haspopup` tell a screen-reader user that this is a
 * disclosure control and whether the dialog is currently open; without them the
 * button announces only a count and gives no clue what it does (#336).
 */
const Cart = ({ itemCount, onClick, isOpen = false }) => {
  const count = Number(itemCount) || 0;
  const itemLabel = count === 1 ? "item" : "items";

  return (
    <div className="fixed bottom-20 left-8">
      <button
        type="button"
        aria-label={`Open shopping cart, ${count} ${itemLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="relative p-3 rounded-full bg-red-500 text-white shadow-md hover:bg-red-700 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
        onClick={onClick}
      >
        <FaShoppingCart size={34} className="relative z-10" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-2 right-0 flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-700 rounded-full"
          >
            {count}
          </span>
        )}
      </button>
    </div>
  );
};

export default Cart;

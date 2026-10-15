"use client";

import { useEffect, useRef } from "react";
import { ImCancelCircle } from "react-icons/im";
import { trapFocus } from "../lib/accessibility";

function Modal({ show, onClose, children, ariaLabel = "Dialog" }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!show || !dialog) return undefined;

    const previouslyFocused = document.activeElement;
    const releaseFocus = trapFocus(dialog);
    const handleEscape = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    dialog.addEventListener("keydown", handleEscape);

    return () => {
      dialog.removeEventListener("keydown", handleEscape);
      releaseFocus();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-2xl p-6 relative mx-2 max-h-[80vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-6 right-4 text-gray-500 hover:text-gray-700"
        >
          <ImCancelCircle size={25} className="text-red-700" />
        </button>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

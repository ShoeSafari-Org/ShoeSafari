import { useEffect, useRef, useState } from "react";

const EXIT_DURATION_MS = 300;

const Toast = ({ message, show, onClose, time = 3000 }) => {
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);

  // Keep callback changes from restarting the dismissal timer. Many callers
  // provide an inline callback, which otherwise changes on every render.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      exitTimer = window.setTimeout(() => onCloseRef.current(), EXIT_DURATION_MS);
    }, time);
    let exitTimer;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(exitTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [message, show, time]);

  if (!show && !visible) return null;

  return (
    <div
      className={`fixed bottom-10 right-5 z-50 bg-gray-800 text-white p-3 rounded shadow-lg transform transition-transform duration-300 ease-in-out ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-4 text-red-300"
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
};

export default Toast;

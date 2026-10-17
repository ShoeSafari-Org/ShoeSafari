export default function TextField({ className = "", ...props }) {
  return (
    <input
      className={`w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
      {...props}
    />
  );
}

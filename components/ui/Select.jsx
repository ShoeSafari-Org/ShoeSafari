export default function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full p-3 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

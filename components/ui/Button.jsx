export default function Button({ className = "", children, ...props }) {
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}

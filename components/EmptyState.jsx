import Link from "next/link";

/**
 * Friendly inline SVG illustrations for empty states.
 *
 * Each illustration is purely decorative (the heading/description carry the
 * meaning), so it is marked aria-hidden and focusable={false}.
 */
const illustrations = {
  cart: (
    <svg
      viewBox="0 0 160 160"
      aria-hidden="true"
      focusable="false"
      className="h-32 w-32"
    >
      <circle cx="80" cy="80" r="76" fill="#fef2f2" />
      <path
        d="M38 46h10l6 56h56l10-40H58"
        fill="none"
        stroke="#b91c1c"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="62" cy="116" r="7" fill="#b91c1c" />
      <circle cx="102" cy="116" r="7" fill="#b91c1c" />
      <path
        d="M78 66h16M86 58v16"
        stroke="#f87171"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  ),
  orders: (
    <svg
      viewBox="0 0 160 160"
      aria-hidden="true"
      focusable="false"
      className="h-32 w-32"
    >
      <circle cx="80" cy="80" r="76" fill="#fef2f2" />
      <rect
        x="46"
        y="40"
        width="68"
        height="84"
        rx="8"
        fill="#ffffff"
        stroke="#b91c1c"
        strokeWidth="5"
      />
      <path
        d="M62 64h36M62 82h36M62 100h22"
        stroke="#f87171"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M66 36h28v12a4 4 0 0 1-4 4H70a4 4 0 0 1-4-4z"
        fill="#b91c1c"
      />
    </svg>
  ),
  search: (
    <svg
      viewBox="0 0 160 160"
      aria-hidden="true"
      focusable="false"
      className="h-32 w-32"
    >
      <circle cx="80" cy="80" r="76" fill="#fef2f2" />
      <circle
        cx="72"
        cy="72"
        r="30"
        fill="#ffffff"
        stroke="#b91c1c"
        strokeWidth="5"
      />
      <path
        d="M94 94l24 24"
        stroke="#b91c1c"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M62 72h20M72 62v20"
        stroke="#f87171"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/**
 * EmptyState
 *
 * A reusable, friendly empty-state block: an illustration, a heading, a short
 * description, and an optional call to action.
 *
 * @param {Object} props
 * @param {"cart"|"orders"|"search"} [props.illustration="cart"] - Which inline
 *   SVG illustration to show. Ignored when `icon` is provided.
 * @param {React.ReactNode} [props.icon] - Custom decorative illustration. When
 *   supplied it is wrapped so it stays hidden from assistive technology.
 * @param {string} props.title - Required heading text.
 * @param {string} [props.description] - Supporting text under the heading.
 * @param {string} [props.actionHref] - When set with `actionLabel`, renders a
 *   Next.js Link styled as the primary CTA.
 * @param {string} [props.actionLabel] - Label for the `actionHref` CTA.
 * @param {React.ReactNode} [props.children] - Custom action(s) rendered below
 *   the description (takes precedence over `actionHref`).
 * @param {string} [props.className] - Extra classes for the wrapper.
 * @param {"polite"|"assertive"} [props.role] - When set to "status", the block
 *   is announced to assistive technology (useful for live search results).
 */
export default function EmptyState({
  illustration = "cart",
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  children,
  className = "",
  role,
}) {
  const art = icon ?? illustrations[illustration] ?? illustrations.cart;

  return (
    <div
      {...(role ? { role } : {})}
      className={`flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 px-6 py-12 text-center ${className}`}
    >
      <span aria-hidden="true" className="text-red-700">
        {art}
      </span>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="max-w-md text-sm text-gray-600">{description}</p>
      )}
      {children
        ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{children}</div>
        : actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="mt-2 rounded bg-red-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
            >
              {actionLabel}
            </Link>
          )}
    </div>
  );
}

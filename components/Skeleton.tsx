"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

/**
 * Skeleton Component
 *
 * A placeholder component for loading states.
 *
 * Usage:
 * ```tsx
 * <Skeleton variant="text" width="80%" />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * ```
 */
export default function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const baseClasses = "bg-gray-200";

  const variantClasses = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "skeleton-wave",
    none: "",
  };

  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/**
 * Product Card Skeleton
 */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 shadow">
      <Skeleton variant="rectangular" className="mb-2 aspect-square w-full" />
      <Skeleton variant="text" width="70%" height={28} className="mb-2" />
      <Skeleton variant="text" width="40%" height={24} />
      <div className="mt-2 flex items-center justify-between">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
    </div>
  );
}

/**
 * Product Grid Skeleton
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-4 px-6">
          <Skeleton variant="text" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          {Array.from({ length: columns }).map((_, index) => (
            <th key={index} className="py-3 px-6 text-left">
              <Skeleton variant="text" width="60%" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRowSkeleton key={index} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}

/**
 * Order Card Skeleton
 */
export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

/**
 * Page Header Skeleton
 */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 mb-8">
      <Skeleton variant="text" width={300} height={32} />
      <Skeleton variant="text" width={200} />
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton variant="text" width={100} />
          <Skeleton variant="rectangular" height={40} className="w-full" />
        </div>
      ))}
      <Skeleton variant="rectangular" width={120} height={40} />
    </div>
  );
}

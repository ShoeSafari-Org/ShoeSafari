import { OrderCardSkeleton, PageHeaderSkeleton } from "../../components/Skeleton";

export default function OrdersLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 mt-8" aria-busy="true">
      <p className="sr-only" role="status">Loading your orders</p>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => <OrderCardSkeleton key={index} />)}
      </div>
    </main>
  );
}

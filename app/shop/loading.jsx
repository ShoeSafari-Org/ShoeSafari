import { ProductGridSkeleton } from "../../components/Skeleton";

const loading = () => (
  <main className="mx-auto min-h-screen w-full max-w-screen-xl bg-white px-4 py-8" aria-busy="true">
    <p role="status" className="sr-only">Loading products</p>
    <div className="mb-8 h-12 max-w-sm animate-pulse rounded bg-gray-200" aria-hidden="true" />
    <ProductGridSkeleton count={8} />
  </main>
);

export default loading;

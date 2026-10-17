import Skeleton from "../../components/Skeleton";

export default function CollectionsLoading() {
  return (
    <main className="mt-6 p-4 sm:mt-4 md:p-8 lg:p-12" aria-busy="true">
      <p className="sr-only" role="status">
        Loading shoe collections
      </p>
      <div className="mb-6 flex justify-center" aria-hidden="true">
        <Skeleton variant="text" width={280} height={36} />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-lg bg-white shadow-lg">
            <Skeleton variant="rectangular" className="h-48 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton variant="text" width="75%" height={28} />
              <Skeleton variant="text" width="35%" height={24} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

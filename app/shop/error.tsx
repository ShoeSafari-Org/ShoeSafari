"use client";

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">The catalog could not be loaded</h1>
      <p className="mt-3 text-gray-600">Please try again or return to the storefront.</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
        >
          Try again
        </button>
        <a href="/" className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700">
          Go home
        </a>
      </div>
    </main>
  );
}

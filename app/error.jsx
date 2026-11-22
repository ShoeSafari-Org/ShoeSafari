"use client";

export default function Error({ reset }) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">This page could not be loaded</h1>
      <p className="mt-3 text-gray-600">Please try again. Your cart and account are unchanged.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
      >
        Try again
      </button>
    </main>
  );
}

"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <main className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-3 text-gray-600">
            We could not load ShoeSafari. Try again or return to the storefront.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

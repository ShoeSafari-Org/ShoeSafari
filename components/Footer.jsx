"use client";

import Link from "next/link";
export default function Footer() {
  return (
    <footer className="bg-red-700 py-2">
      <section className="flex flex-col sm:flex-row sm:divide-x-2  divide-black divide justify-between items-center h-28 text-center font-normal  container mx-auto">
        <span className="sm:flex gap-2 text-sm hidden ">
          <Link
            href="/"
            className="hover:underline hover:underline-offset-1 transition ease-out"
          >
            Terms of use
          </Link>
          <Link
            href="/"
            className="hover:underline hover:underline-offset-1 transition ease-out"
          >
            Privacy Policy
          </Link>
          <Link
            href="/"
            className="hover:underline hover:underline-offset-1 transition ease-out"
          >
            About us
          </Link>
          <Link
            href="/"
            className="hover:underline hover:underline-offset-1 transition ease-out"
          >
            24/7 Customer Service
          </Link>
        </span>
        <span className="sm:pl-10 sm:my-0 my-10">&copy; 2026 ShoeSafari. All rights reserved.</span>
      </section>
    </footer>
  );
}

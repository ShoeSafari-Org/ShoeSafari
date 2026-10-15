"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdLock, MdWarning } from "react-icons/md";
import Link from "next/link";

/**
 * AdminGuard - Protects admin routes by checking authentication and authorization.
 *
 * Usage:
 * ```jsx
 * <AdminGuard>
 *   <YourAdminComponent />
 * </AdminGuard>
 * ```
 *
 * Requirements:
 * - User must be authenticated (logged in)
 * - User must have the trusted Firebase Auth `admin: true` custom claim
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected content to render for admins
 * @param {string} [props.redirectTo="/profile/login"] - Where to redirect unauthenticated users
 */
const AdminGuard = ({ children, redirectTo = "/profile/login" }) => {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(`${redirectTo}?redirect=/admin`);
    }
  }, [loading, isAuthenticated, router, redirectTo]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <AiOutlineLoading3Quarters className="animate-spin text-red-600 text-4xl mb-4" />
        <p className="text-gray-600">Checking access...</p>
      </div>
    );
  }

  // Not authenticated - show message while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <MdLock className="text-gray-400 text-6xl mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h1>
        <p className="text-gray-600 mb-6">Please log in to access the admin panel.</p>
        <Link
          href={`${redirectTo}?redirect=/admin`}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <MdWarning className="text-yellow-500 text-6xl mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-2">You don't have permission to access the admin panel.</p>
        <p className="text-sm text-gray-500 mb-6">
          Logged in as: <span className="font-medium">{user?.email}</span>
        </p>
        <div className="flex gap-4">
          <Link
            href="/"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/shop"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Browse Shop
          </Link>
        </div>
        <p className="mt-8 text-xs text-gray-400 max-w-md text-center">
          If you need admin access, contact the site administrator to grant your Firebase account
          the admin custom claim.
        </p>
      </div>
    );
  }

  // User is authenticated and is an admin - render children
  return (
    <div>
      {/* Admin header bar */}
      <div className="bg-red-700 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MdLock className="text-lg" />
          <span>Admin Panel</span>
        </div>
        <span className="text-red-200">{user?.email}</span>
      </div>
      {children}
    </div>
  );
};

export default AdminGuard;

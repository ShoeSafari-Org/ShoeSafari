"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext();

/**
 * Checks if an email is in the admin whitelist.
 * @param {string|null|undefined} email - User email to check
 * @returns {boolean} True if user is an admin
 */
const checkIsAdmin = (email) => {
  if (!email) return false;

  const adminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const adminEmails = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== "");

  return adminEmails.includes(email.toLowerCase());
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute isAdmin based on user email
  const isAdmin = useMemo(() => {
    return user?.email ? checkIsAdmin(user.email) : false;
  }, [user?.email]);

  // Value object with user, loading, and isAdmin
  const value = useMemo(() => ({
    user,
    loading,
    isAdmin,
    isAuthenticated: !!user,
  }), [user, loading, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

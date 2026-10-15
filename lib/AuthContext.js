"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { auth } from "./firebaseConfig";
import { onIdTokenChanged } from "firebase/auth";
import { hasAdminClaim } from "./adminClaims";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      let admin = false;
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          admin = hasAdminClaim(token.claims);
        } catch {
          admin = false;
        }
      }

      if (active) {
        setUser(user);
        setIsAdmin(admin);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Value object with user, loading, and isAdmin
  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isAuthenticated: !!user,
    }),
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

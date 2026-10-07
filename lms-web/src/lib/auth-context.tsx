"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, getMe, login as apiLogin, logout as apiLogout } from "./api";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identity: string, pass: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const u = await getMe();
          setUser(u);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          Cookies.remove("auth_session");
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  const login = async (identity: string, pass: string) => {
    const res = await apiLogin(identity, pass) as {
      accessToken: string;
      refreshToken: string;
      user: User;
    };
    if (res.accessToken) {
      localStorage.setItem("accessToken", res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem("refreshToken", res.refreshToken);
      }
      Cookies.set("auth_session", "1", { expires: 7 });
      setUser(res.user);
    }
    return res.user;
  };

  const logout = () => {
    const rt = localStorage.getItem("refreshToken");
    if (rt) {
      // Fire-and-forget — revoke server-side token
      apiLogout(rt).catch(() => {});
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    Cookies.remove("auth_session");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

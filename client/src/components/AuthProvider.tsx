import React, { createContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getDemoHomeUrl, isStaticDemo } from "@/lib/runtime";

type AuthUser = any;

export interface AuthContextValue {
  user: AuthUser;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  goToDashboard: (role?: string) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getDashboardRoute(role?: string) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "coordinator":
      return "/coordinator/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "student":
      return "/student/dashboard";
    case "director":
      return "/director/dashboard";
    default:
      return "/";
  }
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<AuthUser>(null);
  const [isLoading, setIsLoading] = useState(true);

  const goToDashboard = (role?: string) => {
    setLocation(getDashboardRoute(role));
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log("Auth check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Erro no login",
          description: error.message || "Credenciais invalidas",
          variant: "destructive",
        });
        return false;
      }

      const data = await response.json();
      queryClient.clear();
      setUser(data.user);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${data.user.firstName}!`,
      });
      goToDashboard(data.user.role);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erro no login",
        description: "Erro de conexao. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      queryClient.clear();
      setUser(null);
      toast({
        title: "Logout realizado com sucesso",
        description: "Voce foi desconectado do sistema",
      });

      if (isStaticDemo) {
        window.location.replace(getDemoHomeUrl());
        return;
      }

      setLocation("/");
      window.location.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Erro ao sair",
        description: "Nao foi possivel encerrar a sessao agora.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
        goToDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

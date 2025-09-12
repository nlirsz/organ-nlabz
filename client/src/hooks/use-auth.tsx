import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";
import { setUnauthorizedCallback, apiRequest } from "@/lib/queryClient";

interface User {
  userId: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, userId: string, username: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();

  const isAuthenticated = !!user;

  // Bootstrap authentication check - uses apiRequest for automatic 401 handling
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const authToken = localStorage.getItem("authToken");
      
      if (!authToken) {
        setUser(null);
        return;
      }

      // Use apiRequest to inherit 401 interceptor and automatic token refresh
      const response = await apiRequest("GET", "/api/auth/me");
      const userData = await response.json();
      
      setUser({
        userId: userData.userId,
        username: userData.username,
      });
      console.log("✅ Bootstrap auth successful:", userData.username);
    } catch (error) {
      // apiRequest already tried token refresh automatically
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("❌ Bootstrap auth failed after refresh attempt:", errorMessage);
      // Clear local state only (localStorage already cleared by apiRequest if needed)
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (token: string, refreshToken: string, userId: string, username: string) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username);
    
    setUser({ userId, username });
    console.log("✅ User logged in:", username);
  };

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint using apiRequest for consistency
      const authToken = localStorage.getItem("authToken");
      if (authToken) {
        await apiRequest("POST", "/api/auth/logout");
      }
    } catch (error) {
      console.log("⚠️ Logout endpoint error:", error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      setUser(null);
      console.log("👋 User logged out");
      setLocation("/auth");
    }
  }, [setLocation]);

  // Setup global 401 handler with cleanup
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log("🚫 Global 401 handler triggered");
      setUser(null);
      setLocation("/auth");
    };
    
    setUnauthorizedCallback(handleUnauthorized);
    
    // Cleanup on unmount
    return () => {
      setUnauthorizedCallback(() => {});
    };
  }, [setLocation]);

  // Bootstrap auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
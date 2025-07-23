import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";

import HomePage from "@/pages/home";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (token: string, userId: string, username: string) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("username", username);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} 
            />
            <Route 
              path="/auth" 
              element={isAuthenticated ? <Navigate to="/home" replace /> : <AuthPage onAuthSuccess={handleAuthSuccess} />} 
            />
            <Route 
              path="/home" 
              element={isAuthenticated ? <HomePage /> : <Navigate to="/auth" replace />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
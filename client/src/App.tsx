import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

import HomePage from "@/pages/home";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

import "./index.css";

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
          <Switch>
            <Route path="/">
              {isAuthenticated ? <Redirect to="/home" /> : <LandingPage />}
            </Route>
            <Route path="/auth">
              {isAuthenticated ? <Redirect to="/home" /> : <AuthPage onAuthSuccess={handleAuthSuccess} />}
            </Route>
            <Route path="/home">
              {isAuthenticated ? <HomePage /> : <Redirect to="/auth" />}
            </Route>
            <Route>
              <NotFound />
            </Route>
          </Switch>
          <Toaster />
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
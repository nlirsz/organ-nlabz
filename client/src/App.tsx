import { Router, Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

import HomePage from "@/pages/home";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

import "./index.css";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Redirect to="/auth" />;
}

// Public Route Component (redirects to home if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <Redirect to="/home" /> : <>{children}</>;
}

// App Routes Component (needs to be inside AuthProvider)
function AppRoutes() {
  return (
    <Router>
      <div className="min-h-screen">
        <Switch>
          <Route path="/">
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          </Route>
          <Route path="/auth">
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          </Route>
          <Route path="/home">
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
        <Toaster />
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
import { Route, Switch } from "wouter";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        <Switch>
          <Route path="/app" component={Home} />
          <Route path="/" component={LandingPage} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
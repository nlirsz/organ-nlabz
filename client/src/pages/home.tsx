import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, Sidebar, MobileMenuButton } from "@/components/ui/sidebar";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { ProdutosTab } from "@/components/tabs/produtos-tab";
import { AddProdutosTab } from "@/components/tabs/add-produtos-tab";
import { HistoricoTab } from "@/components/tabs/historico-tab";
import { AuthForm } from "@/components/auth/login-form";
import type { Product } from "@shared/schema";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    if (token && userId && username) {
      setAuthToken(token);
      setCurrentUser({ id: userId, username });
      setIsAuthenticated(true);
    }
  }, []);

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products", refreshKey],
    queryFn: () => 
      fetch("/api/products", {
        headers: {
          "x-auth-token": authToken
        }
      }).then(res => res.json()),
    enabled: isAuthenticated && !!authToken,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", refreshKey],
    queryFn: () => 
      fetch(`/api/products/stats/${currentUser?.id}`, {
        headers: {
          "x-auth-token": authToken
        }
      }).then(res => res.json()),
    enabled: isAuthenticated && !!authToken,
  });

  const handleProductAdded = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleProductUpdated = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleAuthSuccess = (token: string, userId: string, username: string) => {
    setAuthToken(token);
    setCurrentUser({ id: userId, username });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <SidebarProvider>
      <div className={`min-h-screen transition-all duration-300 ${isDark ? 'dark' : ''}`} style={{ backgroundColor: 'var(--c-primary)' }}>
        <div className="flex">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            currentUser={currentUser}
            onLogout={handleLogout}
            isDark={isDark}
            toggleTheme={toggleTheme}
          />

          {/* Main Content */}
          <main className="flex-1 min-h-screen md:ml-20 main-content-mobile">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
              {/* Tab Content */}
              <div className="fade-in">
                {activeTab === "dashboard" && (
                  <DashboardTab refreshKey={refreshKey} />
                )}
                {activeTab === "produtos" && (
                  <ProdutosTab 
                    products={products || []} 
                    isLoading={isLoading} 
                    onProductUpdated={handleProductUpdated}
                  />
                )}
                {activeTab === "add-produtos" && (
                  <AddProdutosTab onProductAdded={handleProductAdded} />
                )}
                {activeTab === "historico" && (
                  <HistoricoTab refreshKey={refreshKey} />
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Mobile Menu Button */}
        <MobileMenuButton />
      </div>
    </SidebarProvider>
  );
}
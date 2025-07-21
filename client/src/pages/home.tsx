import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Settings, UserCircle, Moon, Sun, LogOut } from "lucide-react";
import { TabNavigation } from "@/components/tab-navigation";
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
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'dark' : ''}`} style={{ backgroundColor: 'var(--c-primary)' }}>
      {/* Header Neumórfico */}
      <header className="neomorphic-card sticky top-0 z-50 mx-4 mt-4 mb-6 rounded-2xl">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center p-2 bg-[#121212]">
                <img 
                  src="/assets/logo.png" 
                  alt="orgaN Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold" style={{ 
                fontFamily: 'Almarai, sans-serif',
                color: 'var(--text-primary)',
                textShadow: '1px 1px 2px var(--c-light)'
              }}>orgaN</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Olá, {currentUser?.username}
              </span>
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center">
                <UserCircle className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 space-y-8 pb-8">
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

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
      </main>
    </div>
  );
}
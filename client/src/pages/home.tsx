import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Settings, UserCircle, Moon, Sun } from "lucide-react";
import { TabNavigation } from "@/components/tab-navigation";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { ProdutosTab } from "@/components/tabs/produtos-tab";
import { AddProdutosTab } from "@/components/tabs/add-produtos-tab";
import { HistoricoTab } from "@/components/tabs/historico-tab";
import { FinanceiroTab } from "@/components/tabs/financeiro-tab";
import type { Product } from "@shared/schema";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const userId = 1; // Default user ID

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products", userId, refreshKey],
    queryFn: () => fetch(`/api/products/${userId}`).then(res => res.json()),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", userId, refreshKey],
    queryFn: () => fetch(`/api/products/stats/${userId}`).then(res => res.json()),
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

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'dark' : ''}`} style={{ backgroundColor: 'var(--c-primary)' }}>
      {/* Header Neumórfico */}
      <header className="neomorphic-card sticky top-0 z-50 mx-4 mt-4 mb-6 rounded-2xl">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ 
                fontFamily: 'Almarai, sans-serif',
                color: 'var(--text-primary)',
                textShadow: '1px 1px 2px var(--c-light)'
              }}>orgaN</h1>
            </div>
            <div className="flex items-center space-x-3">
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
              products={products} 
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
          {activeTab === "financeiro" && (
            <FinanceiroTab refreshKey={refreshKey} />
          )}
        </div>
      </main>
    </div>
  );
}

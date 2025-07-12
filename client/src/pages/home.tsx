import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Settings, UserCircle, Moon, Sun } from "lucide-react";
import { UrlInput } from "@/components/url-input";
import { StatsCards } from "@/components/stats-cards";
import { ShoppingList } from "@/components/shopping-list";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDark, setIsDark] = useState(false);

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products", refreshKey],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", refreshKey],
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
              }}>
                Meus Produtos
              </h1>
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
        {/* URL Input Section */}
        <div className="fade-in">
          <UrlInput onProductAdded={handleProductAdded} />
        </div>

        {/* Stats Cards */}
        <div className="fade-in">
          <StatsCards stats={stats} />
        </div>

        {/* Shopping List */}
        <div className="fade-in">
          <ShoppingList 
            products={products} 
            isLoading={isLoading} 
            onProductUpdated={handleProductUpdated}
          />
        </div>
      </main>
    </div>
  );
}

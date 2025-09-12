import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, Sidebar, MobileMenuButton } from "@/components/ui/sidebar";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { ProdutosTab } from "@/components/tabs/produtos-tab";
import { AddProdutosTab } from "@/components/tabs/add-produtos-tab";
import { HistoricoTab } from "@/components/tabs/historico-tab";
import { AuthForm } from "@/components/auth/login-form";
import type { SelectProduct } from "@shared/schema";

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

  const { data: products = [], isLoading, refetch } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products", refreshKey],
    queryFn: () => 
      fetch("/api/products", {
        headers: {
          "x-auth-token": authToken || ""
        }
      }).then(res => res.json()),
    enabled: isAuthenticated && !!authToken,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", refreshKey],
    queryFn: () => 
      fetch(`/api/products/stats/${currentUser?.id}`, {
        headers: {
          "x-auth-token": authToken || ""
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
    // Redirect to /app after successful authentication
    window.location.href = '/app';
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const refreshData = async () => {
    console.log("Home: Atualizando dados...");
    //setIsLoading(true); // The original code did not have setIsLoading, so I commented it out. If setIsLoading is defined elsewhere, uncomment this line.

    try {
      // Força bypass do cache
      const timestamp = Date.now();
      const response = await fetch(`/api/products?_t=${timestamp}`, {
        headers: { 
          "x-auth-token": authToken || "",
          "Cache-Control": "no-cache"
        }
      });

      if (response.ok) {
        const data = await response.json();
        //setProducts(data); //The original code did not have setProducts, so I commented it out. If setProducts is defined elsewhere, uncomment this line.
        //setLastUpdated(timestamp); //The original code did not have setLastUpdated, so I commented it out. If setLastUpdated is defined elsewhere, uncomment this line.
        console.log("Home: Dados atualizados com sucesso!", data.length, "produtos");
        refetch(); // Refresh the data using react-query refetch after manually fetching new data.
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    } finally {
      //setIsLoading(false); // The original code did not have setIsLoading, so I commented it out. If setIsLoading is defined elsewhere, uncomment this line.
    }
  };

  useEffect(() => {
    if (isAuthenticated && authToken) {
      refreshData();
    }
  }, [isAuthenticated, authToken]);

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
                    refreshKey={refreshKey}
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
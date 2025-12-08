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
    enabled: isAuthenticated && !!authToken,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", refreshKey],
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
      <div className={`min-h-screen transition-all duration-500 ${isDark ? 'dark' : ''} bg-background text-foreground relative overflow-hidden`}>
        {/* Premium Background Effects - SaaS Style */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px] animate-pulse delay-700" />
          <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-secondary/10 blur-[100px] animate-pulse delay-1000" />
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        </div>

        <div className="flex relative z-10">
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
          <main className="flex-1 min-h-screen md:ml-20 main-content-mobile transition-all duration-300">
            <div className="max-w-[1600px] mx-auto px-6 py-10 space-y-10">
              {/* Hero Section - SaaS Landing Style */}
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 fade-in">
                <div className="space-y-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Sistema Operacional
                  </div>
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                    Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">{currentUser?.username}</span>
                  </h1>
                  <p className="text-muted-foreground text-xl font-light max-w-2xl leading-relaxed">
                    Bem-vindo ao seu painel de controle financeiro inteligente.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="glass-card px-6 py-3 flex flex-col items-end">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data de Hoje</span>
                    <span className="text-lg font-medium text-foreground">
                      {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab Content with Transitions */}
              <div className="fade-in duration-700">
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
import { useQuery } from "@tanstack/react-query";
import { SmartDashboard } from "@/components/smart-dashboard";
import { NotificationsPanel } from "@/components/notifications-panel";
import { OfflineMode } from "@/components/offline-mode";
import { useOfflineMode } from "@/components/offline-mode";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallmentsTimeline } from "@/components/installments-timeline";

interface DashboardTabProps {
  refreshKey: number;
}

export function DashboardTab({ refreshKey }: DashboardTabProps) {
  const { isOnline } = useOfflineMode();
  const authToken = localStorage.getItem("authToken");

  const { data: products = [], isLoading: productsLoading, error: productsError, refetch } = useQuery({
      queryKey: ["/api/products"],
      enabled: isOnline && !!authToken,
      retry: 3,
  });

  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", refreshKey],
    enabled: isOnline && !!authToken,
  });

  if (!isOnline || !authToken) {
    return (
      <div className="space-y-8">
        <div className="text-center fade-in">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Dashboard Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {!authToken ? "Usuário não autenticado" : "Modo offline ativo"}
          </p>
        </div>
        {!isOnline && <OfflineMode />}
      </div>
    );
  }

  // Show loading state
  if (productsLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center fade-in">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Dashboard Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Carregando dados dos produtos...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error loading products
  if (productsError) {
    return (
      <div className="space-y-8">
        <div className="text-center fade-in">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Dashboard Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Erro ao carregar dados: {productsError.message}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="text-center fade-in">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Dashboard Principal
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Visão geral completa dos seus produtos e estatísticas
        </p>
      </div>

      <SmartDashboard />

      {/* Timeline de Parcelas */}
      <Card className="neomorphic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Timeline de Parcelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InstallmentsTimeline />
        </CardContent>
      </Card>

      <NotificationsPanel />
    </div>
  );
}
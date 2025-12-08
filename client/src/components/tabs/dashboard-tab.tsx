import { useQuery } from "@tanstack/react-query";
import { SmartDashboard } from "@/components/smart-dashboard";
import { NotificationsPanel } from "@/components/notifications-panel";
import { OfflineMode } from "@/components/offline-mode";
import { useOfflineMode } from "@/components/offline-mode";
import { CreditCard, TrendingUp, Package, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallmentsTimeline } from "@/components/installments-timeline";
import { MagicBento } from "@/components/ui/magic-bento";

interface DashboardTabProps {
  refreshKey: number;
}

export function DashboardTab({ refreshKey }: DashboardTabProps) {
  const { isOnline } = useOfflineMode();
  const authToken = localStorage.getItem("authToken");

  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/products"],
    enabled: isOnline && !!authToken,
    retry: 3,
  });

  if (!isOnline || !authToken) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Dashboard Principal
          </h2>
          <p className="text-muted-foreground">
            {!authToken ? "Usuário não autenticado" : "Modo offline ativo"}
          </p>
        </div>
        {!isOnline && <OfflineMode />}
      </div>
    );
  }

  if (productsLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted/50" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-muted/50" />
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="glass-card p-8 text-center border-destructive/20">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-foreground">
          Erro ao carregar dados
        </h2>
        <p className="text-muted-foreground mb-6">
          {productsError.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="glass-button-primary"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Smart Dashboard handles the main stats and charts */}
      <SmartDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline de Parcelas - Spans 8 columns */}
        <div className="lg:col-span-8 h-full">
          <Card className="glass-card border-none h-full overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg font-medium text-foreground">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                Timeline de Parcelas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <InstallmentsTimeline />
            </CardContent>
          </Card>
        </div>

        {/* Notifications Panel - Spans 4 columns */}
        <div className="lg:col-span-4 h-full">
          <div className="h-full">
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
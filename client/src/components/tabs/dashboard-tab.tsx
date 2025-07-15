import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { SmartDashboard } from "@/components/smart-dashboard";
import { NotificationsPanel } from "@/components/notifications-panel";
import { OfflineMode } from "@/components/offline-mode";
import { useOfflineMode } from "@/components/offline-mode";
import { BarChart3, TrendingUp, ShoppingBag, Calendar } from "lucide-react";
import type { Product } from "@shared/schema";

interface DashboardTabProps {
  refreshKey: number;
}

export function DashboardTab({ refreshKey }: DashboardTabProps) {
  const { isOnline } = useOfflineMode();
  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", refreshKey],
    queryFn: () => fetch("/api/products", {
      headers: {
        "x-auth-token": authToken || ""
      }
    }).then(res => res.json()),
    enabled: isOnline && !!authToken,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", refreshKey],
    queryFn: () => fetch(`/api/products/stats/${userId}`, {
      headers: {
        "x-auth-token": authToken || ""
      }
    }).then(res => res.json()),
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between fade-in">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Dashboard Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Análise inteligente das suas compras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsPanel />
        </div>
      </div>

      <SmartDashboard />
    </div>
  );
}
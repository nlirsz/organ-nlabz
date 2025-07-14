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
  const userId = 1; // Default user ID
  const { isOnline } = useOfflineMode();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", userId, refreshKey],
    queryFn: () => fetch(`/api/products/${userId}`).then(res => res.json()),
    enabled: isOnline,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", userId, refreshKey],
    queryFn: () => fetch(`/api/products/stats/${userId}`).then(res => res.json()),
    enabled: isOnline,
  });

  if (!isOnline) {
    return (
      <div className="space-y-8">
        <div className="text-center fade-in">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Dashboard Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Modo offline ativo
          </p>
        </div>
        <OfflineMode />
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
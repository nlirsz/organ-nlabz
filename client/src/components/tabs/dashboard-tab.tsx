import { useQuery } from "@tanstack/react-query";
import { SmartDashboard } from "@/components/smart-dashboard";
import { NotificationsPanel } from "@/components/notifications-panel";
import { OfflineMode, useOfflineMode } from "@/components/offline-mode";
import type { Product } from "@shared/schema";
import { useEffect } from "react";

interface DashboardTabProps {
  refreshKey: number;
}

export function DashboardTab({ refreshKey }: DashboardTabProps) {
  const userId = 1; // Default user ID
  const { isOnline, offlineProducts, saveProductsForOffline } = useOfflineMode();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", userId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/products/${userId}`);
      const data = await res.json();
      if (isOnline) {
        saveProductsForOffline(data);
      }
      return data;
    },
    enabled: isOnline,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/products/stats", userId, refreshKey],
    queryFn: () => fetch(`/api/products/stats/${userId}`).then(res => res.json()),
    enabled: isOnline,
  });

  const displayProducts = isOnline ? products : offlineProducts;

  if (!isOnline && offlineProducts.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center fade-in">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Dashboard Principal
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Modo offline ativo. Nenhum dado salvo.
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
            {isOnline ? "Análise inteligente das suas compras" : "Mostrando dados salvos offline"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsPanel />
        </div>
      </div>

      <SmartDashboard 
        products={displayProducts}
        stats={stats} // Stats might be stale offline
        isLoading={(productsLoading || statsLoading) && isOnline}
      />
    </div>
  );
}
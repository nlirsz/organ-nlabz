import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { SmartDashboard } from "@/components/smart-dashboard";
import { NotificationsPanel } from "@/components/notifications-panel";
import { OfflineMode } from "@/components/offline-mode";
import { useOfflineMode } from "@/components/offline-mode";
import { BarChart3, TrendingUp, ShoppingBag, Calendar, Package, CreditCard } from "lucide-react";
import type { Product } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallmentsTimeline } from "@/components/installments-timeline";

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

  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];

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

  const purchasedProducts = safeProducts.filter(p => p.isPurchased);
  const pendingProducts = safeProducts.filter(p => !p.isPurchased);

  const categoryBreakdown = safeProducts.reduce((acc: Record<string, { count: number, value: number }>, product) => {
    const category = product.category || 'Outros';
    if (!acc[category]) {
      acc[category] = { count: 0, value: 0 };
    }
    acc[category].count++;
    acc[category].value += parseFloat(product.price || '0');
    return acc;
  }, {});

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b.value - a.value)
    .slice(0, 5);

  const storeBreakdown = safeProducts.reduce((acc: Record<string, { count: number, value: number }>, product) => {
    const store = product.store || 'Outros';
    if (!acc[store]) {
      acc[store] = { count: 0, value: 0 };
    }
    acc[store].count++;
    acc[store].value += parseFloat(product.price || '0');
    return acc;
  }, {});

  const topStores = Object.entries(storeBreakdown)
    .sort(([,a], [,b]) => b.value - a.value)
    .slice(0, 5);

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
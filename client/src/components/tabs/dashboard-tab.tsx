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

  const purchasedProducts = products.filter(p => p.isPurchased);
  const pendingProducts = products.filter(p => !p.isPurchased);

  const categoryBreakdown = products.reduce((acc: Record<string, { count: number, value: number }>, product) => {
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

  const storeBreakdown = products.reduce((acc: Record<string, { count: number, value: number }>, product) => {
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

      <StatsCards />

      {/* Novos Cards Informativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="neomorphic-card">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--primary-action)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Taxa de Conversão
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
              {products.length > 0 ? Math.round((purchasedProducts.length / products.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="neomorphic-card">
          <CardContent className="p-6 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--success-color)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Última Compra
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--success-color)' }}>
              {purchasedProducts.length > 0 ? 'Hoje' : 'Nenhuma'}
            </p>
          </CardContent>
        </Card>

        <Card className="neomorphic-card">
          <CardContent className="p-6 text-center">
            <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--warning-color)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Categoria Top
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--warning-color)' }}>
              {topCategories.length > 0 ? topCategories[0][0] : 'Nenhuma'}
            </p>
          </CardContent>
        </Card>

        <Card className="neomorphic-card">
          <CardContent className="p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--error-color)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Economia Total
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--error-color)' }}>
              R$ {purchasedProducts.reduce((sum, p) => {
                const original = parseFloat(p.originalPrice || p.price || '0');
                const current = parseFloat(p.price || '0');
                return sum + (original - current);
              }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análises Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="neomorphic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCategories.map(([category, data], index) => (
                <div key={category} className="flex items-center justify-between p-3 rounded-lg neomorphic-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-green-500' : 
                      index === 2 ? 'bg-purple-500' :
                      index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {category}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {data.count} produto{data.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm" style={{ color: 'var(--primary-action)' }}>
                      R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="neomorphic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Top Lojas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topStores.map(([store, data], index) => (
                <div key={store} className="flex items-center justify-between p-3 rounded-lg neomorphic-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-red-500' : 
                      index === 1 ? 'bg-yellow-500' : 
                      index === 2 ? 'bg-indigo-500' :
                      index === 3 ? 'bg-pink-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {store}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {data.count} produto{data.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm" style={{ color: 'var(--primary-action)' }}>
                      R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
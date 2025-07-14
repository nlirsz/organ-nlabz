import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { BarChart3, TrendingUp, ShoppingBag, Calendar } from "lucide-react";
import type { Product } from "@shared/schema";

interface DashboardTabProps {
  refreshKey: number;
}

export function DashboardTab({ refreshKey }: DashboardTabProps) {
  const userId = 1; // Default user ID

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", userId, refreshKey],
    queryFn: () => fetch(`/api/products/${userId}`).then(res => res.json()),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats", userId, refreshKey],
    queryFn: () => fetch(`/api/products/stats/${userId}`).then(res => res.json()),
  });

  const recentProducts = products.slice(0, 5);
  const purchasedProducts = products.filter(p => p.isPurchased);
  const totalValue = products.reduce((sum, p) => sum + (p.price ? parseFloat(p.price) : 0), 0);

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="fade-in">
        <StatsCards stats={stats} />
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Products */}
        <section className="neomorphic-card p-6 rounded-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Produtos Recentes
            </h3>
          </div>
          
          <div className="space-y-4">
            {recentProducts.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Nenhum produto adicionado ainda
              </p>
            ) : (
              recentProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
                  <div className="flex items-center space-x-3">
                    {product.imageUrl && (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {product.name}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {product.category} • {product.store}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--primary-action)' }}>
                      {product.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(product.price)) : 'N/A'}
                    </p>
                    {product.isPurchased && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Comprado
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="neomorphic-card p-6 rounded-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Resumo do Mês
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Total Produtos</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--primary-action)' }}>
                {products.length}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Comprados</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--primary-action)' }}>
                {purchasedProducts.length}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Valor Total</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--primary-action)' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
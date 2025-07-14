import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, ShoppingBag, Calendar, PieChart } from "lucide-react";
import type { Product } from "@shared/schema";

interface FinanceiroTabProps {
  refreshKey: number;
}

export function FinanceiroTab({ refreshKey }: FinanceiroTabProps) {
  const userId = 1; // Default user ID

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", userId, refreshKey],
    queryFn: () => fetch(`/api/products/${userId}`).then(res => res.json()),
  });

  const purchasedProducts = products.filter(p => p.isPurchased);
  const pendingProducts = products.filter(p => !p.isPurchased);
  
  const totalSpent = purchasedProducts.reduce((sum, p) => sum + (p.price ? parseFloat(p.price) : 0), 0);
  const totalPending = pendingProducts.reduce((sum, p) => sum + (p.price ? parseFloat(p.price) : 0), 0);
  const totalValue = totalSpent + totalPending;

  // Group by category
  const spendingByCategory = purchasedProducts.reduce((acc, product) => {
    const category = product.category || 'Outros';
    const price = product.price ? parseFloat(product.price) : 0;
    acc[category] = (acc[category] || 0) + price;
    return acc;
  }, {} as Record<string, number>);

  // Group by store
  const spendingByStore = purchasedProducts.reduce((acc, product) => {
    const store = product.store || 'Outros';
    const price = product.price ? parseFloat(product.price) : 0;
    acc[store] = (acc[store] || 0) + price;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(spendingByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const topStores = Object.entries(spendingByStore)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8" style={{ color: 'var(--primary-action)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Resumo Financeiro
        </h2>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Controle seus gastos e planejamento financeiro
        </p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Total Gasto
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Pendente
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Total Produtos
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {products.length}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <PieChart className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Valor Total
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
          </p>
        </div>
      </div>

      {/* Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <div className="neomorphic-card p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Gastos por Categoria
          </h3>
          
          {topCategories.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Nenhuma compra realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topCategories.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {category}
                  </span>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--primary-action)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {((amount / totalSpent) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spending by Store */}
        <div className="neomorphic-card p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Gastos por Loja
          </h3>
          
          {topStores.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Nenhuma compra realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topStores.map(([store, amount]) => (
                <div key={store} className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {store}
                  </span>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--primary-action)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {((amount / totalSpent) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
          Resumo Mensal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 neomorphic-card rounded-xl">
            <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Produtos Comprados
            </h4>
            <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
              {purchasedProducts.length}
            </p>
          </div>
          
          <div className="text-center p-4 neomorphic-card rounded-xl">
            <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Produtos Pendentes
            </h4>
            <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
              {pendingProducts.length}
            </p>
          </div>
          
          <div className="text-center p-4 neomorphic-card rounded-xl">
            <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Taxa de Compra
            </h4>
            <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
              {products.length > 0 ? ((purchasedProducts.length / products.length) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
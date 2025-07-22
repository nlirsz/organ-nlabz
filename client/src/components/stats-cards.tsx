import { ShoppingCart, Check, DollarSign } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <section className="stats-grid">
      <div className="neomorphic-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Total de Produtos
            </p>
            <p className="text-xl md:text-2xl font-bold" style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {stats?.totalItems ?? 0}
            </p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 neomorphic-card rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--primary-action)' }} />
          </div>
        </div>
      </div>

      <div className="neomorphic-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Produtos Comprados
            </p>
            <p className="text-xl md:text-2xl font-bold" style={{ 
              color: 'var(--success-color)',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {stats?.purchasedItems ?? 0}
            </p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 neomorphic-card rounded-2xl flex items-center justify-center">
            <Check className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--success-color)' }} />
          </div>
        </div>
      </div>

      <div className="neomorphic-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Gasto Total (Comprados)
            </p>
            <p className="text-lg md:text-2xl font-bold" style={{ 
              color: 'var(--edit-color)',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {formatPrice(stats?.estimatedTotal ?? 0)}
            </p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 neomorphic-card rounded-2xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--edit-color)' }} />
          </div>
        </div>
      </div>

      <div className="neomorphic-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Valor Médio por Compra
            </p>
            <p className="text-lg md:text-2xl font-bold" style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {stats?.purchasedItems ? formatPrice((stats?.estimatedTotal ?? 0) / stats.purchasedItems) : 'R$ 0,00'}
            </p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 neomorphic-card rounded-2xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--text-secondary)' }} />
          </div>
        </div>
      </div>

      <div className="neomorphic-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Produtos na Lista
            </p>
            <p className="text-xl md:text-2xl font-bold" style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {(stats?.totalItems ?? 0) - (stats?.purchasedItems ?? 0)}
            </p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 neomorphic-card rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--text-secondary)' }} />
          </div>
        </div>
      </div>

      <div className="neomorphic-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Balanço do Mês
            </p>
            <p className="text-lg md:text-2xl font-bold" style={{ 
              color: 'var(--success-color)',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {formatPrice(15000)}
            </p>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 neomorphic-card rounded-2xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 md:w-7 md:h-7" style={{ color: 'var(--success-color)' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
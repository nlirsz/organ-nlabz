
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, CheckCircle, Calendar, Store, Trash2, DollarSign, TrendingUp, ShoppingBag, PieChart, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface HistoricoTabProps {
  refreshKey: number;
}

export function HistoricoTab({ refreshKey }: HistoricoTabProps) {
  const userId = 1; // Default user ID
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", userId, refreshKey],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      const res = await fetch(`/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: installments = [] } = useQuery({
    queryKey: ["/api/installments", refreshKey],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      try {
        const res = await fetch(`/api/installments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          console.log('Installments response not ok:', res.status);
          return [];
        }
        const data = await res.json();
        console.log('Installments data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching installments:', error);
        return [];
      }
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments", refreshKey], 
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      try {
        const res = await fetch(`/api/payments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          console.log('Payments response not ok:', res.status);
          return [];
        }
        const data = await res.json();
        console.log('Payments data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    },
  });

  // Filtra apenas produtos que foram REALMENTE comprados
  const purchasedProducts = Array.isArray(products) ? products.filter(p => p.isPurchased === true) : [];
  const pendingProducts = Array.isArray(products) ? products.filter(p => p.isPurchased === false || p.isPurchased === null) : [];
  
  console.log('Products data:', { 
    total: products.length, 
    purchased: purchasedProducts.length, 
    pending: pendingProducts.length,
    purchasedProducts: purchasedProducts.map(p => ({ id: p.id, name: p.name, isPurchased: p.isPurchased }))
  });
  
  const totalSpent = purchasedProducts.reduce((sum, p) => {
    const price = p.price ? parseFloat(p.price.toString()) : 0;
    return sum + price;
  }, 0);
  
  const totalPending = pendingProducts.reduce((sum, p) => {
    const price = p.price ? parseFloat(p.price.toString()) : 0;
    return sum + price;
  }, 0);
  
  const totalValue = totalSpent + totalPending;

  // Group by category - apenas produtos REALMENTE comprados
  const spendingByCategory = purchasedProducts.reduce((acc, product) => {
    if (product.isPurchased !== true) return acc;
    const category = product.category || 'Outros';
    const price = product.price ? parseFloat(product.price.toString()) : 0;
    acc[category] = (acc[category] || 0) + price;
    return acc;
  }, {} as Record<string, number>);

  // Group by store - apenas produtos REALMENTE comprados
  const spendingByStore = purchasedProducts.reduce((acc, product) => {
    if (product.isPurchased !== true) return acc;
    const store = product.store || 'Outros';
    const price = product.price ? parseFloat(product.price.toString()) : 0;
    acc[store] = (acc[store] || 0) + price;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(spendingByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const topStores = Object.entries(spendingByStore)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Processa timeline de parcelas - CORRIGIDO
  const installmentTimeline = (Array.isArray(installments) ? installments : []).reduce((timeline, item) => {
    // Verifica se item tem as propriedades necessárias
    if (!item || !item.installment || !item.payment || !item.product) {
      console.warn('Item de parcela inválido:', item);
      return timeline;
    }

    const installment = item.installment;
    const payment = item.payment;
    const product = item.product;
    
    try {
      const dueDate = new Date(installment.dueDate);
      if (isNaN(dueDate.getTime())) {
        console.warn('Data de vencimento inválida:', installment.dueDate);
        return timeline;
      }

      const monthYear = dueDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      if (!timeline[monthYear]) {
        timeline[monthYear] = [];
      }
      
      timeline[monthYear].push({
        id: installment.id,
        installmentNumber: installment.installmentNumber || 1,
        dueDate: installment.dueDate,
        value: installment.value || 0,
        isPaid: installment.isPaid || false,
        productName: product.name || 'Produto sem nome',
        productImage: product.imageUrl || '/placeholder.jpg',
        store: product.store || 'Loja não informada',
        totalInstallments: payment.installments || 1,
        paymentMethod: payment.paymentMethod || 'Não informado',
        bank: payment.bank || 'Não informado'
      });
    } catch (error) {
      console.error('Erro ao processar parcela:', error, item);
    }
    
    return timeline;
  }, {} as Record<string, any[]>);

  // Ordena por data e agrupa os próximos 12 meses
  const sortedTimeline = Object.entries(installmentTimeline)
    .sort(([a], [b]) => {
      try {
        const dateA = new Date(a + " 01");
        const dateB = new Date(b + " 01");
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 12);

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error("Falha ao excluir produto");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
      toast({
        title: "Sucesso",
        description: "Produto removido do histórico",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir produto",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (productId: number, productName: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${productName}" do histórico?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8" style={{ color: 'var(--primary-action)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Histórico e Finanças
        </h2>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Controle completo de suas compras e gastos
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
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent || 0)}
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
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending || 0)}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Compras Realizadas
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {purchasedProducts.length}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Lojas Diferentes
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Set(purchasedProducts.map(p => p.store)).size}
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
          
          {purchasedProducts.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Nenhuma compra realizada ainda</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Marque alguns produtos como "comprados" para ver os gastos por categoria
              </p>
            </div>
          ) : totalSpent === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Produtos comprados sem preço definido</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Adicione preços aos produtos comprados para ver as estatísticas
              </p>
            </div>
          ) : topCategories.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Carregando dados...</p>
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
          
          {purchasedProducts.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Nenhuma compra realizada ainda</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Marque alguns produtos como "comprados" para ver os gastos por loja
              </p>
            </div>
          ) : totalSpent === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Produtos comprados sem preço definido</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                Adicione preços aos produtos comprados para ver as estatísticas
              </p>
            </div>
          ) : topStores.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>Carregando dados...</p>
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

      {/* Timeline de Parcelas */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          Cronograma de Parcelas
        </h3>
        
        {!Array.isArray(installments) || installments.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              Nenhuma parcela cadastrada ainda
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Marque produtos como "comprados" e cadastre as formas de pagamento para ver o cronograma
            </p>
          </div>
        ) : sortedTimeline.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              Carregando cronograma de parcelas...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTimeline.map(([monthYear, monthInstallments]) => {
              const monthTotal = monthInstallments.reduce((sum, inst) => sum + (inst.value || 0), 0);
              const paidCount = monthInstallments.filter(inst => inst.isPaid).length;
              
              return (
                <div key={monthYear} className="space-y-4">
                  <div className="flex items-center justify-between p-4 neomorphic-card rounded-xl">
                    <div>
                      <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {monthYear}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {monthInstallments.length} parcela(s) • {paidCount} paga(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: 'var(--primary-action)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthTotal)}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Total do mês
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {monthInstallments.map((installment) => (
                      <div 
                        key={installment.id} 
                        className={`p-4 rounded-xl border-l-4 ${
                          installment.isPaid 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-orange-500 bg-orange-50'
                        }`}
                        style={{ backgroundColor: installment.isPaid ? '#f0fdf4' : '#fff7ed' }}
                      >
                        <div className="flex items-start gap-4">
                          <img 
                            src={installment.productImage || '/placeholder.jpg'} 
                            alt={installment.productName}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {installment.productName}
                                </h5>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {installment.store} • {installment.paymentMethod} • {installment.bank}
                                </p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  Parcela {installment.installmentNumber}/{installment.totalInstallments}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold" style={{ color: 'var(--primary-action)' }}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installment.value || 0)}
                                </p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  Venc: {installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('pt-BR') : 'Data inválida'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              {installment.isPaid ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">Pago</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm font-medium">Pendente</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
          Histórico de Compras
        </h3>
        
        {purchasedProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 neomorphic-card rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Nenhuma compra realizada
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Seus produtos comprados aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchasedProducts
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((product) => (
              <div key={product.id} className="flex items-center space-x-4 p-4 neomorphic-card rounded-xl">
                {product.imageUrl && (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                
                <div className="flex-1">
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {product.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>{product.category}</span>
                    <span>•</span>
                    <span>{product.store}</span>
                    <span>•</span>
                    <span>{new Date(product.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ color: 'var(--primary-action)' }}>
                      {product.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(product.price.toString())) : 'N/A'}
                    </p>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Comprado
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleteProductMutation.isPending}
                    className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center hover:text-red-500 transition-colors"
                    title="Remover do histórico"
                  >
                    <Trash2 className="w-5 h-5" style={{ color: 'var(--error-color)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

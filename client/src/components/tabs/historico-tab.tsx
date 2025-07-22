import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, CheckCircle, Calendar, Store, Trash2, DollarSign, TrendingUp, ShoppingBag, PieChart, Clock, Plus, Edit, Eye, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SelectProduct } from "@shared/schema";
import { useState } from "react";
import { InstallmentsTimeline } from "@/components/installments-timeline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditProductModal } from "@/components/edit-product-modal";
interface HistoricoTabProps {
  refreshKey: number;
}

interface FinanceEntry {
  id: number;
  mes_ano: string;
  receita: number;
  gastos: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export function HistoricoTab({ refreshKey }: HistoricoTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const userId = localStorage.getItem('userId') || '3';
  const [isAddingFinance, setIsAddingFinance] = useState(false);
  const [editingFinance, setEditingFinance] = useState<FinanceEntry | null>(null);
  const [financeForm, setFinanceForm] = useState({
    mes_ano: '',
    receita: '',
    gastos: ''
  });

  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products", refreshKey],
    queryFn: async () => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return [];

      const res = await fetch(`/api/products`, {
        headers: {
          'x-auth-token': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        console.log('Historico: Products fetch failed:', res.status);
        return [];
      }
      const data = await res.json();

      return data;
    },
  });

  const { data: finances = [] } = useQuery<FinanceEntry[]>({
    queryKey: ["/api/finances", refreshKey],
    queryFn: async () => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return [];

      try {
        const res = await fetch(`/api/finances`, {
          headers: {
            'x-auth-token': authToken,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          console.log('Finances response not ok:', res.status);
          return [];
        }
        const data = await res.json();
        console.log('Finances data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching finances:', error);
        return [];
      }
    },
  });

  // Filtra produtos comprados corretamente
  const purchasedProducts = Array.isArray(products) ? products.filter(p => p.isPurchased === true) : [];
  const pendingProducts = Array.isArray(products) ? products.filter(p => p.isPurchased !== true) : [];

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

  // Calcula dados financeiros
  const totalRevenue = finances.reduce((sum, f) => sum + (f.receita || 0), 0);
  const totalExpenses = finances.reduce((sum, f) => sum + (f.gastos || 0), 0);
  const currentBalance = totalRevenue - totalExpenses;

  // Group by category - produtos comprados
  const spendingByCategory = purchasedProducts.reduce((acc, product) => {
    const category = product.category || 'Outros';
    const price = product.price ? parseFloat(product.price.toString()) : 0;
    acc[category] = (acc[category] || 0) + price;
    return acc;
  }, {} as Record<string, number>);

  // Group by store - produtos comprados
  const spendingByStore = purchasedProducts.reduce((acc, product) => {
    const store = product.store || 'Outros';
    const price = product.price ? parseFloat(product.price.toString()) : 0;
    acc[store] = (acc[store] || 0) + price;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(spendingByCategory)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5);

  const topStores = Object.entries(spendingByStore)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5);

  // Mutations para finanças
  const saveFinanceMutation = useMutation({
    mutationFn: async (data: { mes_ano: string; receita: number; gastos: number; id?: number }) => {
      const authToken = localStorage.getItem('authToken');
      const url = data.id ? `/api/finances/${data.id}` : '/api/finances';
      const method = data.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'x-auth-token': authToken || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mes_ano: data.mes_ano,
          receita: data.receita,
          gastos: data.gastos
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar dados financeiros');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
      toast({
        title: "Sucesso",
        description: editingFinance ? "Dados financeiros atualizados" : "Dados financeiros salvos",
      });
      resetFinanceForm();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar dados financeiros",
        variant: "destructive",
      });
    },
  });

  const deleteFinanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/finances/${id}`, {
        method: "DELETE",
        headers: {
          'x-auth-token': authToken || '',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error("Falha ao excluir registro financeiro");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
      toast({
        title: "Sucesso",
        description: "Registro financeiro removido",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir registro financeiro",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          'x-auth-token': authToken || '',
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

  // Query para buscar dados de pagamento do produto
  const { data: paymentData } = useQuery({
    queryKey: [`/api/payments/product/${selectedProduct?.id}`, selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;

      const response = await fetch(`/api/payments/product/${selectedProduct.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedProduct && (showDetailsModal || showEditModal),
  });

  const handleFinanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!financeForm.mes_ano || !financeForm.receita || !financeForm.gastos) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    saveFinanceMutation.mutate({
      mes_ano: financeForm.mes_ano,
      receita: parseFloat(financeForm.receita),
      gastos: parseFloat(financeForm.gastos),
      id: editingFinance?.id
    });
  };

  const resetFinanceForm = () => {
    setFinanceForm({ mes_ano: '', receita: '', gastos: '' });
    setIsAddingFinance(false);
    setEditingFinance(null);
  };

  const handleEditFinance = (finance: FinanceEntry) => {
    setEditingFinance(finance);
    setFinanceForm({
      mes_ano: finance.mes_ano,
      receita: finance.receita.toString(),
      gastos: finance.gastos.toString()
    });
    setIsAddingFinance(true);
  };

  const handleDeleteProduct = (productId: number, productName: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${productName}" do histórico?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleDeleteFinance = (financeId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este registro financeiro?')) {
      deleteFinanceMutation.mutate(financeId);
    }
  };

  const toggleExpanded = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleViewDetails = (product: SelectProduct) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleEditProduct = (product: SelectProduct) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDeleteProduct2 = (productId: number) => {
    if (confirm("Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.")) {
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
            Receita Total
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue || 0)}
          </p>
        </div>

        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Gastos Registrados
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses || 0)}
          </p>
        </div>

        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Saldo Atual
          </h3>
          <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBalance || 0)}
          </p>
        </div>

        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Compras Realizadas
          </h3>
          <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {purchasedProducts.length}
          </p>
        </div>
      </div>

      {/* Financial Management */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Gestão Financeira
          </h3>
          <button
            onClick={() => setIsAddingFinance(!isAddingFinance)}
            className="neomorphic-button px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isAddingFinance ? 'Cancelar' : 'Adicionar Registro'}
          </button>
        </div>

        {/* Finance Form */}
        {isAddingFinance && (
          <form onSubmit={handleFinanceSubmit} className="mb-6 p-4 neomorphic-card rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Mês/Ano
                </label>
                <input
                  type="month"
                  value={financeForm.mes_ano}
                  onChange={(e) => setFinanceForm(prev => ({ ...prev, mes_ano: e.target.value }))}
                  className="w-full p-3 neomorphic-input rounded-lg border-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Receita (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={financeForm.receita}
                  onChange={(e) => setFinanceForm(prev => ({ ...prev, receita: e.target.value }))}
                  className="w-full p-3 neomorphic-input rounded-lg border-0"
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Gastos (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={financeForm.gastos}
                  onChange={(e) => setFinanceForm(prev => ({ ...prev, gastos: e.target.value }))}
                  className="w-full p-3 neomorphic-input rounded-lg border-0"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={saveFinanceMutation.isPending}
                className="neomorphic-button px-6 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--primary-action)', color: 'white' }}
              >
                {saveFinanceMutation.isPending ? 'Salvando...' : (editingFinance ? 'Atualizar' : 'Salvar')}
              </button>
              <button
                type="button"
                onClick={resetFinanceForm}
                className="neomorphic-button px-6 py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Finance Records */}
        {finances.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Registros Financeiros
            </h4>
            {finances
              .sort((a, b) => new Date(b.mes_ano).getTime() - new Date(a.mes_ano).getTime())
              .map((finance) => {
                const balance = finance.receita - finance.gastos;
                const monthYear = new Date(finance.mes_ano + '-01').toLocaleDateString('pt-BR', { 
                  month: 'long', 
                  year: 'numeric' 
                });

                return (
                  <div key={finance.id} className="p-4 neomorphic-card rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {monthYear}
                        </h5>
                        <div className="text-sm space-x-4" style={{ color: 'var(--text-secondary)' }}>
                          <span>Receita: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.receita)}</span>
                          <span>Gastos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.gastos)}</span>
                          <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditFinance(finance)}
                          className="w-8 h-8 neomorphic-button rounded-full flex items-center justify-center"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFinance(finance.id)}
                          className="w-8 h-8 neomorphic-button rounded-full flex items-center justify-center text-red-500"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
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
                      {Object.values(spendingByCategory).reduce((sum, val) => sum + val, 0) > 0 ? 
                        ((amount / Object.values(spendingByCategory).reduce((sum, val) => sum + val, 0)) * 100).toFixed(1) : 0}% do total
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
                      {Object.values(spendingByStore).reduce((sum, val) => sum + val, 0) > 0 ? 
                        ((amount / Object.values(spendingByStore).reduce((sum, val) => sum + val, 0)) * 100).toFixed(1) : 0}% do total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Produto */}
      {selectedProduct && showDetailsModal && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Detalhes da Compra
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imagem do Produto */}
              <div className="space-y-4">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-64 object-cover rounded-lg"
                    style={{ backgroundColor: 'var(--c-light)' }}
                  />
                ) : (
                  <div className="w-full h-64 rounded-lg neomorphic-card flex items-center justify-center" 
                       style={{ backgroundColor: 'var(--c-light)' }}>
                    <ShoppingBag className="w-20 h-20" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}

                {/* Ações do Produto */}
                <div className="flex gap-2">
                  <a
                    href={selectedProduct.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 neomorphic-button px-4 py-2 rounded-lg text-center flex items-center justify-center gap-2"
                    style={{ color: 'var(--primary-action)' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Produto Original
                  </a>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowEditModal(true);
                    }}
                    className="neomorphic-button px-4 py-2 rounded-lg flex items-center gap-2"
                    style={{ color: 'var(--edit-color)' }}
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </div>

              {/* Informações do Produto */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {selectedProduct.name}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Preço Pago:</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--primary-action)' }}>
                        {selectedProduct.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(selectedProduct.price.toString())) : 'N/A'}
                      </span>
                    </div>

                    {selectedProduct.originalPrice && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Preço Original:</span>
                        <span className="line-through" style={{ color: 'var(--text-secondary)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(selectedProduct.originalPrice.toString()))}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Loja:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedProduct.store}</span>
                    </div>

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Categoria:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedProduct.category}</span>
                    </div>

                    {selectedProduct.brand && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-secondary)' }}>Marca:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{selectedProduct.brand}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Data da Compra:</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {new Date(selectedProduct.updatedAt || selectedProduct.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ✓ Comprado
                      </span>
                    </div>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Descrição
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Economia */}
                {selectedProduct.originalPrice && selectedProduct.price && (
                  <div className="p-4 neomorphic-card rounded-xl">
                    <h4 className="font-semibold mb-2 text-green-600">
                      💰 Economia Realizada
                    </h4>
                    <p className="text-lg font-bold text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        parseFloat(selectedProduct.originalPrice.toString()) - parseFloat(selectedProduct.price.toString())
                      )}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {(((parseFloat(selectedProduct.originalPrice.toString()) - parseFloat(selectedProduct.price.toString())) / parseFloat(selectedProduct.originalPrice.toString())) * 100).toFixed(1)}% de desconto
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="neomorphic-button px-6 py-2 rounded-lg"
              >
                Fechar
              </button>
              <button
                onClick={() => handleDeleteProduct2(selectedProduct.id)}
                className="neomorphic-button px-6 py-2 rounded-lg text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover do Histórico
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Edição */}
      {selectedProduct && showEditModal && (
        <EditProductModal
          product={selectedProduct}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onProductUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Annual Installments Timeline */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
          Linha do Tempo de Parcelas {new Date().getFullYear()}
        </h3>
        <InstallmentsTimeline />
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
              .sort((a, b) => new Date(b.updatedAt || b.createdAt || Date.now()).getTime() - new Date(a.updatedAt || a.createdAt || Date.now()).getTime())
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
                    <span>{new Date(product.updatedAt || product.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    💳 Pagamento ilustrativo registrado
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(product)}
                      className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
                      title="Ver detalhes da compra"
                    >
                      <Eye className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
                    </button>

                    <button
                      onClick={() => handleEditProduct(product)}
                      className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
                      title="Editar produto"
                    >
                      <Edit className="w-5 h-5" style={{ color: 'var(--edit-color)' }} />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      disabled={deleteProductMutation.isPending}
                      className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center hover:text-red-500 transition-colors"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-5 h-5" style={{ color: 'var(--error-color)' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
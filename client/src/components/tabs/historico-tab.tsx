import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, CheckCircle, Calendar, Store, Trash2, DollarSign, TrendingUp, ShoppingBag, PieChart, Clock, Plus, Edit, Eye, ExternalLink, FileText, Tag, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SelectProduct } from "@shared/schema";
import { useState } from "react";
import { InstallmentsTimeline } from "@/components/installments-timeline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditProductModal } from "@/components/edit-product-modal";
import { EditProductWithPaymentModal } from "@/components/edit-product-with-payment-modal";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
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

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Data não informada';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
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
              <DialogTitle className="text-xl md:text-2xl font-bold">
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
                    className="w-full h-48 object-contain rounded-lg p-4"
                    style={{ backgroundColor: 'white' }}
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg neomorphic-card flex items-center justify-center" 
                       style={{ backgroundColor: 'white' }}>
                    <ShoppingBag className="w-16 h-16" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}

                {/* Status da compra */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Produto Comprado</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatCurrency(parseFloat(selectedProduct.price) || 0)}
                  </div>
                  <div className="text-sm text-green-700">
                    Comprado em {formatDate(selectedProduct.purchaseDate)}
                  </div>
                </div>

                {/* Ações do Produto */}
                <div className="space-y-3">
                  {selectedProduct.url && (
                    <a 
                      href={selectedProduct.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver Produto Original
                    </a>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowEditModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 neomorphic-button rounded-lg text-sm"
                      style={{ color: 'var(--edit-color)' }}
                    >
                      <Edit className="w-4 h-4" />
                      Editar Produto
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja excluir "${selectedProduct.name}" do histórico? Esta ação não pode ser desfeita.`)) {
                          handleDeleteProduct(selectedProduct.id, selectedProduct.name);
                          setShowDetailsModal(false);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 neomorphic-button rounded-lg text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>

              {/* Detalhes do Produto */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {selectedProduct.name}
                  </h3>

                  {selectedProduct.category && (
                    <span className="inline-block text-xs px-3 py-1 rounded-full mb-3"
                          style={{ 
                            backgroundColor: 'var(--primary-action)', 
                            color: 'white',
                            opacity: 0.8
                          }}>
                      {selectedProduct.category}
                    </span>
                  )}
                </div>

                {selectedProduct.description && (
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Descrição
                    </h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Informações da Compra */}
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Informações da Compra
                  </h4>

                  <div className="space-y-3">
                    {selectedProduct.store && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Store className="w-4 h-4 text-gray-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Loja</span>
                          <p className="text-sm text-gray-900">{selectedProduct.store}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Data da Compra</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedProduct.purchaseDate)}</p>
                      </div>
                    </div>

                    {selectedProduct.paymentMethod && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Forma de Pagamento</span>
                          <p className="text-sm text-gray-900">{selectedProduct.paymentMethod}</p>
                        </div>
                      </div>
                    )}

                    {selectedProduct.installments && selectedProduct.installments > 1 && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="text-sm font-medium text-blue-700">Parcelamento</span>
                          <p className="text-sm text-blue-900">
                            {selectedProduct.installments}x de {formatCurrency(parseFloat(selectedProduct.price) / selectedProduct.installments)}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedProduct.brand && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Tag className="w-4 h-4 text-gray-600" />
                        <div>
                          <span className="text-sm font-medium text-gray-700">Marca</span>
                          <p className="text-sm text-gray-900">{selectedProduct.brand}</p>
                        </div>
                      </div>
                    )}

                    {selectedProduct.notes && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <FileText className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-yellow-700">Observações</span>
                          <p className="text-sm text-yellow-900">{selectedProduct.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Edição */}
      {selectedProduct && showEditModal && (
        <Dialog open={showEditModal} onOpenChange={() => setShowEditModal(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Produto e Pagamento</DialogTitle>
            </DialogHeader>
            <EditProductWithPaymentModal
              product={selectedProduct}
              paymentData={paymentData}
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              onProductUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                queryClient.invalidateQueries({ queryKey: ["/api/finances"] });
                setShowEditModal(false);
                setSelectedProduct(null);
              }}
            />
          </DialogContent>
        </Dialog>
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
              
                <div className="product-card neomorphic-card p-3 md:p-4 mb-3 cursor-pointer hover:shadow-lg transition-shadow"
                   onClick={() => {
                     setSelectedProduct(product);
                     setShowDetailsModal(true);
                   }}>
                <div className="flex items-start gap-3">
                  {/* Imagem do produto */}
                  <div className="flex-shrink-0">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-lg p-1"
                        style={{ backgroundColor: 'white' }}
                      />
                    ) : (
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg neomorphic-card flex items-center justify-center"
                           style={{ backgroundColor: 'white' }}>
                        <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                    )}
                  </div>

                  {/* Informações essenciais */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base line-clamp-1 mb-1" 
                            style={{ color: 'var(--text-primary)' }}>
                          {product.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {product.store && (
                            <>
                              <Store className="w-3 h-3" />
                              <span className="truncate">{product.store}</span>
                            </>
                          )}
                          {product.category && (
                            <>
                              <span>•</span>
                              <span>{product.category}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm md:text-base font-bold text-green-600">
                          {formatCurrency(parseFloat(product.price) || 0)}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                          Comprado
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(product.purchaseDate)}</span>
                      {product.installments && product.installments > 1 && (
                        <>
                          <span>•</span>
                          <CreditCard className="w-3 h-3" />
                          <span>{product.installments}x</span>
                        </>
                      )}
                    </div>
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
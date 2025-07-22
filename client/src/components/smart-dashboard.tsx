import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Calendar, Target, Store, RefreshCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface DashboardData {
  totalProducts: number;
  totalValue: number;
  purchasedValue: number;
  pendingValue: number;
  monthlySpending: number;
  avgProductPrice: number;
  categoriesData: { name: string; value: number; color: string }[];
  monthlyTrend: { month: string; spending: number; products: number }[];
  topStores: { name: string; count: number; value: number }[];
  recentActivity: { type: string; product: string; timestamp: number }[];
  priceAlerts: { productId: number; name: string; oldPrice: number; newPrice: number }[];
  recommendations: { type: string; message: string; action: string }[];
}

export function SmartDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalProducts: 0,
    totalValue: 0,
    purchasedValue: 0,
    pendingValue: 0,
    monthlySpending: 0,
    avgProductPrice: 0,
    categoriesData: [],
    monthlyTrend: [],
    topStores: [],
    recentActivity: [],
    priceAlerts: [],
    recommendations: []
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const authToken = localStorage.getItem("authToken");
      const userId = localStorage.getItem("userId");

      console.log('SmartDashboard: Verificando autenticação:', {
        hasToken: !!authToken,
        hasUserId: !!userId,
        tokenLength: authToken?.length,
        userId: userId
      });

      if (!authToken || !userId) {
        console.log('SmartDashboard: Token ou userId não encontrado');
        return;
      }

      console.log('SmartDashboard: Carregando dados...', { userId });

      // Carrega dados do dashboard com autenticação
      const [productsResponse, statsResponse] = await Promise.all([
        fetch('/api/products', {
          headers: {
            "x-auth-token": authToken
          }
        }),
        fetch(`/api/products/stats/${userId}`, {
          headers: {
            "x-auth-token": authToken
          }
        })
      ]);

      console.log('SmartDashboard: Respostas recebidas:', {
        productsOk: productsResponse.ok,
        productsStatus: productsResponse.status,
        statsOk: statsResponse.ok,
        statsStatus: statsResponse.status
      });

      let products = [];
      let stats = {};

      if (productsResponse.ok) {
        try {
          products = await productsResponse.json();
        console.log('SmartDashboard: Produtos carregados:', products);
          } catch (jsonError) {
            console.error('SmartDashboard: Erro ao fazer parse JSON produtos:', jsonError);
            const text = await productsResponse.text();
            console.error('SmartDashboard: Texto da resposta produtos:', text.substring(0, 200));
          }
      } else {
        console.error('SmartDashboard: Erro ao carregar produtos:', productsResponse.status);
        try {
          const errorText = await productsResponse.text();
          console.error('SmartDashboard: Texto do erro produtos:', errorText);
        } catch (e) {
          console.error('SmartDashboard: Erro ao ler resposta de erro produtos:', e);
        }
      }

      if (statsResponse.ok) {
        try {
          stats = await statsResponse.json();
          console.log('SmartDashboard: Stats carregadas:', stats);
        } catch (jsonError) {
          console.error('SmartDashboard: Erro ao fazer parse JSON stats:', jsonError);
          const text = await statsResponse.text();
          console.error('SmartDashboard: Texto da resposta stats:', text.substring(0, 200));
        }
      } else {
        console.error('SmartDashboard: Erro ao carregar stats:', statsResponse.status);
        try {
          const errorText = await statsResponse.text();
          console.error('SmartDashboard: Texto do erro stats:', errorText);
        } catch (e) {
          console.error('SmartDashboard: Erro ao ler resposta de erro stats:', e);
        }
      }

      // Processa dados para o dashboard
      const processedData = processDashboardData(products, stats);
      setDashboardData(processedData);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (products: any[], stats: any): DashboardData => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    const purchasedProducts = products.filter(p => p.isPurchased);
    const purchasedValue = purchasedProducts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    const pendingValue = totalValue - purchasedValue;

    // Dados reais por categoria baseados nos produtos do usuário
    const categoryCounts = products.reduce((acc, product) => {
      const category = product.category || 'Outros';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const categoriesData = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      value: count as number,
      color: getCategoryColor(name)
    }));

    // Se não há produtos, mostrar categorias vazias
    if (totalProducts === 0) {
      categoriesData.push(
        { name: 'Nenhum produto ainda', value: 1, color: '#e5e7eb' }
      );
    }

    // Tendência mensal - dados simulados para demonstração
    const monthlyTrend = [
      { month: 'Jan', spending: Math.floor(totalValue * 0.1), products: Math.floor(totalProducts * 0.1) },
      { month: 'Fev', spending: Math.floor(totalValue * 0.15), products: Math.floor(totalProducts * 0.15) },
      { month: 'Mar', spending: Math.floor(totalValue * 0.2), products: Math.floor(totalProducts * 0.2) },
      { month: 'Abr', spending: Math.floor(totalValue * 0.25), products: Math.floor(totalProducts * 0.25) },
      { month: 'Mai', spending: Math.floor(totalValue * 0.15), products: Math.floor(totalProducts * 0.15) },
      { month: 'Jun', spending: Math.floor(totalValue * 0.15), products: Math.floor(totalProducts * 0.15) }
    ];

    // Lojas principais baseadas nos produtos reais
    const storeCounts = products.reduce((acc, product) => {
      const store = product.store || 'Loja desconhecida';
      acc[store] = (acc[store] || 0) + 1;
      return acc;
    }, {});

    const topStores = Object.entries(storeCounts).map(([name, count]) => ({
      name,
      count: count as number,
      value: Math.floor(totalValue * (count as number) / totalProducts) || 0
    }));

    // Atividade recente baseada nos produtos reais
    const recentActivity = products
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map(product => ({
        type: product.isPurchased ? 'purchased' : 'added',
        product: product.name,
        timestamp: new Date(product.createdAt).getTime()
      }));

    // Alertas de preço
    const priceAlerts = [
      { productId: 1, name: 'Produto X', oldPrice: 100, newPrice: 80 },
      { productId: 2, name: 'Produto Y', oldPrice: 200, newPrice: 180 }
    ];

    // Recomendações inteligentes
    const recommendations = [
      { type: 'saving', message: 'Você pode economizar R$ 150 esperando promoções', action: 'Ver sugestões' },
      { type: 'budget', message: 'Você está 20% acima do orçamento mensal', action: 'Ajustar orçamento' },
      { type: 'trend', message: 'Eletrônicos estão com bons preços esta semana', action: 'Ver ofertas' }
    ];

    return {
      totalProducts,
      totalValue,
      purchasedValue,
      pendingValue,
      monthlySpending: monthlyTrend[monthlyTrend.length - 1]?.spending || 0,
      avgProductPrice: totalValue / totalProducts || 0,
      categoriesData,
      monthlyTrend,
      topStores,
      recentActivity,
      priceAlerts,
      recommendations
    };
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Eletronicos': '#3b82f6',
      'Roupas': '#10b981', 
      'Casa': '#f59e0b',
      'Livros': '#8b5cf6',
      'Games': '#ef4444',
      'Presentes': '#ec4899',
      'Geral': '#6b7280',
      'Outros': '#9ca3af'
    };
    return colors[category] || '#9ca3af';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 'purchased':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'price_drop':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
          Dashboard Inteligente
        </h2>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="neomorphic-button w-full sm:w-auto text-sm"
        >
          {isRefreshing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCcw className="w-3 h-3" />
          )}
          Atualizar
        </button>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Produtos</p>
                <p className="text-lg md:text-xl font-bold">{dashboardData.totalProducts}</p>
              </div>
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Total</p>
                <p className="text-sm md:text-lg font-bold">{formatCurrency(dashboardData.totalValue)}</p>
              </div>
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Comprado</p>
                <p className="text-sm md:text-lg font-bold">{formatCurrency(dashboardData.purchasedValue)}</p>
              </div>
              <Target className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Média</p>
                <p className="text-sm md:text-lg font-bold">{formatCurrency(dashboardData.avgProductPrice)}</p>
              </div>
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <DollarSign className="h-4 w-4 text-green-500" />
            Resumo de Gastos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-green-800">Comprados</h4>
              <p className="text-lg md:text-xl font-bold text-green-600">
                {formatCurrency(dashboardData.purchasedValue)}
              </p>
              <p className="text-xs text-green-600">
                {Math.round((dashboardData.purchasedValue / dashboardData.totalValue) * 100) || 0}% do total
              </p>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-orange-800">Pendente</h4>
              <p className="text-lg md:text-xl font-bold text-orange-600">
                {formatCurrency(dashboardData.pendingValue)}
              </p>
              <p className="text-xs text-orange-600">
                {dashboardData.totalProducts - Math.round(dashboardData.purchasedValue / dashboardData.avgProductPrice) || 0} produtos
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800">Economia</h4>
              <p className="text-lg md:text-xl font-bold text-blue-600">
                {formatCurrency(dashboardData.totalValue * 0.15)}
              </p>
              <p className="text-xs text-blue-600">
                Potencial em promoções
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Distribuição por categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {dashboardData.categoriesData.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{category.value}</span>
                    <p className="text-xs text-gray-600">
                      {((category.value / dashboardData.totalProducts) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Principais lojas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Lojas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {dashboardData.topStores.slice(0, 5).map((store, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Store className="w-3 h-3 text-gray-500" />
                    <span className="text-sm font-medium truncate">{store.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{store.count}</span>
                    <p className="text-xs text-gray-600">
                      {formatCurrency(store.value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividade recente e estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Atividade recente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="h-4 w-4 text-blue-500" />
              Atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.product}</p>
                      <p className="text-xs text-gray-600">
                        {activity.type === 'purchased' ? 'Comprado' : 'Adicionado'} • {new Date(activity.timestamp).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Calendar className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                  <p className="text-sm">Nenhuma atividade</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas de progresso */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Target className="h-4 w-4 text-purple-500" />
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Comprados</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((dashboardData.purchasedValue / dashboardData.totalValue) * 100) || 0}%
                  </span>
                </div>
                <Progress 
                  value={Math.round((dashboardData.purchasedValue / dashboardData.totalValue) * 100) || 0} 
                  className="w-full h-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{dashboardData.totalProducts}</p>
                  <p className="text-xs text-blue-600">Total</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {Math.round(dashboardData.purchasedValue / dashboardData.avgProductPrice) || 0}
                  </p>
                  <p className="text-xs text-green-600">Comprados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
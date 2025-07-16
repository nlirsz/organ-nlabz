import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Calendar, Target, Zap, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

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
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold">{dashboardData.totalProducts}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Já Comprado</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.purchasedValue)}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Preço Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.avgProductPrice)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações inteligentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Recomendações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.recommendations.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{rec.message}</span>
                </div>
                <Button variant="outline" size="sm">
                  {rec.action}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="spending" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.categoriesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dashboardData.categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de preço e atividade recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de preço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-500" />
              Alertas de Preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.priceAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{alert.name}</p>
                    <p className="text-xs text-gray-600">
                      {formatCurrency(alert.oldPrice)} → {formatCurrency(alert.newPrice)}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    -{((alert.oldPrice - alert.newPrice) / alert.oldPrice * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.product}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
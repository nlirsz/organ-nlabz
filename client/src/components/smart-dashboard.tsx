import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MagicBento } from '@/components/ui/magic-bento';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Package,
  Calendar,
  CreditCard,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  TrendingDown,
  Percent,
  MapPin,
  Clock,
  Tag
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Product {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  store: string;
  isPurchased: boolean;
  category?: string;
  paymentMethod?: string;
  installments?: number;
  purchaseDate?: string;
  createdAt?: string;
}

interface Stats {
  totalItems: number;
  purchasedItems: number;
  estimatedTotal: number;
}

interface FinanceData {
  mes_ano: string;
  receita: number;
  gastos: number;
}

interface InstallmentData {
  id: number;
  productId: number;
  productName: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  month: number;
  year: number;
  isPaid: boolean;
}

export function SmartDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [finances, setFinances] = useState<FinanceData[]>([]);
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(true);

  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!authToken || !userId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const [productsRes, statsRes, financesRes, installmentsRes] = await Promise.all([
          fetch("/api/products", {
            headers: { 
              "x-auth-token": authToken
            }
          }),
          fetch(`/api/products/stats/${userId}`, {
            headers: { 
              "x-auth-token": authToken
            }
          }),
          fetch("/api/finances", {
            headers: { 
              "x-auth-token": authToken
            }
          }),
          fetch("/api/installments", {
            headers: { 
              "x-auth-token": authToken
            }
          })
        ]);

        if (!isMounted) return;

        const [productsData, statsData, financesData, installmentsData] = await Promise.all([
          productsRes.ok ? productsRes.json() : [],
          statsRes.ok ? statsRes.json() : null,
          financesRes.ok ? financesRes.json() : [],
          installmentsRes.ok ? installmentsRes.json() : []
        ]);

        setProducts(productsData);
        setStats(statsData);
        setFinances(financesData);
        setInstallments(installmentsData);

      } catch (error) {
        console.error("SmartDashboard: Erro ao carregar dados:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [authToken, userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!authToken || !userId) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Acesso Restrito
        </h3>
        <p className="text-gray-500">
          Faça login para visualizar o dashboard
        </p>
      </div>
    );
  }

  // Cálculos das métricas
  const purchasedProducts = products.filter(p => p.isPurchased);
  const pendingProducts = products.filter(p => !p.isPurchased);

  const totalValue = products.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);
  const purchasedValue = purchasedProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);
  const pendingValue = pendingProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);

  // Produtos adicionados no mês atual
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthProducts = products.filter(p => 
    p.createdAt && p.createdAt.startsWith(currentMonth)
  );
  const currentMonthValue = currentMonthProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);

  // Cálculos derivados
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const currentMonthInstallments = installments.filter(installment => {
    const dueDate = new Date(installment.dueDate);
    const installmentMonth = dueDate.getMonth() + 1;
    const installmentYear = dueDate.getFullYear();

    return installmentMonth === currentMonthNum && installmentYear === currentYearNum;
  });

  const currentMonthInstallmentsValue = currentMonthInstallments.reduce((sum, installment) => {
    const amount = parseFloat(installment.amount.toString());
    return sum + amount;
  }, 0);

  // Última compra
  const lastPurchase = purchasedProducts
    .filter(p => p.purchaseDate)
    .sort((a, b) => new Date(b.purchaseDate!).getTime() - new Date(a.purchaseDate!).getTime())[0];

  // Categorias
  const categoryStats = products.reduce((acc: Record<string, {
    total: number,
    purchased: number,
    pending: number,
    totalValue: number,
    purchasedValue: number,
    pendingValue: number
  }>, product) => {
    const category = product.category || 'Outros';
    if (!acc[category]) {
      acc[category] = { total: 0, purchased: 0, pending: 0, totalValue: 0, purchasedValue: 0, pendingValue: 0 };
    }

    acc[category].total++;
    acc[category].totalValue += parseFloat(product.price || '0');

    if (product.isPurchased) {
      acc[category].purchased++;
      acc[category].purchasedValue += parseFloat(product.price || '0');
    } else {
      acc[category].pending++;
      acc[category].pendingValue += parseFloat(product.price || '0');
    }

    return acc;
  }, {});

  const topCategoryByItems = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.total - a.total)[0];
  const topCategoryByPurchased = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.purchased - a.purchased)[0];

  // Lojas
  const storeStats = products.reduce((acc: Record<string, {
    total: number,
    purchased: number,
    pending: number,
    totalValue: number,
    purchasedValue: number,
    pendingValue: number
  }>, product) => {
    const store = product.store || 'Outros';
    if (!acc[store]) {
      acc[store] = { total: 0, purchased: 0, pending: 0, totalValue: 0, purchasedValue: 0, pendingValue: 0 };
    }

    acc[store].total++;
    acc[store].totalValue += parseFloat(product.price || '0');

    if (product.isPurchased) {
      acc[store].purchased++;
      acc[store].purchasedValue += parseFloat(product.price || '0');
    } else {
      acc[store].pending++;
      acc[store].pendingValue += parseFloat(product.price || '0');
    }

    return acc;
  }, {});

  // Descontos
  const totalDiscount = products.reduce((sum, p) => {
    const original = parseFloat(p.originalPrice || p.price || '0');
    const current = parseFloat(p.price || '0');
    return sum + (original - current);
  }, 0);

  // Cores mais sutis para os gráficos
  const chartColors = [
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(139, 92, 246, 0.8)',   // Violet  
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(16, 185, 129, 0.8)',   // Emerald
    'rgba(245, 158, 11, 0.8)',   // Amber
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(6, 182, 212, 0.8)',    // Cyan
    'rgba(132, 204, 22, 0.8)',   // Lime
    'rgba(251, 146, 60, 0.8)',   // Orange
  ];

  // Dados para gráfico financeiro com gradientes suaves
  const financeChartData = {
    labels: finances.map(f => {
      const date = new Date(f.mes_ano + '-01');
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Receita',
        data: finances.map(f => f.receita),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.05)');
          gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      },
      {
        label: 'Gastos',
        data: finances.map(f => f.gastos),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
          gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.1)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      },
      {
        label: 'Saldo',
        data: finances.map(f => f.receita - f.gastos),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      }
    ]
  };

  // Dados para gráfico de categorias com cores corretas na legenda
  const categoryChartData = {
    labels: Object.keys(categoryStats),
    datasets: [{
      data: Object.values(categoryStats).map(cat => cat.purchasedValue),
      backgroundColor: chartColors.slice(0, Object.keys(categoryStats).length),
      borderWidth: 0,
      hoverBorderWidth: 3,
      hoverBorderColor: '#ffffff',
    }]
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Cards Principais Organizados por Importância */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Card Principal - Valor Comprado (mais importante) */}
        <Card className="md:col-span-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <DollarSign className="h-8 w-8 text-emerald-600" />
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Principal
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Valor Comprado</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(purchasedValue)}</p>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-gray-500 font-medium">Total investido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Médios */}
        <Card className="md:col-span-3 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-500"></div>
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Produtos Comprados</p>
              <p className="text-2xl font-bold text-gray-900">{purchasedProducts.length}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-1.5 rounded-full transition-all duration-1000" 
                  style={{width: `${(purchasedProducts.length / products.length) * 100}%`}}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500"></div>
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingProducts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda Linha de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-3 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Valor Pendente</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(pendingValue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Produtos do Mês</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(currentMonthValue)}</p>
              <p className="text-xs text-gray-500">{currentMonthProducts.length} itens</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Parcelas do Mês</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(currentMonthInstallmentsValue)}</p>
              <p className="text-xs text-gray-500">{currentMonthInstallments.length} parcelas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Percent className="h-6 w-6 text-rose-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total de Descontos</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalDiscount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Informações Específicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Última Compra */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-gray-600" />
              Última Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastPurchase ? (
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{lastPurchase.name}</p>
                <p className="text-sm text-gray-600">{formatCurrency(parseFloat(lastPurchase.price))}</p>
                <p className="text-xs text-gray-500">
                  {new Date(lastPurchase.purchaseDate!).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma compra registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Categoria com Mais Itens */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-gray-600" />
              Top Categoria (Itens)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoryByItems ? (
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{topCategoryByItems[0]}</p>
                <p className="text-sm text-gray-600">{topCategoryByItems[1].total} produtos</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(topCategoryByItems[1].totalValue)} total
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Categoria com Mais Comprados */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-gray-600" />
              Top Categoria (Comprados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoryByPurchased ? (
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{topCategoryByPurchased[0]}</p>
                <p className="text-sm text-gray-600">{topCategoryByPurchased[1].purchased} comprados</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(topCategoryByPurchased[1].purchasedValue)} gasto
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Financeiro Mensal */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              Evolução Financeira Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line 
                data={financeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    intersect: false,
                    mode: 'index' as const,
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false,
                      },
                      border: {
                        display: false,
                      },
                      ticks: {
                        color: '#6B7280',
                        font: {
                          size: 12,
                          weight: '500',
                        },
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: '#F3F4F6',
                        drawBorder: false,
                      },
                      border: {
                        display: false,
                      },
                      ticks: {
                        color: '#6B7280',
                        font: {
                          size: 12,
                          weight: '500',
                        },
                        callback: function(value) {
                          return formatCurrency(Number(value));
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                          size: 14,
                          weight: '600',
                        },
                        color: '#374151',
                      },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1F2937',
                      bodyColor: '#374151',
                      borderColor: '#E5E7EB',
                      borderWidth: 1,
                      cornerRadius: 12,
                      displayColors: true,
                      usePointStyle: true,
                    },
                  },
                  elements: {
                    point: {
                      hoverRadius: 8,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Gastos por Categoria */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-gray-600" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Doughnut 
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: {
                      position: 'right' as const,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        font: {
                          size: 13,
                          weight: '500',
                        },
                        color: '#374151',
                        generateLabels: function(chart) {
                          const data = chart.data;
                          if (data.labels?.length && data.datasets.length) {
                            return data.labels.map((label, i) => ({
                              text: label as string,
                              fillStyle: chartColors[i] || '#000',
                              strokeStyle: '#fff',
                              lineWidth: 2,
                              pointStyle: 'circle',
                              hidden: isNaN(data.datasets[0].data[i] as number) || (chart.getDatasetMeta(0).data[i] as any).hidden,
                              index: i
                            }));
                          }
                          return [];
                        }
                      },
                    },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1F2937',
                      bodyColor: '#374151',
                      borderColor: '#E5E7EB',
                      borderWidth: 1,
                      cornerRadius: 12,
                      displayColors: true,
                      usePointStyle: true,
                      callbacks: {
                        label: function(context) {
                          const value = context.parsed;
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                      }
                    },
                  },
                  elements: {
                    arc: {
                      borderWidth: 2,
                      borderColor: '#ffffff',
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoria */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-gray-600" />
              Detalhes por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStats)
                .sort(([,a], [,b]) => b.purchasedValue - a.purchasedValue)
                .map(([category, data]) => (
                  <div key={category} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{category}</h4>
                      <Badge variant="outline" className="text-gray-600 border-gray-300">{data.total} itens</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Comprados: {data.purchased}</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(data.purchasedValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pendentes: {data.pending}</p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(data.pendingValue)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Média: {formatCurrency(data.purchasedValue / (data.purchased || 1))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Gastos por Loja */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-gray-600" />
              Detalhes por Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(storeStats)
                .sort(([,a], [,b]) => b.purchasedValue - a.purchasedValue)
                .map(([store, data]) => (
                  <div key={store} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{store}</h4>
                      <Badge variant="outline" className="text-gray-600 border-gray-300">{data.total} itens</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Comprados: {data.purchased}</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(data.purchasedValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pendentes: {data.pending}</p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(data.pendingValue)}
                        </p>
                      </div>
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
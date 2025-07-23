import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Target,
  Percent,
  MapPin,
  Clock,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Plus
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
  Filler,
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
  ArcElement,
  Filler
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
  value: number;
  due_date: string;
  productName: string;
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
    const fetchData = async () => {
      if (!authToken || !userId) {
        setLoading(false);
        return;
      }

      try {
        const [productsRes, statsRes, financesRes, installmentsRes] = await Promise.all([
          fetch("/api/products", {
            headers: { "x-auth-token": authToken }
          }),
          fetch(`/api/products/stats/${userId}`, {
            headers: { "x-auth-token": authToken }
          }),
          fetch("/api/finances", {
            headers: { "x-auth-token": authToken }
          }),
          fetch("/api/installments", {
            headers: { "x-auth-token": authToken }
          })
        ]);

        if (productsRes.ok && statsRes.ok) {
          const productsData = await productsRes.json();
          const statsData = await statsRes.json();

          setProducts(productsData);
          setStats(statsData);
        }

        if (financesRes.ok) {
          const financesData = await financesRes.json();
          setFinances(financesData);
        }

        if (installmentsRes.ok) {
          const installmentsData = await installmentsRes.json();
          setInstallments(installmentsData);
        }
      } catch (error) {
        console.error("SmartDashboard: Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 md:p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!authToken || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-500">
              Faça login para visualizar o dashboard
            </p>
          </CardContent>
        </Card>
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

  // Parcelas do mês atual
  const currentMonthInstallments = installments.filter(inst => 
    inst.due_date && inst.due_date.startsWith(currentMonth)
  );
  const currentMonthInstallmentsValue = currentMonthInstallments.reduce((sum, inst) => sum + inst.value, 0);

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

  // Dados para gráfico financeiro
  const financeChartData = {
    labels: finances.map(f => {
      const date = new Date(f.mes_ano + '-01');
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Receita',
        data: finances.map(f => f.receita),
        borderColor: '#4F46E5',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(79, 70, 229, 0.0)');
          gradient.addColorStop(1, 'rgba(79, 70, 229, 0.1)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
      },
      {
        label: 'Gastos',
        data: finances.map(f => f.gastos),
        borderColor: '#06B6D4',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.0)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: '#06B6D4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
      }
    ]
  };

  // Dados para gráfico de barras semanal (simulado)
  const weeklyData = {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    datasets: [{
      data: [150, 300, 200, 400, 350, 250, 180],
      backgroundColor: (context: any) => {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, '#A855F7');
        gradient.addColorStop(1, '#4F46E5');
        return gradient;
      },
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  // Dados para gráfico de pizza
  const pieChartData = {
    labels: Object.keys(categoryStats).slice(0, 5),
    datasets: [{
      data: Object.values(categoryStats).slice(0, 5).map(cat => cat.purchasedValue),
      backgroundColor: [
        '#4F46E5',
        '#06B6D4', 
        '#10B981',
        '#F59E0B',
        '#EF4444'
      ],
      borderWidth: 0,
      hoverBorderWidth: 4,
      hoverBorderColor: '#ffffff',
    }]
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendValue,
    className = "",
    size = "normal"
  }: any) => (
    <Card className={`bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <CardContent className={`${size === 'large' ? 'p-6' : 'p-4'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`${size === 'large' ? 'h-5 w-5' : 'h-4 w-4'} text-gray-600`} />
              <p className={`${size === 'large' ? 'text-sm' : 'text-xs'} font-medium text-gray-600 uppercase tracking-wider`}>
                {title}
              </p>
            </div>
            <p className={`${size === 'large' ? 'text-2xl' : 'text-lg'} font-bold text-gray-900 mb-1`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Visão geral dos seus produtos e finanças</p>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <StatCard
            title="Gastos"
            value={formatCurrency(purchasedValue)}
            icon={DollarSign}
            trend="up"
            trendValue="+24%"
            className="col-span-2"
            size="large"
          />

          <StatCard
            title="Vendas"
            value={formatCurrency(totalValue)}
            subtitle="+4.8% desde ontem"
            icon={TrendingUp}
            trend="up"
            trendValue="+4.8%"
          />

          <StatCard
            title="Total"
            value={formatCurrency(stats?.estimatedTotal || 0)}
            icon={Target}
          />

          <StatCard
            title="Ativo"
            value={purchasedProducts.length.toString()}
            icon={Activity}
          />

          <StatCard
            title="Total"
            value={products.length.toString()}
            icon={Package}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {formatCurrency(finances.reduce((sum, f) => sum + f.receita - f.gastos, 0))}
                  </CardTitle>
                  <p className="text-sm text-gray-500">Total | <span className="text-emerald-600 font-medium">+2.45%</span></p>
                  <p className="text-xs text-emerald-600 mt-1">● Em progresso</p>
                </div>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
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
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                          color: '#9CA3AF',
                          font: { size: 12 },
                        },
                      },
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: '#F3F4F6',
                          drawBorder: false,
                        },
                        border: { display: false },
                        ticks: {
                          display: false,
                        }
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1F2937',
                        bodyColor: '#374151',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                      },
                    },
                    elements: {
                      point: { hoverRadius: 8 },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Revenue Bar Chart */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Receita Semanal</CardTitle>
                </div>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  data={weeklyData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                          color: '#9CA3AF',
                          font: { size: 12 },
                        },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { display: false },
                        border: { display: false },
                        ticks: { display: false }
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1F2937',
                        bodyColor: '#374151',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check Table */}
          <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Tabela de Verificação</CardTitle>
                <div className="h-6 w-6 bg-gray-100 rounded flex items-center justify-center">
                  <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-500 font-medium">
                  <span>NOME</span>
                  <span>PROGRESSO</span>
                  <span>QUANTIDADE</span>
                  <span>DATA</span>
                </div>

                {Object.entries(categoryStats).slice(0, 3).map(([category, data], index) => (
                  <div key={category} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        data.purchased > 0 ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                      }`}>
                        {data.purchased > 0 && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{category}</span>
                    </div>
                    <span className="text-sm text-gray-900 font-medium">
                      {((data.purchased / data.total) * 100).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-900 font-medium">{data.total}</span>
                    <span className="text-sm text-gray-500">
                      {new Date().toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right side stats and pie chart */}
          <div className="space-y-6">
            {/* Tasks Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {pendingProducts.length}.{Math.floor(Math.random() * 999)}
                    </h3>
                    <p className="text-sm text-gray-500">Tarefas | <span className="text-emerald-600 font-medium">+2.45%</span></p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                </div>
                <div className="h-20">
                  <Bar 
                    data={{
                      labels: ['', '', '', '', '', '', ''],
                      datasets: [{
                        data: [40, 60, 80, 45, 90, 55, 70],
                        backgroundColor: '#4F46E5',
                        borderRadius: 2,
                        borderSkipped: false,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { display: false },
                        y: { display: false }
                      },
                      plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Seus Gastos</CardTitle>
                  <select className="text-sm text-gray-500 bg-transparent border-0 focus:ring-0">
                    <option>Mensal</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <Doughnut 
                    data={pieChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '70%',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          titleColor: '#1F2937',
                          bodyColor: '#374151',
                          borderColor: '#E5E7EB',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: false,
                        },
                      },
                      elements: {
                        arc: { borderWidth: 0 },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
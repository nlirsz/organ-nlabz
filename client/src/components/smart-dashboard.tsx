
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

  // Criar gradientes para os gráficos
  const createGradient = (ctx: CanvasRenderingContext2D, color1: string, color2: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

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
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.05)');
          gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.15)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Gastos',
        data: finances.map(f => f.gastos),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
          gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.15)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Saldo',
        data: finances.map(f => f.receita - f.gastos),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.3)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      }
    ]
  };

  // Dados para gráfico de categorias com gradientes
  const categoryChartData = {
    labels: Object.keys(categoryStats),
    datasets: [{
      data: Object.values(categoryStats).map(cat => cat.purchasedValue),
      backgroundColor: (context: any) => {
        const chart = context.chart;
        const {ctx} = chart;
        if (!ctx) return null;
        
        const gradients = [
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#60A5FA'); g.addColorStop(1, '#3B82F6'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#F87171'); g.addColorStop(1, '#EF4444'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#34D399'); g.addColorStop(1, '#10B981'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#FBBF24'); g.addColorStop(1, '#F59E0B'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#A78BFA'); g.addColorStop(1, '#8B5CF6'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#F472B6'); g.addColorStop(1, '#EC4899'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#22D3EE'); g.addColorStop(1, '#06B6D4'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#A3E635'); g.addColorStop(1, '#84CC16'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#FB923C'); g.addColorStop(1, '#F97316'); return g; })(),
          (() => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 200); g.addColorStop(0, '#818CF8'); g.addColorStop(1, '#6366F1'); return g; })(),
        ];
        
        return gradients[context.dataIndex % gradients.length];
      },
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
      {/* Cards Principais de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Produtos */}
        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-indigo-500/10 opacity-60"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                <Package className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                Total
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Total de Produtos</p>
              <p className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{products.length}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000" style={{width: '100%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Comprados */}
        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 opacity-60"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
                <ShoppingCart className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                Comprados
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Produtos Comprados</p>
              <p className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{purchasedProducts.length}</p>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000" 
                    style={{width: `${(purchasedProducts.length / products.length) * 100}%`}}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 font-medium">{Math.round((purchasedProducts.length / products.length) * 100)}% concluído</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Pendentes */}
        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-0 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 dark:from-orange-900 dark:via-amber-900 dark:to-yellow-900">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10 opacity-60"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                Pendentes
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Produtos Pendentes</p>
              <p className="text-5xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{pendingProducts.length}</p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-gray-500 font-medium">Aguardando compra</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Comprado */}
        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-emerald-900 dark:via-green-900 dark:to-teal-900">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 opacity-60"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 px-3 py-1 text-xs font-semibold">
                Gasto
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Valor Comprado</p>
              <p className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{formatCurrency(purchasedValue)}</p>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-gray-500 font-medium">Total investido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valor Pendente */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Aguardando
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Valor Pendente</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingValue)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Adicionados no Mês */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                Este Mês
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Produtos do Mês</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentMonthValue)}</p>
              <p className="text-xs text-gray-500">{currentMonthProducts.length} itens</p>
            </div>
          </CardContent>
        </Card>

        {/* Parcelas do Mês */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <CreditCard className="h-8 w-8 text-indigo-600" />
              </div>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                Parcelas
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Parcelas do Mês</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentMonthInstallmentsValue)}</p>
              <p className="text-xs text-gray-500">{currentMonthInstallments.length} parcelas</p>
            </div>
          </CardContent>
        </Card>

        {/* Total de Descontos */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-500/10 rounded-xl">
                <Percent className="h-8 w-8 text-rose-600" />
              </div>
              <Badge variant="secondary" className="bg-rose-50 text-rose-700 border-rose-200">
                Economia
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total de Descontos</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDiscount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Informações Específicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Última Compra */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Última Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastPurchase ? (
              <div className="space-y-2">
                <p className="font-semibold">{lastPurchase.name}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Top Categoria (Itens)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoryByItems ? (
              <div className="space-y-2">
                <p className="font-semibold">{topCategoryByItems[0]}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Categoria (Comprados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoryByPurchased ? (
              <div className="space-y-2">
                <p className="font-semibold">{topCategoryByPurchased[0]}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
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
                  cutout: '70%',
                  plugins: {
                    legend: {
                      position: 'right' as const,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                          size: 13,
                          weight: '600',
                        },
                        color: '#374151',
                        generateLabels: function(chart) {
                          const data = chart.data;
                          if (data.labels?.length && data.datasets.length) {
                            return data.labels.map((label, i) => ({
                              text: label as string,
                              fillStyle: data.datasets[0].backgroundColor?.[i] || '#000',
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
                      borderWidth: 3,
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Detalhes por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStats)
                .sort(([,a], [,b]) => b.purchasedValue - a.purchasedValue)
                .map(([category, data]) => (
                  <div key={category} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{category}</h4>
                      <Badge variant="outline">{data.total} itens</Badge>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes por Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(storeStats)
                .sort(([,a], [,b]) => b.purchasedValue - a.purchasedValue)
                .map(([store, data]) => (
                  <div key={store} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{store}</h4>
                      <Badge variant="outline">{data.total} itens</Badge>
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
